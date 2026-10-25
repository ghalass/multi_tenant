// server/permission.ts
"use server";

import { prisma } from "@/lib/prisma";
import { Action, Permission, Prisma } from "@/lib/generated/prisma/client";
import { ActionResponse } from "@/lib/types";
import { sleep } from "@/lib/utils";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { getSession } from "@/lib/auth";
import { PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";

export interface PermissionsSearchParams {
  s?: string;
  action?: Action

  // 
  page?: string;
  perPage?: string;
}

interface PaginatedPermissions {
  data: Permission[];
  success?: boolean,
  message?: string,
  meta?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  }
}

export async function getAllPermission(filters: PermissionsSearchParams): Promise<PaginatedPermissions | null> {

  // 1. Vérifier la permission
  const g = await guard(ACTION.READ, RESOURCE.PERMISSION);
  if (!g.success) return { data: [], success: false, message: g.message };

  // 2. Continuer la logique métier
  const { userId } = await getSession();
  if (!userId) return { data: [], success: false, message: "Utilisateur non authentifié." };

  try {
    await sleep();

    // Configuration des variables de pagination
    const currentPage = Math.max(1, parseInt(filters?.page || "1", 10));
    const itemsPerPage = Math.max(1, parseInt(filters?.perPage || "10", PAGINATION_SETTINGS.itemsPerPage)); const skip = (currentPage - 1) * itemsPerPage;

    // Construction propre du where
    const whereClause: Prisma.PermissionWhereInput = {
      // AND implicite : chaque clé de premier niveau
      ...(filters?.action && { action: { equals: filters?.action as Action } }),
      ...(filters?.s && {
        OR: [
          { name: { contains: filters?.s, mode: "insensitive" } },
          { resource: { contains: filters?.s, mode: "insensitive" } },
          { description: { contains: filters?.s, mode: "insensitive" } },
        ],
      }),
    };


    // Exécution en parallèle du comptage total et de la récupération des données paginées
    const [totalItems, permissions] = await prisma.$transaction([
      prisma.permission.count({ where: whereClause }),
      prisma.permission.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
        take: itemsPerPage, // Limite le nombre de résultats
        skip: skip,         // Ignore les résultats des pages précédentes
      })
    ]);

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      data: permissions,
      success: true, message: "Données récupérées avec succès!",
      meta: { totalItems, totalPages, currentPage, itemsPerPage },
    };
  } catch (error: unknown) {
    console.error("getAllPermissions error:", error);

    return {
      data: [],
      success: false,
      message: "Impossible de récupérer les permissions.",
    };
  }
}

export async function createPermission(resource: string, action: string, description: string): Promise<ActionResponse> {
  const g = await guard(ACTION.CREATE, RESOURCE.PERMISSION);
  if (!g.success) return g;

  try {
    await sleep();
    const { userId } = await getSession();

    // check if session exist
    if (!userId)
      return {
        success: false,
        message: "Aucune session n'est trouvée!",
      };

    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Super-admin : seul qui peut créer un nouveau permission
    if (!user?.isSuperAdmin) {
      return {
        success: false,
        message: "Vous n'êtes pas authorisé pour créer un permission.",
      };
    }

    // generate the name 
    const name = resource + "s:" + action;

    // vérifier si le nom est déjà utilisé
    const permissionExist = await prisma.permission.findUnique({
      where: { name },
    });
    if (permissionExist) {
      return {
        success: false,
        message: "Cette permission existe déjà.",
      };
    }

    // créer le permission
    await prisma.permission.create({
      data: { name, resource, action: action as Action, description }
    });
    return {
      success: true,
      message: "Permission crée avec succès!",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Erreur!",
    };
  }
}

export async function updatePermission(id: string, resource: string, action: string, description: string): Promise<ActionResponse> {
  const g = await guard(ACTION.UPDATE, RESOURCE.PERMISSION);
  if (!g.success) return g;
  try {
    await sleep();
    const { userId } = await getSession();

    // check if session exist
    if (!userId)
      return {
        success: false,
        message: "Aucune session n'est trouvée!",
      };

    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Super-admin : seul qui peut modifier un permission
    if (!user?.isSuperAdmin) {
      return {
        success: false,
        message: "Vous n'êtes pas authorisé pour modifier un permission.",
      };
    }

    // generate the name 
    const name = resource + "s:" + action;
    // vérifier si le nom est déjà utilisé
    const nameUsed = await prisma.permission.findFirst({
      where: {
        AND: { name },
        NOT: { id }
      },
    });

    if (nameUsed) {
      return {
        success: false,
        message: "Cette permission est déjà utilisé, veuillez choisir un autre.",
      };
    }

    // créer le permission
    await prisma.permission.update({
      where: { id },
      data: { name, action: action as Action, description, resource },
    });
    return {
      success: true,
      message: "Permission modifié avec succès!",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Erreur!",
    };
  }
}

export async function deletePermission(id: string): Promise<ActionResponse> {
  const g = await guard(ACTION.DELETE, RESOURCE.PERMISSION);
  if (!g.success) return g;

  try {
    await sleep();
    const { userId } = await getSession();

    // check if session exist
    if (!userId)
      return {
        success: false,
        message: "Aucune session n'est trouvée!",
      };

    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Super-admin : seul qui peut modifier un site
    if (!user?.isSuperAdmin) {
      return {
        success: false,
        message: "Vous n'êtes pas authorisé pour supprimer une permission.",
      };
    }

    // supprimer le site
    await prisma.permission.delete({
      where: { id },
    });
    return {
      success: true,
      message: "Permission supprimé avec succès!",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Erreur!",
    };
  }
}


// interface TableInfo {
//   table_name: string;
// }

// export async function getTables() {
//   try {
//     const tables = await prisma.$queryRaw<TableInfo[]>`
//       SELECT table_name::text as table_name
//       FROM information_schema.tables
//       WHERE table_schema = 'public'
//       AND table_type = 'BASE TABLE'
//       ORDER BY table_name
//     `;

//     // Filtrer les tables qui ne commencent pas par "prisma_" ou "_"
//     const filteredTables = tables
//       .map((table) => table.table_name)
//       .filter(
//         (tableName) =>
//           !tableName.startsWith("prisma_") && !tableName.startsWith("_")
//       );

//     return filteredTables;
//   } catch (error) {
//     console.error(error);
//     return []
//   }
// }
