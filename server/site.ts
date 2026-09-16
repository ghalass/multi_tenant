// server/site.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import { Site, Tenant } from "@/lib/generated/prisma/client";
import { sleep } from "@/lib/utils";

export type SiteWithTenant = Site & { tenant: Tenant };

export interface SearchParams {
  name?: string;
  active?: string;
  page?: string;
  perPage?: string;
}

export interface PaginatedSites {
  data: SiteWithTenant[];
  meta: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  };
}

export async function getAllSite(tenantId: string, filters: SearchParams): Promise<PaginatedSites | null> {

  const { user } = await getCurrentUser();

  if (!user?.id) return null;

  try {
    await sleep();

    // Configuration des variables de pagination
    const currentPage = Math.max(1, parseInt(filters.page || "1", 10));
    const itemsPerPage = Math.max(1, parseInt(filters.perPage || "10", 10)); const skip = (currentPage - 1) * itemsPerPage;

    const whereClause: any = {
      tenantId, // ✅ toujours filtré par tenant
      ...(filters.name && { name: { contains: filters.name, mode: "insensitive" } }),
      ...(filters.active && { active: filters.active === "active" }),
    };

    // Exécution en parallèle du comptage total et de la récupération des données paginées
    const [totalItems, sites] = await prisma.$transaction([
      prisma.site.count({ where: whereClause }),
      prisma.site.findMany({
        where: whereClause,
        include: { tenant: true },
        orderBy: { name: "asc" },
        take: itemsPerPage, // Limite le nombre de résultats
        skip: skip,         // Ignore les résultats des pages précédentes
      })
    ]);

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      data: sites,
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

export async function createSite(name: string, active: boolean, tenantId: string) {
  try {
    await sleep();
    const { user } = await getCurrentUser();

    // check if session exist
    if (!user?.id)
      return {
        success: false,
        message: "Aucune session n'est trouvée!",
      };

    // Super-admin : seul qui peut créer un nouveau site
    if (!user.isSuperAdmin) {
      return {
        success: false,
        message: "Vous n'êtes pas authorisé pour créer un site.",
      };
    }

    // vérifier si le nom est déjà utilisé
    const nameUsed = await prisma.site.findFirst({
      where: { name, tenantId },
    });
    if (nameUsed) {
      return {
        success: false,
        message: "Nom du site est déjà utilisé, veuillez choisir un autre.",
      };
    }

    // créer le site
    await prisma.site.create({
      data: { name, active, tenantId }
    });
    return {
      success: true,
      message: "Site crée avec succès!",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Erreur!",
    };
  }
}

export async function updateSite(id: string, name: string, active: boolean, tenantId: string) {
  try {
    await sleep();
    const { user } = await getCurrentUser();

    // check if session exist
    if (!user?.id)
      return {
        success: false,
        message: "Aucune session n'est trouvée!",
      };

    // Super-admin : seul qui peut modifier un site
    if (!user.isSuperAdmin) {
      return {
        success: false,
        message: "Vous n'êtes pas authorisé pour modifier un site.",
      };
    }

    // vérifier si le nom est déjà utilisé
    const nameUsed = await prisma.site.findFirst({
      where: {
        AND: { name, tenantId, },
        NOT: { id }
      },
    });

    if (nameUsed) {
      return {
        success: false,
        message: "Nom du site est déjà utilisé, veuillez choisir un autre.",
      };
    }

    // créer le site
    await prisma.site.update({
      where: { tenantId, id },
      data: { name, active },
    });
    return {
      success: true,
      message: "Site modifié avec succès!",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Erreur!",
    };
  }
}

export async function deleteSite(id: string) {
  try {
    await sleep();
    const { user } = await getCurrentUser();

    // check if session exist
    if (!user?.id)
      return {
        success: false,
        message: "Aucune session n'est trouvée!",
      };

    // Super-admin : seul qui peut modifier un site
    if (!user.isSuperAdmin) {
      return {
        success: false,
        message: "Vous n'êtes pas authorisé pour supprimer un site.",
      };
    }

    // supprimer le site
    await prisma.site.delete({
      where: { id },
    });
    return {
      success: true,
      message: "Site supprimé avec succès!",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Erreur!",
    };
  }
}