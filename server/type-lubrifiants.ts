"use server";

import { ACTION } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { RESOURCE } from "@/lib/constantes";
import { guard } from "@/lib/rbac/middleware";
import type { ActionResponse } from "@/lib/types/types";
import { getLubrifiantTenantId, prismaErrorCode } from "@/server/lubrifiant-shared";

export type TypeLubrifiantItem = {
  id: string;
  name: string;
  _count: { lubrifiants: number };
};

async function permission(action: ACTION): Promise<{ success: false; message: string } | null> {
  const result = await guard(action, RESOURCE.TYPE_LUBRIFIANT);
  return result.success
    ? null
    : { success: false, message: result.message };
}

export async function getAllTypeLubrifiants(): Promise<ActionResponse<TypeLubrifiantItem>> {
  const denied = await permission(ACTION.READ);
  if (denied) return denied;

  const tenantId = await getLubrifiantTenantId();
  if (!tenantId) return { success: false, message: "Aucun tenant actif.", data: [] };

  const data = await prisma.typeLubrifiant.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { lubrifiants: true } },
    },
  });
  return { success: true, message: "Types de lubrifiants récupérés.", data };
}

export async function createTypeLubrifiant(name: string): Promise<ActionResponse> {
  const denied = await permission(ACTION.CREATE);
  if (denied) return denied;
  const tenantId = await getLubrifiantTenantId();
  const normalizedName = name.trim();
  if (!tenantId) return { success: false, message: "Aucun tenant actif." };
  if (!normalizedName) return { success: false, message: "Le nom est obligatoire." };

  try {
    const duplicate = await prisma.typeLubrifiant.findFirst({
      where: { tenantId, name: { equals: normalizedName, mode: "insensitive" } },
      select: { id: true },
    });
    if (duplicate) {
      return { success: false, message: "Ce type de lubrifiant existe déjà dans ce tenant." };
    }
    await prisma.typeLubrifiant.create({
      data: { name: normalizedName, tenantId },
    });
    return { success: true, message: "Type de lubrifiant créé." };
  } catch (error) {
    if (prismaErrorCode(error) === "P2002") {
      return { success: false, message: "Ce type de lubrifiant existe déjà dans ce tenant." };
    }
    console.error("createTypeLubrifiant error:", error);
    return { success: false, message: "Erreur lors de la création du type de lubrifiant." };
  }
}

export async function updateTypeLubrifiant(
  id: string,
  name: string,
): Promise<ActionResponse> {
  const denied = await permission(ACTION.UPDATE);
  if (denied) return denied;
  const tenantId = await getLubrifiantTenantId();
  const normalizedName = name.trim();
  if (!tenantId) return { success: false, message: "Aucun tenant actif." };
  if (!id || !normalizedName) {
    return { success: false, message: "L’identifiant et le nom sont obligatoires." };
  }

  try {
    const duplicate = await prisma.typeLubrifiant.findFirst({
      where: {
        tenantId,
        id: { not: id },
        name: { equals: normalizedName, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) {
      return { success: false, message: "Ce type de lubrifiant existe déjà dans ce tenant." };
    }
    const updated = await prisma.typeLubrifiant.updateMany({
      where: { id, tenantId },
      data: { name: normalizedName },
    });
    if (!updated.count) return { success: false, message: "Type de lubrifiant introuvable." };
    return { success: true, message: "Type de lubrifiant modifié." };
  } catch (error) {
    if (prismaErrorCode(error) === "P2002") {
      return { success: false, message: "Ce type de lubrifiant existe déjà dans ce tenant." };
    }
    console.error("updateTypeLubrifiant error:", error);
    return { success: false, message: "Erreur lors de la modification du type de lubrifiant." };
  }
}

export async function deleteTypeLubrifiant(id: string): Promise<ActionResponse> {
  const denied = await permission(ACTION.DELETE);
  if (denied) return denied;
  const tenantId = await getLubrifiantTenantId();
  if (!tenantId) return { success: false, message: "Aucun tenant actif." };

  const existing = await prisma.typeLubrifiant.findFirst({
    where: { id, tenantId },
    select: { id: true, _count: { select: { lubrifiants: true } } },
  });
  if (!existing) return { success: false, message: "Type de lubrifiant introuvable." };
  if (existing._count.lubrifiants) {
    return {
      success: false,
      message: "Ce type ne peut pas être supprimé tant qu’il est utilisé par des lubrifiants.",
    };
  }

  try {
    await prisma.typeLubrifiant.delete({ where: { id: existing.id } });
    return { success: true, message: "Type de lubrifiant supprimé." };
  } catch (error) {
    if (prismaErrorCode(error) === "P2003") {
      return { success: false, message: "Ce type est encore utilisé par un lubrifiant." };
    }
    console.error("deleteTypeLubrifiant error:", error);
    return { success: false, message: "Erreur lors de la suppression du type de lubrifiant." };
  }
}
