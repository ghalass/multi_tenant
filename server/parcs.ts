
"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import type { ActionResponse } from "@/lib/types/types";
import { getSession } from "@/lib/auth";
import { PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";
import { convertField } from "@/lib/convertField";

export interface SearchParamsParcs {
  name?: string;
  currentPage?: number | string;
  itemsPerPage?: number | string;
}

async function getTenantId() {
  const { currentTenantId } = await getSession();

  if (!currentTenantId) return null;

  const tenant = await prisma.tenant.findFirst({
    where: { id: currentTenantId, active: true },
    select: { id: true },
  });

  return tenant?.id ?? null;
}

export async function getAllParcs(
  filters: SearchParamsParcs = {}
): Promise<ActionResponse> {
  const permission = await guard(ACTION.READ, RESOURCE.PARC);

  if (!permission.success) {
    return { success: false, message: permission.message, data: [] };
  }

  const tenantId = await getTenantId();

  if (!tenantId) {
    return {
      success: false,
      message: "Sélectionnez un tenant actif.",
      data: [],
    };
  }

  const currentPage = Math.max(Number(filters.currentPage) || 1, 1);
  const requestedItems = filters.itemsPerPage === 0 ||
    filters.itemsPerPage === "0"
    ? 0
    : Math.max(
      Number(filters.itemsPerPage) ||
      PAGINATION_SETTINGS.itemsPerPage,
      1
    );

  const isUnpaged = requestedItems === 0;
  const itemsPerPage = requestedItems;

  const where: any = { tenantId };

  const name = filters.name?.trim();

  if (name) {
    where.name = { contains: name, mode: "insensitive" };
  }

  const [parcs, totalItems] = await Promise.all([
    prisma.parc.findMany({
      where,
      orderBy: { name: "asc" },
      skip: isUnpaged ? 0 : (currentPage - 1) * itemsPerPage,
      take: isUnpaged ? undefined : itemsPerPage,
      include: {
        typeparc: { select: { id: true, name: true } },
        tenant: { select: { id: true, name: true } },
      },
    }),
    prisma.parc.count({ where }),
  ]);

  return {
    success: true,
    message: "Données récupérées avec succès.",
    data: parcs,
    meta: {
      totalItems,
      totalPages: isUnpaged
        ? 1
        : Math.ceil(totalItems / itemsPerPage),
      currentPage,
      itemsPerPage,
    },
  };
}

export async function getParcTypeOptions() {
  const permission = await guard(ACTION.READ, RESOURCE.PARC);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
      data: [],
    };
  }

  const tenantId = await getTenantId();

  if (!tenantId) {
    return {
      success: false,
      message: "Sélectionnez un tenant actif.",
      data: [],
    };
  }

  const data = await prisma.typeparc.findMany({
    where: { tenantId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return { success: true, message: "", data };
}

export async function createParc(values: {
  name: string;
  typeparcId: string;
}): Promise<ActionResponse> {
  const permission = await guard(ACTION.CREATE, RESOURCE.PARC);

  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const tenantId = await getTenantId();

  if (!tenantId) {
    return { success: false, message: "Aucun tenant actif." };
  }

  const name = values.name.trim();
  const typeparcId = values.typeparcId;

  if (!name || !typeparcId) {
    return {
      success: false,
      message: "Le nom et le type de parc sont obligatoires.",
    };
  }

  try {
    const typeparc = await prisma.typeparc.findFirst({
      where: { id: typeparcId, tenantId },
      select: { id: true },
    });

    if (!typeparc) {
      return {
        success: false,
        message: "Le type de parc sélectionné est invalide.",
      };
    }

    const duplicate = await prisma.parc.findFirst({
      where: {
        tenantId,
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (duplicate) {
      return { success: false, message: "Ce parc existe déjà." };
    }

    await prisma.parc.create({
      data: { name, typeparcId, tenantId },
    });

    return { success: true, message: "Parc créé avec succès." };
  } catch (error) {
    console.error("createParc error:", error);

    return {
      success: false,
      message: "Erreur lors de la création du parc.",
    };
  }
}

export async function updateParc(values: {
  id: string;
  name: string;
  typeparcId: string;
}): Promise<ActionResponse> {
  const permission = await guard(ACTION.UPDATE, RESOURCE.PARC);

  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const tenantId = await getTenantId();

  if (!tenantId) {
    return { success: false, message: "Aucun tenant actif." };
  }

  const name = values.name.trim();

  if (!values.id || !name || !values.typeparcId) {
    return {
      success: false,
      message: "Tous les champs sont obligatoires.",
    };
  }

  try {
    const parc = await prisma.parc.findFirst({
      where: { id: values.id, tenantId },
      select: { id: true },
    });

    if (!parc) {
      return { success: false, message: "Parc introuvable." };
    }

    const typeparc = await prisma.typeparc.findFirst({
      where: { id: values.typeparcId, tenantId },
      select: { id: true },
    });

    if (!typeparc) {
      return {
        success: false,
        message: "Le type de parc sélectionné est invalide.",
      };
    }

    const duplicate = await prisma.parc.findFirst({
      where: {
        tenantId,
        name: { equals: name, mode: "insensitive" },
        NOT: { id: values.id },
      },
    });

    if (duplicate) {
      return {
        success: false,
        message: "Un autre parc porte déjà ce nom.",
      };
    }

    await prisma.parc.update({
      where: { id: values.id },
      data: { name, typeparcId: values.typeparcId },
    });

    return { success: true, message: "Parc modifié avec succès." };
  } catch (error) {
    console.error("updateParc error:", error);

    return {
      success: false,
      message: "Erreur lors de la modification du parc.",
    };
  }
}

export async function deleteParc(id: string): Promise<ActionResponse> {
  const permission = await guard(ACTION.DELETE, RESOURCE.PARC);

  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const tenantId = await getTenantId();

  if (!tenantId) {
    return { success: false, message: "Aucun tenant actif." };
  }

  try {
    const parc = await prisma.parc.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!parc) {
      return { success: false, message: "Parc introuvable." };
    }

    await prisma.parc.delete({ where: { id } });

    return { success: true, message: "Parc supprimé avec succès." };
  } catch (error) {
    console.error("deleteParc error:", error);

    return {
      success: false,
      message:
        "Suppression impossible : ce parc est peut-être utilisé par des engins, des pannes ou des objectifs.",
    };
  }
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
    const tenantId = await getTenantId();

    if (!name?.trim() || !typeparcName || !tenantId) {
      return [{
        success: false,
        data,
        message: "Nom, type de parc et tenant actif obligatoires.",
      }];
    }

    const typeparc = await prisma.typeparc.findFirst({
      where: {
        name: typeparcName,
        tenantId,
      },
    });

    if (!typeparc) {
      return [{
        success: false,
        data,
        message: `Type de parc "${typeparcName}" introuvable.`,
      }];
    }

    const parc = await prisma.parc.upsert({
      where: {
        name_tenantId: { name, tenantId },
      },
      update: { typeparcId: typeparc.id },
      create: { name, typeparcId: typeparc.id, tenantId },
    });

    return [{
      success: true,
      data: parc,
      message: `Parc ${name} importé avec succès.`,
    }];
  } catch (error) {
    console.error("importParcs error:", error);

    return [{
      success: false,
      data,
      message: "Erreur lors de l'importation du parc.",
    }];
  }
}
