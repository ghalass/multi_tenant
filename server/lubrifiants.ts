"use server";

import { ACTION } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { RESOURCE } from "@/lib/constantes";
import { guard } from "@/lib/rbac/middleware";
import type { ActionResponse } from "@/lib/types/types";
import { getLubrifiantTenantId, prismaErrorCode } from "@/server/lubrifiant-shared";

export type LubrifiantItem = {
  id: string;
  name: string;
  code: string;
  unite: string;
  typeLubrifiant: { id: string; name: string };
  parcs: {
    parc: {
      id: string;
      name: string;
      typeparc: { id: string; name: string };
    };
  }[];
  _count: { saisies: number };
};

export type LubrifiantOptions = {
  types: { id: string; name: string }[];
  parcs: { id: string; name: string; typeparc: { id: string; name: string } }[];
};

export type LubrifiantInput = {
  name: string;
  code: string;
  unite: string;
  typeLubrifiantId: string;
  parcIds: string[];
};

async function permission(action: ACTION): Promise<{ success: false; message: string } | null> {
  const result = await guard(action, RESOURCE.LUBRIFIANT);
  return result.success
    ? null
    : { success: false, message: result.message };
}

export async function getAllLubrifiants(): Promise<ActionResponse<LubrifiantItem>> {
  const denied = await permission(ACTION.READ);
  if (denied) return denied;
  const tenantId = await getLubrifiantTenantId();
  if (!tenantId) return { success: false, message: "Aucun tenant actif.", data: [] };

  const data = await prisma.lubrifiant.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: {
      typeLubrifiant: { select: { id: true, name: true } },
      parcs: {
        where: { tenantId },
        include: {
          parc: {
            select: {
              id: true,
              name: true,
              typeparc: { select: { id: true, name: true } },
            },
          },
        },
      },
      _count: { select: { saisies: true } },
    },
  });
  return { success: true, message: "Lubrifiants récupérés.", data };
}

export async function getLubrifiantOptions(): Promise<ActionResponse<LubrifiantOptions>> {
  const denied = await permission(ACTION.READ);
  if (denied) return denied;
  const tenantId = await getLubrifiantTenantId();
  if (!tenantId) return { success: false, message: "Aucun tenant actif.", data: [] };

  const [types, parcs] = await Promise.all([
    prisma.typeLubrifiant.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.parc.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        typeparc: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);
  return { success: true, message: "Options récupérées.", data: [{ types, parcs }] };
}

async function validateInput(input: LubrifiantInput, tenantId: string): Promise<string | null> {
  if (!input.name.trim() || !input.code.trim() || !input.unite.trim()) {
    return "Le nom, le code et l’unité sont obligatoires.";
  }
  if (!input.typeLubrifiantId) return "Le type de lubrifiant est obligatoire.";
  const type = await prisma.typeLubrifiant.findFirst({
    where: { id: input.typeLubrifiantId, tenantId },
    select: { id: true },
  });
  if (!type) return "Le type de lubrifiant sélectionné est introuvable.";

  const parcIds = [...new Set(input.parcIds.filter(Boolean))];
  if (parcIds.length === 0) return "Associez le lubrifiant à au moins un parc.";
  const parcs = await prisma.parc.findMany({
    where: { tenantId, id: { in: parcIds } },
    select: { id: true },
  });
  if (parcs.length !== parcIds.length) {
    return "Un ou plusieurs parcs sélectionnés n’appartiennent pas au tenant actif.";
  }
  return null;
}

async function persistLubrifiant(
  input: LubrifiantInput,
  tenantId: string,
  id?: string,
): Promise<ActionResponse> {
  const validation = await validateInput(input, tenantId);
  if (validation) return { success: false, message: validation };
  const duplicate = await prisma.lubrifiant.findFirst({
    where: {
      tenantId,
      ...(id ? { id: { not: id } } : {}),
      name: { equals: input.name.trim(), mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplicate) {
    return { success: false, message: "Ce nom de lubrifiant existe déjà dans ce tenant." };
  }

  const data = {
    name: input.name.trim(),
    code: input.code.trim(),
    unite: input.unite.trim(),
    typeLubrifiantId: input.typeLubrifiantId,
    tenantId,
  };
  const parcIds = [...new Set(input.parcIds.filter(Boolean))];

  try {
    await prisma.$transaction(async (tx) => {
      let lubrifiantId = id;
      if (id) {
        const owned = await tx.lubrifiant.findFirst({
          where: { id, tenantId },
          select: { id: true },
        });
        if (!owned) throw new Error("NOT_FOUND");
        await tx.lubrifiant.update({ where: { id }, data });
      } else {
        const created = await tx.lubrifiant.create({ data, select: { id: true } });
        lubrifiantId = created.id;
      }

      if (!lubrifiantId) throw new Error("L’identifiant du lubrifiant est absent.");
      await tx.lubrifiantParc.deleteMany({ where: { tenantId, lubrifiantId } });
      await tx.lubrifiantParc.createMany({
        data: parcIds.map((parcId) => ({ parcId, lubrifiantId, tenantId })),
      });
    });
    return {
      success: true,
      message: id ? "Lubrifiant modifié." : "Lubrifiant créé.",
    };
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { success: false, message: "Lubrifiant introuvable." };
    }
    if (prismaErrorCode(error) === "P2002") {
      return { success: false, message: "Ce nom de lubrifiant existe déjà dans ce tenant." };
    }
    console.error("persistLubrifiant error:", error);
    return { success: false, message: "Erreur lors de l’enregistrement du lubrifiant." };
  }
}

export async function createLubrifiant(input: LubrifiantInput): Promise<ActionResponse> {
  const denied = await permission(ACTION.CREATE);
  if (denied) return denied;
  const tenantId = await getLubrifiantTenantId();
  if (!tenantId) return { success: false, message: "Aucun tenant actif." };
  return persistLubrifiant(input, tenantId);
}

export async function updateLubrifiant(
  id: string,
  input: LubrifiantInput,
): Promise<ActionResponse> {
  const denied = await permission(ACTION.UPDATE);
  if (denied) return denied;
  const tenantId = await getLubrifiantTenantId();
  if (!tenantId) return { success: false, message: "Aucun tenant actif." };
  if (!id) return { success: false, message: "Identifiant du lubrifiant absent." };
  return persistLubrifiant(input, tenantId, id);
}

export async function deleteLubrifiant(id: string): Promise<ActionResponse> {
  const denied = await permission(ACTION.DELETE);
  if (denied) return denied;
  const tenantId = await getLubrifiantTenantId();
  if (!tenantId) return { success: false, message: "Aucun tenant actif." };

  const record = await prisma.lubrifiant.findFirst({
    where: { id, tenantId },
    select: { id: true, _count: { select: { saisies: true } } },
  });
  if (!record) return { success: false, message: "Lubrifiant introuvable." };
  if (record._count.saisies > 0) {
    return {
      success: false,
      message: "Ce lubrifiant ne peut pas être supprimé car il possède des consommations.",
    };
  }

  try {
    await prisma.$transaction([
      prisma.lubrifiantParc.deleteMany({ where: { tenantId, lubrifiantId: id } }),
      prisma.lubrifiant.delete({ where: { id } }),
    ]);
    return { success: true, message: "Lubrifiant supprimé." };
  } catch (error) {
    if (prismaErrorCode(error) === "P2003") {
      return { success: false, message: "Ce lubrifiant est encore associé à des données." };
    }
    console.error("deleteLubrifiant error:", error);
    return { success: false, message: "Erreur lors de la suppression du lubrifiant." };
  }
}
