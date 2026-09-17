// server/site.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import { Site, Tenant, User } from "@/lib/generated/prisma/client";
import { sleep } from "@/lib/utils";
import { hashPassword } from "@/lib/auth";

export type UserWithTenant = User & { tenant: Tenant | null };

export interface SearchParams {
  name?: string;
  active?: string;
  email?: string;
  password?: string;

  // 
  page?: string;
  perPage?: string;
}

export interface PaginatedUsers {
  data: UserWithTenant[];
  meta: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  };
}

export async function getAllUsers(tenantId: string, filters: SearchParams): Promise<PaginatedUsers | null> {

  const { user } = await getCurrentUser();

  if (!user?.id) return null;

  try {
    await sleep();

    // Configuration des variables de pagination
    const currentPage = Math.max(1, parseInt(filters?.page || "1", 10));
    const itemsPerPage = Math.max(1, parseInt(filters?.perPage || "10", 10)); const skip = (currentPage - 1) * itemsPerPage;

    const whereClause: any = {
      isSuperAdmin: false,
      tenantId, // ✅ toujours filtré par tenant
      ...(filters?.name && { name: { contains: filters?.name, mode: "insensitive" } }),
      ...(filters?.email && { email: { contains: filters?.email, mode: "insensitive" } }),
      ...(filters?.active && { active: filters?.active === "active" }),
    };

    // Exécution en parallèle du comptage total et de la récupération des données paginées
    const [totalItems, users] = await prisma.$transaction([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        include: { tenant: true },
        orderBy: { name: "asc" },
        take: itemsPerPage, // Limite le nombre de résultats
        skip: skip,         // Ignore les résultats des pages précédentes
      })
    ]);

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      data: users,
      meta: {
        totalItems,
        totalPages,
        currentPage,
        itemsPerPage,
      },
    };
  } catch (error) {
    return null
  }
}

export async function createUser(name: string, active: boolean, email: string, password: string, tenantId: string) {
  try {
    await sleep();
    const { user } = await getCurrentUser();

    // check if session exist
    if (!user?.id)
      return {
        success: false,
        message: "Aucune session n'est trouvée!",
      };

    // Super-admin : seul qui peut créer un nouveau user
    if (!user.isSuperAdmin) {
      return {
        success: false,
        message: "Vous n'êtes pas authorisé pour créer un user.",
      };
    }

    // vérifier si l'email & tenantId est déjà utilisé ensemble
    const userExist = await prisma.user.findFirst({
      where: { email, tenantId },
    });
    if (userExist) {
      return {
        success: false,
        message: "L'eamil est déjà utilisé, veuillez choisir un autre.",
      };
    }

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(password);
    // créer le user
    await prisma.user.create({
      data: { name, active, email, tenantId, password: hashedPassword }
    });
    return {
      success: true,
      message: "Utilisateur crée avec succès!",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Erreur!",
    };
  }
}

export async function updateUser(id: string, name: string, active: boolean, tenantId: string) {
  try {
    await sleep();
    const { user } = await getCurrentUser();

    // check if session exist
    if (!user?.id)
      return {
        success: false,
        message: "Aucune session n'est trouvée!",
      };

    // Super-admin : seul qui peut modifier un Utilisateur
    if (!user.isSuperAdmin) {
      return {
        success: false,
        message: "Vous n'êtes pas authorisé pour modifier un Utilisateur.",
      };
    }

    // créer le Utilisateur
    await prisma.user.update({
      where: { tenantId, id },
      data: { name, active },
    });

    return {
      success: true,
      message: "Utilisateur modifié avec succès!",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Erreur!",
    };
  }
}

export async function deleteUser(id: string) {
  try {
    await sleep();
    const { user } = await getCurrentUser();

    // check if session exist
    if (!user?.id)
      return {
        success: false,
        message: "Aucune session n'est trouvée!",
      };

    // Super-admin : seul qui peut modifier un utilisateur
    if (!user.isSuperAdmin) {
      return {
        success: false,
        message: "Vous n'êtes pas authorisé pour supprimer un utilisateur.",
      };
    }

    // supprimer l'utilisateur
    await prisma.user.delete({
      where: { id, isSuperAdmin: false },
    });

    return {
      success: true,
      message: "Utilisateur supprimé avec succès!",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Erreur!",
    };
  }
}