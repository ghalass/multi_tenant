"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export type SearchParams = {
  name?: string;
  active?: string;
  page?: string;
  limit?: string;
};

const ITEMS_PER_PAGE = 10;

// ================== GET ALL USERS ==================
export async function getAllUsers(
  tenantId: string,
  filters: SearchParams = {}
) {
  const { name, active, page = "1", limit = String(ITEMS_PER_PAGE) } = filters;

  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const itemsPerPage = Math.max(1, parseInt(limit, 10) || ITEMS_PER_PAGE);
  const skip = (currentPage - 1) * itemsPerPage;

  const where: any = { tenantId };

  if (name) {
    where.OR = [
      { name: { contains: name, mode: "insensitive" } },
      { email: { contains: name, mode: "insensitive" } },
    ];
  }

  if (active === "active") where.active = true;
  if (active === "inactive") where.active = false;

  const [data, totalItems] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: itemsPerPage,
      orderBy: { createdAt: "desc" },
      include: {
        roles: true, // 🔑 inclure les rôles
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return {
    data,
    meta: { currentPage, itemsPerPage, totalItems, totalPages },
  };
}

// ================== GET ALL ROLES ==================
export async function getAllRoles() {
  return prisma.role.findMany({
    orderBy: { name: "asc" },
  });
}

// ================== CREATE USER ==================
export async function createUser(
  name: string,
  active: boolean,
  email: string,
  password: string,
  tenantId: string,
  roleIds: string[] = []
) {
  try {
    const existing = await prisma.user.findFirst({
      where: { tenantId, email },
    });

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

    revalidatePath("/[tenantId]/users", "page");
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
  tenantId: string,
  roleIds: string[] = []
) {
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

    revalidatePath("/[tenantId]/users", "page");
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
export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath("/[tenantId]/users", "page");
    return { success: true, message: "Utilisateur supprimé avec succès." };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Erreur lors de la suppression de l'utilisateur.",
    };
  }
}