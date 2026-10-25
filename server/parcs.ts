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

  const { currentTenantId } = await getSession();

  if (!currentTenantId) {
    return {
      data: [],
      success: false,
      message: "Sélectionnez un tenant avant de consulter les parcs.",
    };
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      id: currentTenantId,
      active: true,
    },
    select: {
      id: true,
    },
  });

  if (!tenant) {
    return {
      data: [],
      success: false,
      message: "Le tenant sélectionné est introuvable ou désactivé.",
    };
  }

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

export async function importParcs(data: any) {
  try {
    const permission = await guard(ACTION.IMPORT, RESOURCE.PARC);

    if (!permission.success) {
      return [{
        success: false,
        data: null,
        message: permission.message,
      }];
    }

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
  } catch (error: unknown) {
    console.error("Erreur lors de l'import des parcs :", error);

    return [
      {
        success: false,
        data: data,
        message:
          "Une erreur interne est survenue lors de l'import des parcs. Vérifiez les données et consultez les journaux serveur si le problème persiste.",
      },
    ];
  }
}