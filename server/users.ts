"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { Prisma, Role } from "@/lib/generated/prisma/client";
import { ActionResponse } from "@/lib/types/types";
import { getSession } from "@/lib/auth";
import { ACTIVE, PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";
import { getUserPermissions, isSuperAdmin } from "@/lib/rbac/core";

export type UsersSearchParams = {
  name?: string;
  active?: string;
  role?: string;
  currentPage?: number;
  itemsPerPage?: number;
};

/**
 * Remplace uniquement les rôles de l'appartenance concernée.
 * Les rôles attribués dans les autres tenants restent inchangés.
 */
async function syncMembershipRoles(
  tx: Prisma.TransactionClient,
  userId: string,
  tenantId: string,
  roleIds: string[]
) {
  await tx.userTenantRole.deleteMany({
    where: {
      userId,
      tenantId,
    },
  });

  const uniqueRoleIds = [...new Set(roleIds)];

  if (uniqueRoleIds.length === 0) {
    return;
  }

  await tx.userTenantRole.createMany({
    data: uniqueRoleIds.map((roleId) => ({
      userId,
      tenantId,
      roleId,
    })),
  });
}

/**
 * Empêche un utilisateur ordinaire d'attribuer
 * des permissions qu'il ne possède pas lui-même.
 */
async function validateRoleAssignments(
  actorUserId: string,
  roleIds: string[]
): Promise<string | null> {
  const uniqueRoleIds = [...new Set(roleIds)];

  if (uniqueRoleIds.length === 0) {
    return null;
  }

  // Vérifier que tous les rôles transmis existent.
  const roles = await prisma.role.findMany({
    where: {
      id: {
        in: uniqueRoleIds,
      },
    },
    include: {
      permissions: {
        select: {
          action: true,
          resource: true,
        },
      },
    },
  });

  if (roles.length !== uniqueRoleIds.length) {
    return "Un ou plusieurs rôles sélectionnés sont invalides.";
  }

  // Le SuperAdmin actif peut attribuer n'importe quel rôle.
  if (await isSuperAdmin(actorUserId)) {
    return null;
  }

  // Permissions réellement détenues dans le tenant courant.
  const actorPermissions = new Set(
    await getUserPermissions(actorUserId)
  );

  for (const role of roles) {
    for (const permission of role.permissions) {
      const permissionKey =
        `${permission.action}:${permission.resource}`;

      if (!actorPermissions.has(permissionKey)) {
        return (
          `Vous ne pouvez pas attribuer le rôle "${role.name}", ` +
          "car il contient des permissions que vous ne possédez pas."
        );
      }
    }
  }

  return null;
}

// ============================================================
// GET ALL USERS
// ============================================================

export async function getAllUsers(
  filters: UsersSearchParams
): Promise<ActionResponse> {
  const { userId, currentTenantId } = await getSession();

  if (!userId || !currentTenantId) {
    return {
      data: [],
      success: false,
      message: "Aucun tenant actif.",
    };
  }

  const g = await guard(ACTION.READ, RESOURCE.USER);

  if (!g.success) {
    return {
      data: [],
      success: false,
      message: g.message,
    };
  }

  const currentPage = Math.max(filters?.currentPage ?? 1, 1);

  const requestedItemsPerPage =
    filters?.itemsPerPage ?? PAGINATION_SETTINGS.itemsPerPage;

  const itemsPerPage = Math.max(requestedItemsPerPage, 1);

  const name = filters?.name?.trim();
  const active = filters?.active;
  const role = filters?.role?.trim();

  const where: Prisma.UserWhereInput = {
    memberships: {
      some: {
        tenantId: currentTenantId,

        ...(role
          ? {
            roleAssignments: {
              some: {
                role: {
                  name: role,
                },
              },
            },
          }
          : {}),
      },
    },
  };

  if (name) {
    where.OR = [
      {
        name: {
          contains: name,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: name,
          mode: "insensitive",
        },
      },
    ];
  }

  if (active === ACTIVE.YES) {
    where.active = true;
  }

  if (active === ACTIVE.NO) {
    where.active = false;
  }

  const skip = (currentPage - 1) * itemsPerPage;

  const [users, totalItems] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: {
        name: "asc",
      },
      skip,
      take: itemsPerPage,
      omit: {
        password: true,
      },
      include: {
        memberships: {
          where: {
            tenantId: currentTenantId,
          },
          include: {
            tenant: true,
            roleAssignments: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    }),

    prisma.user.count({
      where,
    }),
  ]);

  // Présenter les rôles de l'appartenance courante sous la propriété
  // "roles", afin de conserver la compatibilité avec l'interface.
  const formattedUsers = users.map(({ memberships, ...user }) => {
    const membership = memberships[0];

    return {
      ...user,
      tenant: membership?.tenant ?? null,
      roles:
        membership?.roleAssignments.map(
          (assignment) => assignment.role
        ) ?? [],
    };
  });

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return {
    data: formattedUsers,
    success: true,
    message: "Données récupérées avec succès!",
    meta: {
      currentPage,
      itemsPerPage,
      totalItems,
      totalPages,
    },
  };
}

