"use server";

import { ACTION } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { RESOURCE } from "@/lib/constantes";
import { guard } from "@/lib/rbac/middleware";
import type { ActionResponse } from "@/lib/types/types";
import { getLubrifiantTenantId, parseDateOnly } from "@/server/lubrifiant-shared";

export type LubrifiantReportFilters = {
  du: string;
  au: string;
  typeParcId?: string;
  parcId?: string;
  typeLubrifiantId?: string;
  lubrifiantId?: string;
  enginName?: string;
  section?: string;
  imputation?: string;
};

export type LubrifiantReportOptions = {
  typeParcs: {
    id: string;
    name: string;
    parcs: { id: string; name: string }[];
  }[];
  typeLubrifiants: {
    id: string;
    name: string;
    lubrifiants: { id: string; name: string; code: string; unite: string }[];
  }[];
};

export type LubrifiantConsumptionReport = {
  period: { du: string; au: string };
  byEngin: {
    enginId: string;
    enginName: string;
    parcId: string;
    parcName: string;
    typeParcName: string;
    lubrifiantId: string;
    lubrifiantName: string;
    code: string;
    typeLubrifiantName: string;
    unite: string;
    qte: number;
  }[];
  specificByParcAndLubrifiant: {
    parcId: string;
    parcName: string;
    typeParcName: string;
    lubrifiantId: string;
    lubrifiantName: string;
    code: string;
    typeLubrifiantName: string;
    unite: string;
    qte: number;
    hrm: number;
    specific: number | null;
  }[];
};

