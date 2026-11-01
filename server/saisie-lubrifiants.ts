"use server";

import { ACTION } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { RESOURCE } from "@/lib/constantes";
import { guard } from "@/lib/rbac/middleware";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ActionResponse } from "@/lib/types/types";
import { getLubrifiantTenantId, parseDateOnly, prismaErrorCode } from "@/server/lubrifiant-shared";

export type SaisieLubrifiantItem = {
  id: string;
  du: Date;
  au: Date;
  section: string;
  imputation: string;
  qte: number;
  engin: {
    id: string;
    name: string;
    parc: {
      id: string;
      name: string;
      typeparc: { id: string; name: string };
    };
  };
  lubrifiant: {
    id: string;
    name: string;
    code: string;
    unite: string;
    typeLubrifiant: { id: string; name: string };
  };
};

export type SaisieLubrifiantOptions = {
  typeParcs: { id: string; name: string }[];
  parcs: { id: string; name: string; typeparcId: string }[];
  sites: { id: string; name: string; active: boolean }[];
  engins: {
    id: string;
    name: string;
    siteId: string;
    active: boolean;
    parc: { id: string; name: string; typeparc: { id: string; name: string } };
  }[];
  lubrifiants: {
    id: string;
    name: string;
    code: string;
    unite: string;
    typeLubrifiant: { id: string; name: string };
    parcs: { parcId: string }[];
  }[];
};

export type SaisieLubrifiantInput = {
  du: string;
  au: string;
  section: string;
  imputation: string;
  qte: number;
  enginId: string;
  lubrifiantId: string;
};

export type SaisieLubrifiantFilters = {
  search?: string;
  dateDu?: string;
  dateAu?: string;
  siteId?: string;
  typeParcId?: string;
  parcId?: string;
  enginId?: string;
  typeLubrifiantId?: string;
  lubrifiantId?: string;
  section?: string;
  imputation?: string;
  q?: string;
  currentPage?: string | number;
  itemsPerPage?: string | number;
};

async function permission(action: ACTION): Promise<{ success: false; message: string } | null> {
  const result = await guard(action, RESOURCE.SAISIE_LUBRIFIANT);
  return result.success
    ? null
    : { success: false, message: result.message };
}

