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

const roleAssignmentData = (roleIds: string[]) =>
  roleIds.map((roleId) => ({
    role: { connect: { id: roleId } },
  }));

export async function getAllUsers(filters: UsersSearchParams): Promise<ActionResponse> {
  const { userId, currentTenantId } = await getSession();

  if (!userId || !currentTenantId) {
    return { data: [], success: false, message: "Aucun tenant actif." };
  }

  const permission = await guard(ACTION.READ, RESOURCE.USER);
  if (!permission.success) {
    return { data: [], success: false, message: permission.message };
  }

  const currentPage = Math.max(filters?.currentPage ?? 1, 1);
  const itemsPerPage = Math.max(
    filters?.itemsPerPage ?? PAGINATION_SETTINGS.itemsPerPage,
    1
  );

  const membershipFilter: Prisma.UserTenantWhereInput = {
    tenantId: currentTenantId,
  };

  if (filters?.role) {
    membershipFilter.roleAssignments = {
      some: { role: { name: filters.role } },
    };
  }

  const where: Prisma.UserWhereInput = {
    memberships: { some: membershipFilter },
  };

  if (filters?.name) {
    where.OR = [
      { name: { contains: filters.name, mode: "insensitive" } },
      { email: { contains: filters.name, mode: "insensitive" } },
    ];
  }

  if (filters?.active === ACTIVE.YES) where.active = true;
  if (filters?.active === ACTIVE.NO) where.active = false;

  const skip = (currentPage - 1) * itemsPerPage;

  const [users, totalItems] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: itemsPerPage,
      include: {
        memberships: {
          where: { tenantId: currentTenantId },
          include: {
            tenant: true,
            roleAssignments: { include: { role: true } },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const data = users.map(({ memberships, ...user }) => ({
    ...user,
    tenant: memberships[0]?.tenant ?? null,
    roles: memberships[0]?.roleAssignments.map(({ role }) => role) ?? [],
  }));

  return {
    data,
    success: true,
    message: "Données récupérées avec succès!",
    meta: {
      currentPage,
      itemsPerPage,
      totalItems,
      totalPages: Math.ceil(totalItems / itemsPerPage),
    },
  };
}

// ================== GET USER BY ID ==================
export async function getUserById(id: string) {
  const permission = await guard(ACTION.READ, RESOURCE.USER);
  if (!permission.success) {
    return { data: null, success: false, message: permission.message };
  }

  const { userId, currentTenantId } = await getSession();
  if (!userId || !currentTenantId) {
    return { data: null, success: false, message: "Aucun tenant actif." };
  }

  const user = await prisma.user.findFirst({
    where: {
      id,
      memberships: { some: { tenantId: currentTenantId } },
    },
    include: {
      memberships: {
        where: { tenantId: currentTenantId },
        include: {
          tenant: true,
          roleAssignments: { include: { role: true } },
        },
      },
    },
  });

  if (!user) {
    return { data: null, success: false, message: "Utilisateur introuvable." };
  }

  const { memberships, ...userData } = user;
  const membership = memberships[0];

  return {
    data: {
      ...userData,
      tenant: membership?.tenant ?? null,
      roles: membership?.roleAssignments.map(({ role }) => role) ?? [],
    },
    success: true,
    message: "",
  };
}

// ================== GET ALL ROLES ==================
export async function getAllRoles(): Promise<{
  roles: Role[];
  success: boolean;
  message: string;
}> {
  const permission = await guard(ACTION.READ, RESOURCE.USER);
  if (!permission.success) {
    return { roles: [], success: false, message: permission.message };
  }

  const { userId, currentTenantId } = await getSession();
  if (!userId || !currentTenantId) {
    return { roles: [], success: false, message: "Utilisateur non authentifié." };
  }

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
  });

  return {
    roles,
    success: true,
    message: "Données récupérées avec succès!",
  };
}

// ================== CREATE USER ==================
export async function createUser(
  name: string,
  active: boolean,
  email: string,
  password: string,
  roleIds: string[] = []
): Promise<ActionResponse> {
  const permission = await guard(ACTION.CREATE, RESOURCE.USER);
  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const { userId, currentTenantId } = await getSession();
  if (!userId || !currentTenantId) {
    return {
      success: false,
      message: "Utilisateur non authentifié ou aucun tenant actif.",
    };
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const uniqueRoleIds = [...new Set(roleIds)];

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing?.isSuperAdmin) {
      return {
        success: false,
        message: "Cet email appartient au super-administrateur.",
      };
    }

    if (existing && !existing.active) {
      return {
        success: false,
        message: "Ce compte utilisateur est désactivé.",
      };
    }

    if (existing) {
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
          roleAssignments: {
            create: roleAssignmentData(uniqueRoleIds),
          },
        },
      });

      return {
        success: true,
        message: "Compte ajouté au tenant avec ses rôles.",
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        active,
        email: normalizedEmail,
        password: hashedPassword,
        tenantId: currentTenantId,
        memberships: {
          create: {
            tenantId: currentTenantId,
            roleAssignments: {
              create: roleAssignmentData(uniqueRoleIds),
            },
          },
        },
      },
    });

    return { success: true, message: "Utilisateur créé avec succès." };
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur.", error);
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
  const permission = await guard(ACTION.UPDATE, RESOURCE.USER);
  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const { userId, currentTenantId } = await getSession();
  if (!userId || !currentTenantId) {
    return { success: false, message: "Aucun tenant actif." };
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
    };

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const uniqueRoleIds = [...new Set(roleIds)];

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data });

      await tx.userTenantRole.deleteMany({
        where: { userId: id, tenantId: currentTenantId },
      });

      if (uniqueRoleIds.length > 0) {
        await tx.userTenantRole.createMany({
          data: uniqueRoleIds.map((roleId) => ({
            userId: id,
            tenantId: currentTenantId,
            roleId,
          })),
          skipDuplicates: true,
        });
      }
    });

    return { success: true, message: "Utilisateur modifié avec succès." };
  } catch (error) {
    console.error("Erreur lors de la modification de l'utilisateur.", error);
    return {
      success: false,
      message: "Erreur lors de la modification de l'utilisateur.",
    };
  }
}

// ================== DELETE USER ==================
export async function deleteUser(id: string): Promise<ActionResponse> {
  const permission = await guard(ACTION.DELETE, RESOURCE.USER);
  if (!permission.success) {
    return { success: false, message: permission.message };
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
      where: { userId: id, tenantId: currentTenantId },
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
    console.error("Erreur lors de la suppression de l'utilisateur.", error);
    return {
      success: false,
      message: "Erreur lors de la suppression de l'utilisateur.",
    };
  }
}