// ============================================================
// GET USER BY ID
// ============================================================

export async function getUserById(id: string) {
  const g = await guard(ACTION.READ, RESOURCE.USER);

  if (!g.success) {
    return {
      data: null,
      success: false,
      message: g.message,
    };
  }

  const { userId, currentTenantId } = await getSession();

  if (!userId || !currentTenantId) {
    return {
      data: null,
      success: false,
      message: "Aucun tenant actif.",
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      id,
      memberships: {
        some: {
          tenantId: currentTenantId,
        },
      },
    }, omit: {
      password: true,
    },
    include: {
      memberships: {
        where: {
          tenantId: currentTenantId,
        },
        include: {
          tenant: true,
          roleAssignments: {
            include: {
              role: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return {
      data: null,
      success: false,
      message: "Utilisateur introuvable dans ce tenant.",
    };
  }

  const { memberships, ...userData } = user;
  const membership = memberships[0];

  return {
    data: {
      ...userData,
      tenant: membership?.tenant ?? null,
      roles:
        membership?.roleAssignments.map(
          (assignment) => assignment.role
        ) ?? [],
    },
    success: true,
    message: "Données récupérées avec succès.",
  };
}

// ============================================================
// GET ALL ROLES FOR USER FORMS
// Les définitions des rôles restent globales.
// Seules leurs affectations sont propres à chaque appartenance.
// ============================================================

export async function getAllRoles(): Promise<{
  roles: Role[];
  success: boolean;
  message: string;
}> {
  const g = await guard(ACTION.READ, RESOURCE.USER);

  if (!g.success) {
    return {
      roles: [],
      success: false,
      message: g.message,
    };
  }

  const { userId, currentTenantId } = await getSession();

  if (!userId || !currentTenantId) {
    return {
      roles: [],
      success: false,
      message: "Utilisateur non authentifié ou aucun tenant actif.",
    };
  }

  const roles = await prisma.role.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return {
    roles,
    success: true,
    message: "Données récupérées avec succès!",
  };
}

// ============================================================
// CREATE USER
// ============================================================

export async function createUser(
  name: string,
  active: boolean,
  email: string,
  password: string,
  roleIds: string[] = []
): Promise<ActionResponse> {
  const g = await guard(ACTION.CREATE, RESOURCE.USER);

  if (!g.success) {
    return {
      success: false,
      message: g.message,
    };
  }

  const { userId, currentTenantId } = await getSession();

  if (!userId || !currentTenantId) {
    return {
      success: false,
      message: "Utilisateur non authentifié ou aucun tenant actif.",
    };
  }

  try {
    const roleValidationError = await validateRoleAssignments(
      userId,
      roleIds
    );

    if (roleValidationError) {
      return {
        success: false,
        message: roleValidationError,
      };
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return {
        success: false,
        message: "L'adresse e-mail est obligatoire.",
      };
    }

    const existing = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    // --------------------------------------------------------
    // Le compte existe : ajouter une nouvelle appartenance.
    // --------------------------------------------------------

    if (existing) {
      if (existing.isSuperAdmin) {
        return {
          success: false,
          message: "Cet email appartient au super-administrateur.",
        };
      }

      if (!existing.active) {
        return {
          success: false,
          message: "Ce compte utilisateur est désactivé.",
        };
      }

      const membership = await prisma.userTenant.findUnique({
        where: {
          userId_tenantId: {
            userId: existing.id,
            tenantId: currentTenantId,
          },
        },
      });

      if (membership) {
        return {
          success: false,
          message: "Cet utilisateur appartient déjà à ce tenant.",
        };
      }

      // Création de l'appartenance et affectation des rôles
      // dans une seule transaction.
      await prisma.$transaction(async (tx) => {
        await tx.userTenant.create({
          data: {
            userId: existing.id,
            tenantId: currentTenantId,
          },
        });

        await syncMembershipRoles(
          tx,
          existing.id,
          currentTenantId,
          roleIds
        );
      });

      return {
        success: true,
        message: "Le compte existant a été ajouté à ce tenant.",
      };
    }

    // --------------------------------------------------------
    // Le compte n'existe pas : créer utilisateur et appartenance.
    // --------------------------------------------------------

    const hashedPassword = await bcrypt.hash(password, 10);

    if (typeof password !== "string" || password.length < 12) {
      return {
        success: false,
        message: "Le mot de passe doit contenir au moins 12 caractères.",
      };
    }

    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          active,
          email: normalizedEmail,
          password: hashedPassword,

          // Ancien champ conservé pour compatibilité.
          tenantId: currentTenantId,

          memberships: {
            create: {
              tenantId: currentTenantId,
            },
          },
        },
      });

      await syncMembershipRoles(
        tx,
        newUser.id,
        currentTenantId,
        roleIds
      );
    });

    return {
      success: true,
      message: "Utilisateur créé avec succès.",
    };
  } catch (error) {
    console.error(
      "Erreur lors de la création de l'utilisateur :",
      error
    );

    return {
      success: false,
      message:
        "Erreur lors de la création de l'utilisateur. Vérifiez les données et les rôles sélectionnés.",
    };
  }
}