export async function getSaisieLubrifiantOptions(): Promise<ActionResponse<SaisieLubrifiantOptions>> {
  const denied = await permission(ACTION.READ);
  if (denied) return denied;
  const tenantId = await getLubrifiantTenantId();
  if (!tenantId) return { success: false, message: "Aucun tenant actif.", data: [] };

  const [typeParcs, parcs, sites, engins, lubrifiants] = await Promise.all([
    prisma.typeparc.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.parc.findMany({
      where: { tenantId },
      select: { id: true, name: true, typeparcId: true },
      orderBy: { name: "asc" },
    }),
    prisma.site.findMany({
      where: { tenantId },
      select: { id: true, name: true, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.engin.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        siteId: true,
        active: true,
        parc: {
          select: {
            id: true,
            name: true,
            typeparc: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.lubrifiant.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        code: true,
        unite: true,
        typeLubrifiant: { select: { id: true, name: true } },
        parcs: { where: { tenantId }, select: { parcId: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    success: true,
    message: "Options récupérées.",
    data: [{ typeParcs, parcs, sites, engins, lubrifiants }],
  };
}

export async function getAllSaisieLubrifiants(
  filters: SaisieLubrifiantFilters = {},
): Promise<ActionResponse<SaisieLubrifiantItem>> {
  const denied = await permission(ACTION.READ);
  if (denied) return denied;
  const tenantId = await getLubrifiantTenantId();
  if (!tenantId) return { success: false, message: "Aucun tenant actif.", data: [] };

  const page = Math.max(Number(filters.currentPage) || 1, 1);
  const requestedSize = Math.max(Number(filters.itemsPerPage) || 20, 1);
  const dateDu = filters.dateDu ? parseDateOnly(filters.dateDu) : null;
  const dateAu = filters.dateAu ? parseDateOnly(filters.dateAu) : null;
  if ((filters.dateDu && !dateDu) || (filters.dateAu && !dateAu)) {
    return { success: false, message: "La période de recherche contient une date invalide.", data: [] };
  }
  if (dateDu && dateAu && dateDu > dateAu) {
    return { success: false, message: "La date « du » doit être antérieure ou égale à « au ».", data: [] };
  }

  const where: Prisma.SaisieLubrifiantWhereInput = {
    tenantId,
    ...(dateDu || dateAu
      ? {
          ...(dateAu ? { du: { lte: dateAu } } : {}),
          ...(dateDu ? { au: { gte: dateDu } } : {}),
        }
      : {}),
    ...(filters.siteId ||
    filters.enginId ||
    filters.parcId ||
    filters.typeParcId
      ? {
          engin: {
            is: {
              ...(filters.siteId ? { siteId: filters.siteId } : {}),
              ...(filters.enginId ? { id: filters.enginId } : {}),
              ...(filters.parcId ? { parcId: filters.parcId } : {}),
              ...(filters.typeParcId
                ? { parc: { is: { typeparcId: filters.typeParcId } } }
                : {}),
            },
          },
        }
      : {}),
    ...(filters.typeLubrifiantId
      ? { lubrifiant: { typeLubrifiantId: filters.typeLubrifiantId } }
      : {}),
    ...(filters.lubrifiantId ? { lubrifiantId: filters.lubrifiantId } : {}),
    ...(filters.section?.trim()
      ? { section: { contains: filters.section.trim(), mode: "insensitive" } }
      : {}),
    ...(filters.imputation?.trim()
      ? { imputation: { contains: filters.imputation.trim(), mode: "insensitive" } }
      : {}),
    ...(filters.q?.trim()
      ? {
          OR: [
            { section: { contains: filters.q.trim(), mode: "insensitive" } },
            { imputation: { contains: filters.q.trim(), mode: "insensitive" } },
            { engin: { is: { name: { contains: filters.q.trim(), mode: "insensitive" } } } },
            { lubrifiant: { is: { name: { contains: filters.q.trim(), mode: "insensitive" } } } },
            { lubrifiant: { is: { code: { contains: filters.q.trim(), mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [data, totalItems] = await Promise.all([
    prisma.saisieLubrifiant.findMany({
      where,
      orderBy: [{ du: "desc" }, { au: "desc" }, { id: "desc" }],
      skip: (page - 1) * requestedSize,
      take: requestedSize,
      include: {
        engin: {
          select: {
            id: true,
            name: true,
            parc: {
              select: {
                id: true,
                name: true,
                typeparc: { select: { id: true, name: true } },
              },
            },
          },
        },
        lubrifiant: {
          select: {
            id: true,
            name: true,
            code: true,
            unite: true,
            typeLubrifiant: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.saisieLubrifiant.count({ where }),
  ]);

  return {
    success: true,
    message: "Saisies lubrifiants récupérées.",
    data,
    meta: {
      totalItems,
      totalPages: Math.ceil(totalItems / requestedSize),
      currentPage: page,
      itemsPerPage: requestedSize,
    },
  };
}

async function saveSaisieLubrifiant(
  input: SaisieLubrifiantInput,
  tenantId: string,
  id?: string,
): Promise<ActionResponse> {
  const du = parseDateOnly(input.du);
  const au = parseDateOnly(input.au);
  const section = input.section.trim();
  const imputation = input.imputation.trim();
  const qte = Number(input.qte);

  if (!du || !au) return { success: false, message: "Les dates « du » et « au » doivent être valides." };
  if (du > au) return { success: false, message: "La date « du » doit être antérieure ou égale à « au »." };
  if (!section || !imputation) {
    return { success: false, message: "La section et l’imputation sont obligatoires." };
  }
  if (!Number.isFinite(qte) || qte <= 0) {
    return { success: false, message: "La quantité doit être un nombre strictement positif." };
  }
  if (!input.enginId || !input.lubrifiantId) {
    return { success: false, message: "L’engin et le lubrifiant sont obligatoires." };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const [engin, lubrifiant] = await Promise.all([
          tx.engin.findFirst({
            where: { id: input.enginId, tenantId },
            select: { id: true, parcId: true },
          }),
          tx.lubrifiant.findFirst({
            where: { id: input.lubrifiantId, tenantId },
            select: { id: true },
          }),
        ]);
        if (!engin) throw new Error("ENGIN_NOT_FOUND");
        if (!lubrifiant) throw new Error("LUBRIFIANT_NOT_FOUND");

        const association = await tx.lubrifiantParc.findFirst({
          where: {
            tenantId,
            parcId: engin.parcId,
            lubrifiantId: lubrifiant.id,
          },
          select: { parcId: true },
        });
        if (!association) throw new Error("LUBRIFIANT_NOT_ALLOWED_FOR_PARC");

        if (id) {
          const owned = await tx.saisieLubrifiant.findFirst({
            where: { id, tenantId },
            select: { id: true },
          });
          if (!owned) throw new Error("SAISIE_NOT_FOUND");
        }

        const overlapping = await tx.saisieLubrifiant.findFirst({
          where: {
            tenantId,
            enginId: engin.id,
            lubrifiantId: lubrifiant.id,
            du: { lte: au },
            au: { gte: du },
            ...(id ? { id: { not: id } } : {}),
          },
          select: { id: true, du: true, au: true },
        });
        if (overlapping) {
          throw new Error(
            `OVERLAP:${overlapping.du.toISOString().slice(0, 10)}:${overlapping.au.toISOString().slice(0, 10)}`,
          );
        }

        const data = {
          du,
          au,
          section,
          imputation,
          qte,
          enginId: engin.id,
          lubrifiantId: lubrifiant.id,
          tenantId,
        };
        if (id) {
          await tx.saisieLubrifiant.update({ where: { id }, data });
        } else {
          await tx.saisieLubrifiant.create({ data });
        }
      },
      { isolationLevel: "Serializable" },
    );
    return { success: true, message: id ? "Saisie lubrifiant modifiée." : "Saisie lubrifiant créée." };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ENGIN_NOT_FOUND") {
        return { success: false, message: "L’engin sélectionné est introuvable dans le tenant actif." };
      }
      if (error.message === "LUBRIFIANT_NOT_FOUND") {
        return { success: false, message: "Le lubrifiant sélectionné est introuvable dans le tenant actif." };
      }
      if (error.message === "LUBRIFIANT_NOT_ALLOWED_FOR_PARC") {
        return { success: false, message: "Ce lubrifiant n’est pas associé au parc de l’engin sélectionné." };
      }
      if (error.message === "SAISIE_NOT_FOUND") {
        return { success: false, message: "Saisie lubrifiant introuvable." };
      }
      if (error.message.startsWith("OVERLAP:")) {
        const [, overlapDu, overlapAu] = error.message.split(":");
        return {
          success: false,
          message: `Une consommation de ce lubrifiant existe déjà pour cet engin sur la période ${overlapDu} – ${overlapAu}. Les périodes ne doivent pas se chevaucher.`,
        };
      }
    }
    if (prismaErrorCode(error) === "P2034") {
      return {
        success: false,
        message: "Une saisie concurrente a modifié cette période. Rechargez la page puis réessayez.",
      };
    }
    if (prismaErrorCode(error) === "P2002") {
      return {
        success: false,
        message: "Une saisie identique existe déjà pour cet engin, ce lubrifiant et cette période.",
      };
    }
    console.error("saveSaisieLubrifiant error:", error);
    return { success: false, message: "Erreur lors de l’enregistrement de la consommation." };
  }
}

export async function createSaisieLubrifiant(
  input: SaisieLubrifiantInput,
): Promise<ActionResponse> {
  const result = await guard(ACTION.CREATE, RESOURCE.SAISIE_LUBRIFIANT);
  if (!result.success) return { success: false, message: result.message };
  const tenantId = await getLubrifiantTenantId();
  if (!tenantId) return { success: false, message: "Aucun tenant actif." };
  return saveSaisieLubrifiant(input, tenantId);
}

export async function updateSaisieLubrifiant(
  id: string,
  input: SaisieLubrifiantInput,
): Promise<ActionResponse> {
  const result = await guard(ACTION.UPDATE, RESOURCE.SAISIE_LUBRIFIANT);
  if (!result.success) return { success: false, message: result.message };
  const tenantId = await getLubrifiantTenantId();
  if (!tenantId) return { success: false, message: "Aucun tenant actif." };
  if (!id) return { success: false, message: "Identifiant de saisie absent." };
  return saveSaisieLubrifiant(input, tenantId, id);
}

export async function deleteSaisieLubrifiant(id: string): Promise<ActionResponse> {
  const result = await guard(ACTION.DELETE, RESOURCE.SAISIE_LUBRIFIANT);
  if (!result.success) return { success: false, message: result.message };
  const tenantId = await getLubrifiantTenantId();
  if (!tenantId) return { success: false, message: "Aucun tenant actif." };

  const deleted = await prisma.saisieLubrifiant.deleteMany({
    where: { id, tenantId },
  });
  return deleted.count
    ? { success: true, message: "Saisie lubrifiant supprimée." }
    : { success: false, message: "Saisie lubrifiant introuvable." };
}
