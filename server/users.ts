"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { Role } from "@/lib/generated/prisma/client";
import { ActionResponse } from "./types";
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

  const g = await guard(ACTION.READ, RESOURCE.USER);
  if (!g.success) return { data: [], success: false, message: g.message };

  // Pagination
  const currentPage = Math.max(filters?.currentPage ?? 1, 1);
  const itemsPerPage = Math.max(filters?.itemsPerPage ?? PAGINATION_SETTINGS.itemsPerPage, 1);

  const name = filters?.name;
  const active = filters?.active;
  const role = filters?.role;

  const where: any = { tenantId: currentTenantId };

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
        tenant: true,
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
  const { userId } = await getSession();
  if (!userId) return { data: [], success: false, message: "Utilisateur non authentifié." };

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: true,
      tenant: true,
    },
  });
  return { data: user, success: true, message: "" };
}

// ================== GET ALL ROLES ==================
export async function getAllRoles(): Promise<{ roles: Role[], success: boolean, message: string }> {
  // 1. Vérifier la permission
  const g = await guard(ACTION.READ, RESOURCE.USER);
  if (!g.success) return { roles: [], success: false, message: g.message };

  // 2. Continuer la logique métier
  const { userId } = await getSession();

  if (!userId) return { roles: [], success: false, message: "Utilisateur non authentifié" };

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
  if (!userId) return { success: false, message: "Utilisateur non authentifié" };

  try {
    const existing = await prisma.user.findFirst({ where: { tenantId: currentTenantId, email } });

    if (existing) {
      return {
        success: false,
        message: "Un utilisateur avec cet email existe déjà.",
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        active,
        email,
        password: hashedPassword,
        tenantId: currentTenantId,
        roles: {
          connect: roleIds.map((id) => ({ id })),
        },
      },
    });

    return { success: true, message: "Utilisateur créé avec succès." };
  } catch (error) {
    console.error(error);
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
  active: boolean,
  roleIds: string[] = []
): Promise<ActionResponse> {
  // 1. Vérifier la permission
  const g = await guard(ACTION.UPDATE, RESOURCE.USER);
  if (!g.success) return { success: false, message: g.message };

  // 2. Continuer la logique métier
  const { userId } = await getSession();
  if (!userId) return { success: false, message: "Utilisateur non authentifié" };

  try {
    await prisma.user.update({
      where: { id },
      data: {
        name,
        active,
        roles: {
          set: roleIds.map((id) => ({ id })),
        },
      },
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
  const { userId } = await getSession();
  if (!userId) return { success: false, message: "Utilisateur non authentifié" };

  try {
    await prisma.user.delete({ where: { id } });
    return { success: true, message: "Utilisateur supprimé avec succès." };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Erreur lors de la suppression de l'utilisateur.",
    };
  }
}