// ============================================================
// UPDATE USER
// ============================================================


export async function updateUser(
  id: string,
  name: string,
  email?: string,
  password?: string,
  active?: boolean,
  roleIds: string[] = []
): Promise<ActionResponse> {
  const g = await guard(ACTION.UPDATE, RESOURCE.USER);

  if (!g.success) {
    return {
      success: false,
      message: g.message,
    };
  }

  const { userId, currentTenantId } = await getSession();

  if (!userId || !currentTenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
    };
  }

  try {
    const roleValidationError = await validateRoleAssignments(
      userId,
      roleIds
    );

    if (roleValidationError) {
      return {
        success: false,
        message: roleValidationError,
      };
    }

    // Vérifier que l'utilisateur cible appartient au tenant courant.
    const membership = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: id,
          tenantId: currentTenantId,
        },
      },
    });

    if (!membership) {
      return {
        success: false,
        message: "Utilisateur introuvable dans ce tenant.",
      };
    }

    // Récupérer le compte de l'utilisateur connecté
    // et celui de l'utilisateur à modifier.
    const [actor, target] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          active: true,
          isSuperAdmin: true,
        },
      }),
      prisma.user.findUnique({
        where: { id },
        select: {
          name: true,
          email: true,
          active: true,
        },
      }),
    ]);

    if (!actor?.active) {
      return {
        success: false,
        message: "Votre compte est désactivé ou introuvable.",
      };
    }

    if (!target) {
      return {
        success: false,
        message: "Utilisateur introuvable.",
      };
    }

    const data: Prisma.UserUpdateInput = {};

    if (actor.isSuperAdmin) {
      // Le SuperAdmin peut modifier les informations globales.
      const normalizedName = name.trim();

      if (!normalizedName) {
        return {
          success: false,
          message: "Le nom est obligatoire.",
        };
      }

      data.name = normalizedName;

      if (email !== undefined) {
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
          return {
            success: false,
            message: "L'adresse e-mail est obligatoire.",
          };
        }

        data.email = normalizedEmail;
      }

      if (active !== undefined) {
        data.active = active;
      }

      if (password) {
        if (typeof password !== "string" || password.length < 12) {
          return {
            success: false,
            message: "Le mot de passe doit contenir au moins 12 caractères.",
          };
        }

        data.password = await bcrypt.hash(password, 10);
      }
    } else {
      // Un administrateur de tenant ne peut pas modifier
      // les propriétés globales du compte.
      const globalFieldsChanged =
        name !== target.name ||
        (email !== undefined &&
          email.trim().toLowerCase() !== target.email.toLowerCase()) ||
        (active !== undefined && active !== target.active) ||
        Boolean(password);

      if (globalFieldsChanged) {
        return {
          success: false,
          message:
            "Seul le SuperAdmin peut modifier le nom, l'e-mail, le mot de passe ou le statut global du compte. Vous pouvez modifier les rôles dans ce tenant.",
        };
      }
    }

    // Les rôles sont toujours modifiés uniquement pour
    // l'appartenance au tenant courant.
    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.user.update({
          where: { id },
          data,
        });
      }

      await syncMembershipRoles(
        tx,
        id,
        currentTenantId,
        roleIds
      );
    });

    return {
      success: true,
      message: "Utilisateur modifié avec succès.",
    };
  } catch (error) {
    console.error(
      "Erreur lors de la modification de l'utilisateur :",
      error
    );

    return {
      success: false,
      message:
        "Erreur lors de la modification de l'utilisateur. Vérifiez notamment que l'adresse e-mail n'est pas déjà utilisée.",
    };
  }
}


// ============================================================
// DELETE USER FROM CURRENT TENANT
// Cette action supprime l'appartenance, pas le compte global.
// Les rôles de cette appartenance sont supprimés en cascade.
// ============================================================

export async function deleteUser(
  id: string
): Promise<ActionResponse> {
  const g = await guard(ACTION.DELETE, RESOURCE.USER);

  if (!g.success) {
    return {
      success: false,
      message: g.message,
    };
  }

  const { userId, currentTenantId } = await getSession();

  if (!userId || !currentTenantId) {
    return {
      success: false,
      message: "Utilisateur non authentifié ou aucun tenant actif.",
    };
  }

  try {
    const result = await prisma.userTenant.deleteMany({
      where: {
        userId: id,
        tenantId: currentTenantId,
      },
    });

    if (result.count === 0) {
      return {
        success: false,
        message: "Utilisateur introuvable dans ce tenant.",
      };
    }

    return {
      success: true,
      message: "Utilisateur retiré de ce tenant.",
    };
  } catch (error) {
    console.error(
      "Erreur lors de la suppression de l'utilisateur :",
      error
    );

    return {
      success: false,
      message: "Erreur lors de la suppression de l'utilisateur.",
    };
  }
}