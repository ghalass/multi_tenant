"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { ActionResponse } from "@/lib/types"; import { getSession } from "@/lib/auth";
import { ACTIVE, PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";
import { convertField } from "@/lib/convertField";

export interface searchParams {
  name?: string;
  active?: string;
  currentPage?: number;
  itemsPerPage?: number;
}

export async function getAllParcs(filters: searchParams = { itemsPerPage: 0 }): Promise<ActionResponse> {
  const g = await guard(ACTION.READ, RESOURCE.PARC);
  if (!g.success) return { data: [], success: false, message: g.message };

  const { userId, currentTenantId } = await getSession();

  // Pagination
  const currentPage = Math.max(filters?.currentPage ?? 1, 1);
  const isUnpaged = filters?.itemsPerPage === 0;
  const itemsPerPage = isUnpaged
    ? 0
    : Math.max(filters?.itemsPerPage ?? PAGINATION_SETTINGS.itemsPerPage, 1);

  const name = filters?.name;
  const active = filters?.active;

  const where: any = { tenantId: currentTenantId };

  if (name) {
    where.OR = [
      { name: { contains: name, mode: "insensitive" } },
    ];
  }

  if (active === ACTIVE.YES) where.active = true;
  if (active === ACTIVE.NO) where.active = false;


  const skip = isUnpaged ? 0 : (currentPage - 1) * itemsPerPage;
  const take = isUnpaged ? undefined : itemsPerPage;

  const [parcs, totalItems] =
    await Promise.all([
      // 1. Récupérer les parcs de la page actuelle
      prisma.parc.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take,
        // On ne renvoie que les champs utiles du tenant
        include: {
          tenant: { select: { id: true, name: true } },
        },
      }),
      // 2. Compter tous les parcs correspondant aux filtres
      prisma.parc.count({ where }),
    ]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  return {
    data: parcs,
    success: true, message: "Données récupérées avec succès!",
    meta: { totalItems, totalPages, currentPage, itemsPerPage },
  };
}

/*
export async function createSite({ name, active }: { name: string; active: boolean }): Promise<ActionResponse> {
  const guardResult = await guard(ACTION.CREATE, RESOURCE.SITE);

  if (!guardResult.success) {
    return {
      success: false,
      message: guardResult.message,
    };
  }

  const { userId, currentTenantId } = await getSession();

  // if (!userId) {
  //   return {
  //     success: false,
  //     message:
  //       "Utilisateur non authentifié.",
  //   };
  // }

  if (!currentTenantId) {
    return {
      success: false,
      message:
        "L'utilisateur n'est associé à aucun tenant.",
    };
  }

  const trimmedName = name.trim();

  if (!trimmedName) {
    return {
      success: false,
      message:
        "Le nom du site est obligatoire.",
    };
  }

  try {
    const existing =
      await prisma.site.findFirst({
        where: {
          id: undefined,
          tenantId:
            currentTenantId,
          name: {
            equals: trimmedName,
            mode: "insensitive",
          },
        },
      });

    if (existing) {
      return {
        success: false,
        message:
          "Ce site existe déjà.",
      };
    }

    await prisma.site.create({
      data: {
        name: trimmedName,
        active,
        tenantId:
          currentTenantId,
      },
    });

    return {
      success: true,
      message:
        "Site créé avec succès.",
    };
  } catch (error) {
    console.error(
      "createSite error:",
      error
    );

    return {
      success: false,
      message:
        "Une erreur est survenue lors de la création du site.",
    };
  }
}

export async function updateSite(
  { id, name, active }: { id: string; name: string; active: boolean }): Promise<ActionResponse> {
  const guardResult = await guard(
    ACTION.UPDATE,
    RESOURCE.SITE
  );

  if (!guardResult.success) {
    return {
      success: false,
      message:
        guardResult.message,
    };
  }

  const { userId, currentTenantId } = await getSession();
  if (!userId) {
    return {
      success: false,
      message:
        "Utilisateur non authentifié.",
    };
  }


  if (!currentTenantId) {
    return {
      success: false,
      message:
        "L'utilisateur n'est associé à aucun tenant.",
    };
  }

  if (!name) {
    return {
      success: false,
      message:
        "Le nom du site est obligatoire.",
    };
  }

  try {
    const site =
      await prisma.site.findFirst({
        where: {
          id,
          tenantId:
            currentTenantId,
        },
      });

    if (!site) {
      return {
        success: false,
        message:
          "Site introuvable.",
      };
    }

    const duplicate =
      await prisma.site.findFirst({
        where: {
          tenantId:
            currentTenantId,
          name: {
            equals: name,
            mode: "insensitive",
          },
          NOT: {
            id,
          },
        },
      });

    if (duplicate) {
      return {
        success: false,
        message:
          "Un autre site porte déjà ce nom.",
      };
    }

    await prisma.site.update({
      where: {
        id,
      },
      data: {
        name,
        active,
      },
    });

    return {
      success: true,
      message:
        "Site modifié avec succès.",
    };
  } catch (error) {
    console.error(
      "updateSite error:",
      error
    );

    return {
      success: false,
      message:
        "Une erreur est survenue lors de la modification du site.",
    };
  }
}

export async function deleteSite(
  id: string
): Promise<ActionResponse> {
  const guardResult = await guard(
    ACTION.DELETE,
    RESOURCE.SITE
  );

  if (!guardResult.success) {
    return {
      success: false,
      message:
        guardResult.message,
    };
  }

  const { userId, currentTenantId } = await getSession(); if (!userId) {
    return {
      success: false,
      message:
        "Utilisateur non authentifié.",
    };
  }


  if (!currentTenantId) {
    return {
      success: false,
      message:
        "L'utilisateur n'est associé à aucun tenant.",
    };
  }

  try {


    const site =
      await prisma.site.findFirst({
        where: {
          id,
          tenantId:
            currentTenantId,
        },
      });

    if (!site) {
      return {
        success: false,
        message:
          "Site introuvable.",
      };
    }

    await prisma.site.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      message:
        "Site supprimé avec succès.",
    };
  } catch (error) {
    console.error(
      "deleteSite error:",
      error
    );

    return {
      success: false,
      message:
        "Une erreur est survenue lors de la suppression du site.",
    };
  }
}
*/

export async function importParcs(data: any) {
  try {
    const name = convertField(data.name, "string");
    const typeparcName = convertField(data.typeparcName, "string");

    if (!name || name.trim() === "") {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'name' est requis`,
        },
      ];
    }
    if (!typeparcName) {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'typeparcName' est requis`,
        },
      ];
    }

    const { currentTenantId } = await getSession();

    if (!currentTenantId) {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Aucun tenant actif pour l'import du typeparc`,
        },
      ];
    }

    const typeParc = await prisma.typeparc.findUnique({
      where: { name_tenantId: { name: typeparcName, tenantId: currentTenantId } },
    });
    if (!typeParc) {
      return [
        {
          success: false,
          data: data,
          message: `TypeParc "${typeparcName}" non trouvé`,
        },
      ];
    }

    const parc = await prisma.parc.upsert({
      where: {
        name_tenantId: {
          tenantId: currentTenantId,
          name: name,
        },
      },
      update: {
        name: name,
        typeparcId: typeParc.id,
      },
      create: {
        name: name,
        typeparcId: typeParc.id,
        tenantId: currentTenantId,
      },
    });

    return [
      {
        success: true,
        data: parc,
        message: `Parc ${name} importé avec succès`,
      },
    ];
  } catch (error: any) {
    return [
      {
        success: false,
        data: data,
        message: `Erreur: ${error.message}`,
      },
    ];
  }
}