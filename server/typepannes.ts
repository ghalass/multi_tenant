"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { convertField } from "@/lib/convertField";
import { ACTION } from "@/lib/enums";
import { PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";
import { guard } from "@/lib/rbac/middleware";

export interface TypePannesSearchParams {
  name?: string;
  currentPage?: number;
  itemsPerPage?: number;
}

type TypePanneInput = {
  name: string;
  description?: string | null;
};

async function getCurrentTypePanneTenant(): Promise<{ id: string; } | null> {
  const { currentTenantId } = await getSession();

  if (!currentTenantId) return null;

  return prisma.tenant.findFirst({
    where: { id: currentTenantId, active: true },
    select: { id: true },
  });
}

export async function getAllTypePannes(
  filters: TypePannesSearchParams = {},
): Promise<{ data: never[]; success: boolean; message: string; meta?: undefined; } | { data: ({ tenant: { name: string; }; } & { id: string; name: string; description: string | null; tenantId: string; })[]; success: boolean; message: string; meta: { totalItems: number; totalPages: number; currentPage: number; itemsPerPage: number; }; }> {
  const permission = await guard(ACTION.READ, RESOURCE.TYPEPANNE);

  if (!permission.success) {
    return { data: [], success: false, message: permission.message };
  }

  const tenant = await getCurrentTypePanneTenant();

  if (!tenant) {
    return {
      data: [],
      success: false,
      message: "Sélectionnez un tenant actif.",
    };
  }

  const currentPage = Math.max(Number(filters.currentPage) || 1, 1);
  const itemsPerPage =
    Number(filters.itemsPerPage) === 0
      ? 0
      : Math.max(
        Number(filters.itemsPerPage) ||
        PAGINATION_SETTINGS.itemsPerPage,
        1,
      );

  const name = filters.name?.trim();

  const where = {
    tenantId: tenant.id,
    ...(name
      ? { name: { contains: name, mode: "insensitive" as const } }
      : {}),
  };

  const [typepannes, totalItems] = await Promise.all([
    prisma.typepanne.findMany({
      where,
      orderBy: { name: "asc" },
      skip: itemsPerPage === 0 ? 0 : (currentPage - 1) * itemsPerPage,
      take: itemsPerPage === 0 ? undefined : itemsPerPage,
      include: { tenant: { select: { name: true } } },
    }),
    prisma.typepanne.count({ where }),
  ]);

  return {
    data: typepannes,
    success: true,
    message: "Types de pannes récupérés avec succès.",
    meta: {
      totalItems,
      totalPages:
        itemsPerPage === 0 ? 1 : Math.ceil(totalItems / itemsPerPage),
      currentPage,
      itemsPerPage,
    },
  };
}

export async function createTypePanne(input: TypePanneInput): Promise<{ success: boolean; message: string; }> {
  const permission = await guard(ACTION.CREATE, RESOURCE.TYPEPANNE);
  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const tenant = await getCurrentTypePanneTenant();
  if (!tenant) {
    return { success: false, message: "Aucun tenant actif." };
  }

  const name = input.name?.trim();
  const description = input.description?.trim() || null;

  if (!name) {
    return { success: false, message: "Le nom est obligatoire." };
  }

  try {
    const duplicate = await prisma.typepanne.findFirst({
      where: {
        tenantId: tenant.id,
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (duplicate) {
      return { success: false, message: "Ce type de panne existe déjà." };
    }

    await prisma.typepanne.create({
      data: { name, description, tenantId: tenant.id },
    });

    return { success: true, message: "Type de panne créé avec succès." };
  } catch (error) {
    console.error("createTypePanne error:", error);
    return {
      success: false,
      message: "Erreur lors de la création du type de panne.",
    };
  }
}

export async function updateTypePanne(
  input: TypePanneInput & { id: string },
): Promise<{ success: boolean; message: string; }> {
  const permission = await guard(ACTION.UPDATE, RESOURCE.TYPEPANNE);
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

  const name = input.name?.trim();
  const description = input.description?.trim() || null;

  if (!name) {
    return { success: false, message: "Le nom est obligatoire." };
  }

  try {
    const existing = await prisma.typepanne.findFirst({
      where: { id: input.id, tenantId: currentTenantId },
    });

    if (!existing) {
      return { success: false, message: "Type de panne introuvable." };
    }

    const duplicate = await prisma.typepanne.findFirst({
      where: {
        tenantId: currentTenantId,
        name: { equals: name, mode: "insensitive" },
        NOT: { id: input.id },
      },
    });

    if (duplicate) {
      return {
        success: false,
        message: "Un autre type de panne porte déjà ce nom.",
      };
    }

    await prisma.typepanne.update({
      where: { id: input.id },
      data: { name, description },
    });

    return { success: true, message: "Type de panne modifié avec succès." };
  } catch (error) {
    console.error("updateTypePanne error:", error);
    return {
      success: false,
      message: "Erreur lors de la modification du type de panne.",
    };
  }
}

export async function deleteTypePanne(id: string): Promise<{ success: boolean; message: string; }> {
  const permission = await guard(ACTION.DELETE, RESOURCE.TYPEPANNE);
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
    const existing = await prisma.typepanne.findFirst({
      where: { id, tenantId: currentTenantId },
    });

    if (!existing) {
      return { success: false, message: "Type de panne introuvable." };
    }

    await prisma.typepanne.delete({ where: { id } });

    return { success: true, message: "Type de panne supprimé avec succès." };
  } catch (error) {
    console.error("deleteTypePanne error:", error);
    return {
      success: false,
      message:
        "Suppression impossible : ce type de panne est peut-être utilisé par une panne.",
    };
  }
}

export async function importTypePannes(data: Record<string, unknown>): Promise<{ success: boolean; data: null; message: string; }[] | { success: boolean; data: Record<string, unknown>; message: string; }[] | { success: boolean; data: { id: string; name: string; tenantId: string; description: string | null; }; message: string; }[]> {
  try {
    const permission = await guard(ACTION.IMPORT, RESOURCE.TYPEPANNE);

    if (!permission.success) {
      return [{
        success: false,
        data: null,
        message: permission.message,
      }];
    }

    const { currentTenantId } = await getSession();
    if (!currentTenantId) {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Aucun tenant actif pour l'import`,
        },
      ];
    }
    // 
    const name = convertField(data.name, "string");
    const description = convertField(data.description, "string") ?? "";

    if (!name || name.trim() === "") {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'name' est requis`,
        },
      ];
    }

    const newData = {
      name,
      description,
      tenantId: currentTenantId
    };

    const typepanne = await prisma.typepanne.upsert({
      where: { name_tenantId: { name, tenantId: currentTenantId } },
      update: newData,
      create: newData,
    });

    return [
      {
        success: true,
        data: typepanne,
        message: `typepanne ${name} importé avec succès`,
      },
    ];
  } catch (error: unknown) {
    console.error(
      "Erreur lors de l'import des types de panne :",
      error,
    );

    return [
      {
        success: false,
        data: data,
        message:
          "Une erreur interne est survenue lors de l'import des types de panne. Vérifiez les données et consultez les journaux serveur si le problème persiste.",
      },
    ];
  }
}