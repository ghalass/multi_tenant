"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import type { ActionResponse } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";
import { convertField } from "@/lib/convertField";

export interface searchParams {
  name?: string;
  currentPage?: number;
  itemsPerPage?: number;
}

async function getTenantId() {
  const { currentTenantId } = await getSession();
  return currentTenantId;
}

export async function getAllTypeParcs(
  filters: searchParams = {}
): Promise<ActionResponse> {
  const permission = await guard(ACTION.READ, RESOURCE.TYPEPARC);
  if (!permission.success) {
    return { data: [], success: false, message: permission.message };
  }

  const tenantId = await getTenantId();
  if (!tenantId) {
    return {
      data: [],
      success: false,
      message: "Sélectionnez un tenant avant de consulter les types de parcs.",
    };
  }

  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, active: true },
    select: { id: true },
  });

  if (!tenant) {
    return {
      data: [],
      success: false,
      message: "Le tenant sélectionné est introuvable ou désactivé.",
    };
  }

  const currentPage = Math.max(Number(filters.currentPage) || 1, 1);
  const itemsPerPage =
    Number(filters.itemsPerPage) === 0
      ? 0
      : Math.max(
          Number(filters.itemsPerPage) || PAGINATION_SETTINGS.itemsPerPage,
          1
        );
  const name = filters.name?.trim();

  const where = {
    tenantId,
    ...(name ? { name: { contains: name, mode: "insensitive" as const } } : {}),
  };

  const [typeparcs, totalItems] = await Promise.all([
    prisma.typeparc.findMany({
      where,
      orderBy: { name: "asc" },
      skip: itemsPerPage === 0 ? 0 : (currentPage - 1) * itemsPerPage,
      take: itemsPerPage === 0 ? undefined : itemsPerPage,
    }),
    prisma.typeparc.count({ where }),
  ]);

  return {
    data: typeparcs,
    success: true,
    message: "Types de parcs récupérés avec succès.",
    meta: {
      totalItems,
      totalPages: itemsPerPage === 0 ? 1 : Math.ceil(totalItems / itemsPerPage),
      currentPage,
      itemsPerPage,
    },
  };
}

export async function createTypeParc({
  name,
}: {
  name: string;
}): Promise<ActionResponse> {
  const permission = await guard(ACTION.CREATE, RESOURCE.TYPEPARC);
  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const tenantId = await getTenantId();
  if (!tenantId) {
    return { success: false, message: "Aucun tenant actif." };
  }

  const trimmedName = name?.trim();
  if (!trimmedName) {
    return { success: false, message: "Le nom du type de parc est obligatoire." };
  }

  try {
    const duplicate = await prisma.typeparc.findFirst({
      where: {
        tenantId,
        name: { equals: trimmedName, mode: "insensitive" },
      },
    });

    if (duplicate) {
      return { success: false, message: "Ce type de parc existe déjà." };
    }

    await prisma.typeparc.create({
      data: { name: trimmedName, tenantId },
    });

    return { success: true, message: "Type de parc créé avec succès." };
  } catch (error) {
    console.error("createTypeParc error:", error);
    return { success: false, message: "Erreur lors de la création du type de parc." };
  }
}

export async function updateTypeParc({
  id,
  name,
}: {
  id: string;
  name: string;
}): Promise<ActionResponse> {
  const permission = await guard(ACTION.UPDATE, RESOURCE.TYPEPARC);
  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const { userId, currentTenantId } = await getSession();
  if (!userId) {
    return { success: false, message: "Utilisateur non authentifié." };
  }
  if (!currentTenantId) {
    return { success: false, message: "Aucun tenant actif." };
  }

  const trimmedName = name?.trim();
  if (!trimmedName) {
    return { success: false, message: "Le nom du type de parc est obligatoire." };
  }

  try {
    const existing = await prisma.typeparc.findFirst({
      where: { id, tenantId: currentTenantId },
    });

    if (!existing) {
      return { success: false, message: "Type de parc introuvable." };
    }

    const duplicate = await prisma.typeparc.findFirst({
      where: {
        tenantId: currentTenantId,
        name: { equals: trimmedName, mode: "insensitive" },
        NOT: { id },
      },
    });

    if (duplicate) {
      return { success: false, message: "Un autre type de parc porte déjà ce nom." };
    }

    await prisma.typeparc.update({
      where: { id },
      data: { name: trimmedName },
    });

    return { success: true, message: "Type de parc modifié avec succès." };
  } catch (error) {
    console.error("updateTypeParc error:", error);
    return { success: false, message: "Erreur lors de la modification du type de parc." };
  }
}

export async function deleteTypeParc(id: string): Promise<ActionResponse> {
  const permission = await guard(ACTION.DELETE, RESOURCE.TYPEPARC);
  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const { userId, currentTenantId } = await getSession();
  if (!userId) {
    return { success: false, message: "Utilisateur non authentifié." };
  }
  if (!currentTenantId) {
    return { success: false, message: "Aucun tenant actif." };
  }

  try {
    const typeParc = await prisma.typeparc.findFirst({
      where: { id, tenantId: currentTenantId },
    });

    if (!typeParc) {
      return { success: false, message: "Type de parc introuvable." };
    }

    await prisma.typeparc.delete({ where: { id } });
    return { success: true, message: "Type de parc supprimé avec succès." };
  } catch (error) {
    console.error("deleteTypeParc error:", error);
    return {
      success: false,
      message: "Suppression impossible : ce type de parc est peut-être utilisé par un parc.",
    };
  }
}

export async function importTypeParcs(data: any) {
  try {
    const permission = await guard(ACTION.IMPORT, RESOURCE.TYPEPARC);
    if (!permission.success) {
      return [{ success: false, data: null, message: permission.message }];
    }

    const name = convertField(data?.name, "string");
    if (typeof name !== "string" || !name.trim()) {
      return [{ success: false, data, message: "Le champ 'name' est obligatoire." }];
    }

    const tenantId = await getTenantId();
    if (!tenantId) {
      return [{ success: false, data, message: "Aucun tenant actif pour l'import." }];
    }

    const trimmedName = name.trim();
    const typeParc = await prisma.typeparc.upsert({
      where: {
        name_tenantId: { tenantId, name: trimmedName },
      },
      update: { name: trimmedName },
      create: { name: trimmedName, tenantId },
    });

    return [{
      success: true,
      data: typeParc,
      message: `Type de parc "${trimmedName}" importé avec succès.`,
    }];
  } catch (error) {
    console.error("Erreur lors de l'import des types de parc :", error);
    return [{
      success: false,
      data,
      message: "Erreur interne lors de l'import des types de parc.",
    }];
  }
}
