"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { Role } from "@/lib/generated/prisma/client";
import { ActionResponse } from "./types";
import { getSession } from "@/lib/auth";

export type UsersSearchParams = {
  name?: string;
  active?: string;
  page?: string;
  limit?: string;
};

const ITEMS_PER_PAGE = 10;

const the_resource = "user";

// ================== GET ALL USERS ==================
export async function getAllUsers(
  filters: UsersSearchParams = {}
) {

  // 1. Vérifier la permission
  const g = await guard(ACTION.READ, the_resource);
  if (!g.success) return { data: [], success: false, message: g.message };

  // 2. Continuer la logique métier
  const { userId } = await getSession();

  if (!userId) return { data: [], success: false, message: "Utilisateur non authentifié." };



  const { name, active, page = "1", limit = String(ITEMS_PER_PAGE) } = filters;

  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const itemsPerPage = Math.max(1, parseInt(limit, 10) || ITEMS_PER_PAGE);
  const skip = (currentPage - 1) * itemsPerPage;

  const { currentTenantId } = await getSession();

  const where: any = { tenantId: currentTenantId };

  if (name) {
    where.OR = [
      { name: { contains: name, mode: "insensitive" } },
      { email: { contains: name, mode: "insensitive" } },
    ];
  }

  if (active === "active") where.active = true;
  if (active === "inactive") where.active = false;

  const [users, totalItems] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: itemsPerPage,
      orderBy: { createdAt: "desc" },
      include: {
        roles: true, // 🔑 inclure les rôles
        tenant: true, // 🔑 inclure le tenant
      },
    }),
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
  const g = await guard(ACTION.READ, the_resource);
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
  const g = await guard(ACTION.READ, the_resource);
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
  tenantId: string,
  roleIds: string[] = []
): Promise<ActionResponse> {
  // 1. Vérifier la permission
  const g = await guard(ACTION.CREATE, the_resource);
  if (!g.success) return { success: false, message: g.message };

  // 2. Continuer la logique métier
  const { userId } = await getSession();
  if (!userId) return { success: false, message: "Utilisateur non authentifié" };

  try {
    const existing = await prisma.user.findFirst({ where: { tenantId, email } });

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
        tenantId,
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
  const g = await guard(ACTION.UPDATE, the_resource);
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
  const g = await guard(ACTION.DELETE, the_resource);
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