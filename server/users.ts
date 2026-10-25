"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { Prisma, Role } from "@/lib/generated/prisma/client";
import { ActionResponse } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { ACTIVE, PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";

export type UsersSearchParams = {
  name?: string;
  active?: string;
  role?: string;
  currentPage?: number;
  itemsPerPage?: number;
};


export async function getAllUsers(filters: UsersSearchParams): Promise<ActionResponse> {
  const { userId, currentTenantId } = await getSession();

  if (!userId || !currentTenantId) {
    return {
      data: [],
      success: false,
      message: "Aucun tenant actif.",
    };
  }

  const g = await guard(ACTION.READ, RESOURCE.USER);
  if (!g.success) return { data: [], success: false, message: g.message };

  // Pagination
  const currentPage = Math.max(filters?.currentPage ?? 1, 1);
  const itemsPerPage = Math.max(filters?.itemsPerPage ?? PAGINATION_SETTINGS.itemsPerPage, 1);

  const name = filters?.name;
  const active = filters?.active;
  const role = filters?.role;

  const where: Prisma.UserWhereInput = {
    memberships: {
      some: { tenantId: currentTenantId },
    },
  };

  if (name) {
    where.OR = [
      { name: { contains: name, mode: "insensitive" } },
      { email: { contains: name, mode: "insensitive" } },
    ];
  }

  if (role) {
    where.roles = {
      some: {
        name: role,
      },
    };
  }

  if (active === ACTIVE.YES) where.active = true;
  if (active === ACTIVE.NO) where.active = false;

  const skip = (currentPage - 1) * itemsPerPage

  const [users, totalItems] = await Promise.all([
    // 1. Récupérer les users de la page actuelle
    prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: itemsPerPage,
      include: {
        roles: true,
        memberships: {
          where: { tenantId: currentTenantId },
          include: { tenant: true },
        },
      },
    }),
    // 2. Compter tous les users correspondant aux filtres
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return {
    data: users,
    success: true, message: "Données récupérées avec succès!",
    meta: { currentPage, itemsPerPage, totalItems, totalPages },
  };
}

// ================== GET USER BY ID ==================
export async function getUserById(id: string) {
  // 1. Vérifier la permission
  const g = await guard(ACTION.READ, RESOURCE.USER);
  if (!g.success) return { data: [], success: false, message: g.message };

  // 2. Continuer la logique métier
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
        some: { tenantId: currentTenantId },
      },
    },
    include: {
      roles: true,
      memberships: {
        where: { tenantId: currentTenantId },
        include: { tenant: true },
      },
    },
  });
  if (!user) {
    return {
      data: null,
      success: false,
      message: "Utilisateur introuvable.",
    };
  }

  const { memberships, ...userData } = user;

  return {
    data: {
      ...userData,
      tenant: memberships[0]?.tenant ?? null,
    },
    success: true,
    message: "",
  };
}

// ================== GET ALL ROLES ==================
export async function getAllRoles(): Promise<{ roles: Role[], success: boolean, message: string }> {
  // 1. Vérifier la permission
  const g = await guard(ACTION.READ, RESOURCE.USER);
  if (!g.success) return { roles: [], success: false, message: g.message };

  // 2. Continuer la logique métier
  const { userId, currentTenantId } = await getSession();

  if (!userId || !currentTenantId) return { roles: [], success: false, message: "Utilisateur non authentifié" };

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
  });
  return {
    roles: roles,
    success: true, message: "Données récupérées avec succès!",
  };
  // return { data: roles, success: true, message: "" };
}

// ================== CREATE USER ==================
export async function createUser(
  name: string,
  active: boolean,
  email: string,
  password: string,
  roleIds: string[] = []
): Promise<ActionResponse> {
  const g = await guard(ACTION.CREATE, RESOURCE.USER);
  if (!g.success) return { success: false, message: g.message };

  const { userId, currentTenantId } = await getSession();

  if (!userId || !currentTenantId) {
    return {
      success: false,
      message: "Utilisateur non authentifié ou aucun tenant actif.",
    };
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

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

      await prisma.userTenant.create({
        data: {
          userId: existing.id,
          tenantId: currentTenantId,
        },
      });

      return {
        success: true,
        message: "Le compte existant a été ajouté à ce tenant.",
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        active,
        email: normalizedEmail,
        password: hashedPassword,

        // Conservé pour compatibilité avec le code existant.
        tenantId: currentTenantId,

        memberships: {
          create: {
            tenantId: currentTenantId,
          },
        },

        roles: {
          connect: roleIds.map((id) => ({ id })),
        },
      },
    });

    return {
      success: true,
      message: "Utilisateur créé avec succès.",
    };
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur.");

    return {
      success: false,
      message: "Erreur lors de la création de l'utilisateur.",
    };
  }
}

// ================== UPDATE USER ==================
export async function updateUser(
  id: string,
  name: string,
  email?: string,
  password?: string,
  active?: boolean,
  roleIds: string[] = []
): Promise<ActionResponse> {
  // 1. Vérifier la permission
  const g = await guard(ACTION.UPDATE, RESOURCE.USER);
  if (!g.success) return { success: false, message: g.message };

  // 2. Continuer la logique métier
  const { userId, currentTenantId } = await getSession();
  if (!userId || !currentTenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
    };
  }
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

  try {
    const data: Prisma.UserUpdateInput = {
      name,
      email: email?.trim().toLowerCase(),
      active,
      roles: {
        set: roleIds.map((id) => ({ id })),
      },
    };

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({
      where: { id },
      data,
    });

    return { success: true, message: "Utilisateur modifié avec succès." };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Erreur lors de la modification de l'utilisateur.",
    };
  }
}

// ================== DELETE USER ==================
export async function deleteUser(id: string): Promise<ActionResponse> {
  // 1. Vérifier la permission
  const g = await guard(ACTION.DELETE, RESOURCE.USER);
  if (!g.success) return { success: false, message: g.message };

  // 2. Continuer la logique métier
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
    console.error(error);
    return {
      success: false,
      message: "Erreur lors de la suppression de l'utilisateur.",
    };
  }
}