export async function getLubrifiantReportOptions(): Promise<ActionResponse<LubrifiantReportOptions>> {
  const permission = await guard(ACTION.READ, RESOURCE.RAPPORT);
  if (!permission.success) {
    return { success: false, message: permission.message, data: [] };
  }
  const tenantId = await getLubrifiantTenantId();
  if (!tenantId) return { success: false, message: "Aucun tenant actif.", data: [] };

  const [typeParcs, typeLubrifiants] = await Promise.all([
    prisma.typeparc.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        parcs: {
          where: { tenantId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.typeLubrifiant.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        lubrifiants: {
          where: { tenantId },
          select: { id: true, name: true, code: true, unite: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    success: true,
    message: "Filtres de rapport récupérés.",
    data: [{ typeParcs, typeLubrifiants }],
  };
}

export async function getLubrifiantConsumptionReport(
  filters: LubrifiantReportFilters,
): Promise<ActionResponse<LubrifiantConsumptionReport>> {
  const permission = await guard(ACTION.READ, RESOURCE.RAPPORT);
  if (!permission.success) {
    return { success: false, message: permission.message, data: [] };
  }
  const tenantId = await getLubrifiantTenantId();
  if (!tenantId) return { success: false, message: "Aucun tenant actif.", data: [] };

  const du = parseDateOnly(filters.du);
  const au = parseDateOnly(filters.au);
  if (!du || !au) return { success: false, message: "Les dates de la période doivent être valides.", data: [] };
  if (du > au) return { success: false, message: "La date « du » doit être antérieure ou égale à « au ».", data: [] };

  const where = {
    tenantId,
    du: { gte: du },
    au: { lte: au },
    ...(filters.parcId || filters.typeParcId || filters.enginName?.trim()
      ? {
          engin: {
            is: {
              ...(filters.enginName?.trim()
                ? { name: { contains: filters.enginName.trim(), mode: "insensitive" as const } }
                : {}),
              ...(filters.parcId || filters.typeParcId
                ? {
                    parc: {
                      is: {
                        ...(filters.parcId ? { id: filters.parcId } : {}),
                        ...(filters.typeParcId ? { typeparcId: filters.typeParcId } : {}),
                      },
                    },
                  }
                : {}),
            },
          },
        }
      : {}),
    ...(filters.typeLubrifiantId
      ? { lubrifiant: { is: { typeLubrifiantId: filters.typeLubrifiantId } } }
      : {}),
    ...(filters.lubrifiantId ? { lubrifiantId: filters.lubrifiantId } : {}),
    ...(filters.section?.trim()
      ? { section: { contains: filters.section.trim(), mode: "insensitive" as const } }
      : {}),
    ...(filters.imputation?.trim()
      ? { imputation: { contains: filters.imputation.trim(), mode: "insensitive" as const } }
      : {}),
  };

  const entries = await prisma.saisieLubrifiant.findMany({
    where,
    select: {
      qte: true,
      enginId: true,
      engin: {
        select: {
          id: true,
          name: true,
          parcId: true,
          parc: {
            select: {
              id: true,
              name: true,
              typeparc: { select: { name: true } },
            },
          },
        },
      },
      lubrifiantId: true,
      lubrifiant: {
        select: {
          id: true,
          name: true,
          code: true,
          unite: true,
          typeLubrifiant: { select: { name: true } },
        },
      },
    },
  });

  const enginGroups = new Map<string, {
    enginId: string;
    enginName: string;
    parcId: string;
    parcName: string;
    typeParcName: string;
    lubrifiantId: string;
    lubrifiantName: string;
    code: string;
    typeLubrifiantName: string;
    unite: string;
    qte: number;
  }>();
  const relevantEnginsByGroup = new Map<string, Set<string>>();
  const specificGroups = new Map<string, {
    parcId: string;
    parcName: string;
    typeParcName: string;
    lubrifiantId: string;
    lubrifiantName: string;
    code: string;
    typeLubrifiantName: string;
    unite: string;
    qte: number;
  }>();

  for (const entry of entries) {
    const key = `${entry.enginId}\u0000${entry.lubrifiantId}`;
    const currentEngin = enginGroups.get(key);
    if (currentEngin) {
      currentEngin.qte += entry.qte;
    } else {
      enginGroups.set(key, {
        enginId: entry.engin.id,
        enginName: entry.engin.name,
        parcId: entry.engin.parc.id,
        parcName: entry.engin.parc.name,
        typeParcName: entry.engin.parc.typeparc.name,
        lubrifiantId: entry.lubrifiant.id,
        lubrifiantName: entry.lubrifiant.name,
        code: entry.lubrifiant.code,
        typeLubrifiantName: entry.lubrifiant.typeLubrifiant.name,
        unite: entry.lubrifiant.unite,
        qte: entry.qte,
      });
    }

    const parcKey = `${entry.engin.parcId}\u0000${entry.lubrifiantId}`;
    const parcGroup = specificGroups.get(parcKey);
    if (parcGroup) {
      parcGroup.qte += entry.qte;
    } else {
      specificGroups.set(parcKey, {
        parcId: entry.engin.parc.id,
        parcName: entry.engin.parc.name,
        typeParcName: entry.engin.parc.typeparc.name,
        lubrifiantId: entry.lubrifiant.id,
        lubrifiantName: entry.lubrifiant.name,
        code: entry.lubrifiant.code,
        typeLubrifiantName: entry.lubrifiant.typeLubrifiant.name,
        unite: entry.lubrifiant.unite,
        qte: entry.qte,
      });
    }
    if (!relevantEnginsByGroup.has(parcKey)) {
      relevantEnginsByGroup.set(parcKey, new Set());
    }
    relevantEnginsByGroup.get(parcKey)?.add(entry.enginId);
  }

  const relevantEnginIds = [...new Set(entries.map((entry) => entry.enginId))];
  const hrmTotals = relevantEnginIds.length
    ? await prisma.saisiehrm.groupBy({
        by: ["enginId"],
        where: {
          tenantId,
          enginId: { in: relevantEnginIds },
          du: { gte: du, lte: au },
        },
        _sum: { hrm: true },
      })
    : [];
  const hrmByEngin = new Map(
    hrmTotals.map((item) => [item.enginId, item._sum.hrm ?? 0]),
  );

  const specificByParcAndLubrifiant = [...specificGroups.entries()].map(
    ([key, group]) => {
      const hrm = [...(relevantEnginsByGroup.get(key) ?? [])].reduce(
        (sum, enginId) => sum + (hrmByEngin.get(enginId) ?? 0),
        0,
      );
      return {
        ...group,
        hrm,
        specific: hrm > 0 ? group.qte / hrm : null,
      };
    },
  );

  const report: LubrifiantConsumptionReport = {
    period: { du: filters.du, au: filters.au },
    byEngin: [...enginGroups.values()].sort(
      (a, b) =>
        a.parcName.localeCompare(b.parcName) ||
        a.enginName.localeCompare(b.enginName) ||
        a.lubrifiantName.localeCompare(b.lubrifiantName),
    ),
    specificByParcAndLubrifiant: specificByParcAndLubrifiant.sort(
      (a, b) =>
        a.parcName.localeCompare(b.parcName) ||
        a.lubrifiantName.localeCompare(b.lubrifiantName),
    ),
  };
  return { success: true, message: "Rapports calculés.", data: [report] };
}
