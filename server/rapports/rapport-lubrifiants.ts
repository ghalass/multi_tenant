"use server";

import { ACTION } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { RESOURCE } from "@/lib/constantes";
import { guard } from "@/lib/rbac/middleware";
import type { ActionResponse } from "@/lib/types/types";
import {
  getLubrifiantObjectiveField,
  getLubrifiantTenantId,
  parseDateOnly,
} from "@/server/lubrifiant-shared";

export type LubrifiantReportFilters = {
  du: string;
  au: string;
  typeParcId?: string;
  parcId?: string;
  siteId?: string;
  enginId?: string;
  typeLubrifiantId?: string;
  lubrifiantId?: string;
  section?: string;
  imputation?: string;
};

export type LubrifiantReportOptions = {
  typeParcs: {
    id: string;
    name: string;
    parcs: {
      id: string;
      name: string;
      engins: { id: string; name: string }[];
    }[];
  }[];
  typeLubrifiants: {
    id: string;
    name: string;
    lubrifiants: { id: string; name: string; code: string; unite: string }[];
  }[];
  sites: { id: string; name: string }[];
};

export type LubrifiantConsumptionReport = {
  period: { du: string; au: string };
  specificiteByParc: {
    parcId: string;
    parcName: string;
    gasoil: LubrifiantParcSpecificityMetric[];
    huile: LubrifiantParcSpecificityMetric[];
    graisse: LubrifiantParcSpecificityMetric[];
  }[];
  globalByParcByUnit: {
    unite: string;
    qte: number;
    hrm: number;
    specific: number | null;
  }[];
  byParc: {
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
  byEngin: {
    enginId: string;
    enginName: string;
    parcId: string;
    parcName: string;
    typeParcName: string;
    siteName: string;
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
  specificByEngin: {
    enginId: string;
    enginName: string;
    siteName: string;
    parcId: string;
    parcName: string;
    typeParcName: string;
    typeLubrifiantId: string;
    typeLubrifiantName: string;
    unite: string;
    qte: number;
    hrm: number;
    specific: number | null;
    objectif: number | null;
    ecart: number | null;
  }[];
};

export type LubrifiantParcSpecificityMetric = {
  unite: string;
  qte: number;
  hrm: number;
  specific: number | null;
  objectif: number | null;
  ecart: number | null;
};

function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function getSpecificiteByParc(
  tenantId: string,
  typeParcId: string,
  filters: LubrifiantReportFilters,
  du: Date,
  au: Date,
): Promise<LubrifiantConsumptionReport["specificiteByParc"]> {
  const [parcs, types] = await Promise.all([
    prisma.parc.findMany({
      where: { tenantId, typeparcId: typeParcId },
      select: {
        id: true,
        name: true,
        engins: {
          where: {
            tenantId,
            active: true,
            ...(filters.siteId ? { siteId: filters.siteId } : {}),
          },
          select: { id: true, siteId: true },
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
          select: { unite: true },
        },
      },
    }),
  ]);
  const fieldByTypeId = new Map(
    types.flatMap((type) => {
      const field = getLubrifiantObjectiveField(type.name);
      return field ? [[type.id, field] as const] : [];
    }),
  );
  const parcsById = new Map(parcs.map((parc) => [parc.id, parc]));
  const relevantParcIds = parcs.map((parc) => parc.id);
  const entries = relevantParcIds.length && fieldByTypeId.size
    ? await prisma.saisieLubrifiant.findMany({
        where: {
          tenantId,
          du: { gte: du },
          au: { lte: au },
          engin: {
            is: {
              tenantId,
              parcId: { in: relevantParcIds },
              ...(filters.siteId ? { siteId: filters.siteId } : {}),
            },
          },
          lubrifiant: {
            is: {
              tenantId,
              typeLubrifiantId: { in: [...fieldByTypeId.keys()] },
            },
          },
          ...(filters.section?.trim()
            ? { section: { contains: filters.section.trim(), mode: "insensitive" as const } }
            : {}),
          ...(filters.imputation?.trim()
            ? { imputation: { contains: filters.imputation.trim(), mode: "insensitive" as const } }
            : {}),
        },
        select: {
          qte: true,
          enginId: true,
          engin: { select: { parcId: true } },
          lubrifiant: {
            select: {
              unite: true,
              typeLubrifiantId: true,
            },
          },
        },
      })
    : [];
  const enginIds = [...new Set(entries.map((entry) => entry.enginId))];
  const [hrmTotals, objectives] = await Promise.all([
    enginIds.length
      ? prisma.saisiehrm.groupBy({
          by: ["enginId"],
          where: {
            tenantId,
            enginId: { in: enginIds },
            du: { gte: du, lte: au },
          },
          _sum: { hrm: true },
        })
      : Promise.resolve([]),
    relevantParcIds.length
      ? prisma.objectif.findMany({
          where: {
            tenantId,
            annee: au.getUTCFullYear(),
            parcId: { in: relevantParcIds },
            siteId: {
              in: [...new Set(parcs.flatMap((parc) => parc.engins.map((engin) => engin.siteId)))],
            },
          },
          select: {
            parcId: true,
            siteId: true,
            spe_huile: true,
            spe_go: true,
            spe_graisse: true,
          },
        })
      : Promise.resolve([]),
  ]);
  const hrmByEngin = new Map(
    hrmTotals.map((item) => [item.enginId, item._sum.hrm ?? 0]),
  );
  const groups = new Map<
    string,
    {
      parcId: string;
      field: "spe_huile" | "spe_go" | "spe_graisse";
      unite: string;
      qte: number;
      enginIds: Set<string>;
    }
  >();
  for (const entry of entries) {
    const field = fieldByTypeId.get(entry.lubrifiant.typeLubrifiantId);
    if (!field) continue;
    const key = `${entry.engin.parcId}\u0000${field}\u0000${entry.lubrifiant.unite}`;
    const group = groups.get(key);
    if (group) {
      group.qte += entry.qte;
      group.enginIds.add(entry.enginId);
    } else {
      groups.set(key, {
        parcId: entry.engin.parcId,
        field,
        unite: entry.lubrifiant.unite,
        qte: entry.qte,
        enginIds: new Set([entry.enginId]),
      });
    }
  }
  const fields = ["spe_go", "spe_huile", "spe_graisse"] as const;
  for (const parc of parcs) {
    for (const field of fields) {
      const units = [
        ...new Set(
          types
            .filter((type) => fieldByTypeId.get(type.id) === field)
            .flatMap((type) => type.lubrifiants.map((lubrifiant) => lubrifiant.unite)),
        ),
      ];
      for (const unite of units.length ? units : [""]) {
        const key = `${parc.id}\u0000${field}\u0000${unite}`;
        if (!groups.has(key)) {
          groups.set(key, {
            parcId: parc.id,
            field,
            unite,
            qte: 0,
            enginIds: new Set(),
          });
        }
      }
    }
  }
  const objectivesByParc = new Map<string, typeof objectives>();
  for (const objective of objectives) {
    const parcObjectives = objectivesByParc.get(objective.parcId) ?? [];
    parcObjectives.push(objective);
    objectivesByParc.set(objective.parcId, parcObjectives);
  }
  const metricsByParc = new Map<
    string,
    LubrifiantParcSpecificityMetric & { field: "spe_huile" | "spe_go" | "spe_graisse" }
  >();
  for (const group of groups.values()) {
    const hrm = [...group.enginIds].reduce(
      (sum, enginId) => sum + (hrmByEngin.get(enginId) ?? 0),
      0,
    );
    const parc = parcsById.get(group.parcId);
    const siteIds = new Set(parc?.engins.map((engin) => engin.siteId) ?? []);
    const objectiveValues = (objectivesByParc.get(group.parcId) ?? [])
      .filter((objective) => siteIds.has(objective.siteId))
      .map((objective) => objective[group.field])
      .filter((value): value is number => value !== null && Number.isFinite(value));
    const objectif = objectiveValues.length
      ? roundToTwo(objectiveValues.reduce((sum, value) => sum + value, 0) / objectiveValues.length)
      : null;
    const specific = hrm > 0 ? roundToTwo(group.qte / hrm) : null;
    const metric = {
      field: group.field,
      unite: group.unite,
      qte: roundToTwo(group.qte),
      hrm: roundToTwo(hrm),
      specific,
      objectif,
      ecart: specific !== null && objectif !== null
        ? roundToTwo(specific - objectif)
        : null,
    };
    metricsByParc.set(`${group.parcId}\u0000${group.field}\u0000${group.unite}`, metric);
  }

  return parcs.map((parc) => {
    const metrics = [...metricsByParc.entries()]
      .filter(([key]) => key.startsWith(`${parc.id}\u0000`))
      .map(([, metric]) => metric);
    return {
      parcId: parc.id,
      parcName: parc.name,
      gasoil: metrics.filter((metric) => metric.field === "spe_go"),
      huile: metrics.filter((metric) => metric.field === "spe_huile"),
      graisse: metrics.filter((metric) => metric.field === "spe_graisse"),
    };
  });
}

export async function getLubrifiantReportOptions(): Promise<ActionResponse<LubrifiantReportOptions>> {
  const permission = await guard(ACTION.READ, RESOURCE.RAPPORT);
  if (!permission.success) {
    return { success: false, message: permission.message, data: [] };
  }
  const tenantId = await getLubrifiantTenantId();
  if (!tenantId) return { success: false, message: "Aucun tenant actif.", data: [] };

  const [typeParcs, typeLubrifiants, sites] = await Promise.all([
    prisma.typeparc.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        parcs: {
          where: { tenantId },
          select: {
            id: true,
            name: true,
            engins: {
              where: { tenantId },
              select: { id: true, name: true },
              orderBy: { name: "asc" },
            },
          },
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
    prisma.site.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    success: true,
    message: "Filtres de rapport récupérés.",
    data: [{ typeParcs, typeLubrifiants, sites }],
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
  if (!filters.parcId || !filters.typeLubrifiantId) {
    return {
      success: false,
      message: "Sélectionnez un parc et un type de lubrifiant pour générer le rapport.",
      data: [],
    };
  }

  const [parc, typeLubrifiant] = await Promise.all([
    prisma.parc.findFirst({
      where: {
        id: filters.parcId,
        tenantId,
        ...(filters.typeParcId ? { typeparcId: filters.typeParcId } : {}),
      },
      select: { id: true, typeparcId: true },
    }),
    prisma.typeLubrifiant.findFirst({
      where: { id: filters.typeLubrifiantId, tenantId },
      select: { id: true },
    }),
  ]);
  if (!parc) {
    return { success: false, message: "Le parc sélectionné est invalide.", data: [] };
  }
  if (!typeLubrifiant) {
    return {
      success: false,
      message: "Le type de lubrifiant sélectionné est invalide.",
      data: [],
    };
  }
  if (filters.siteId) {
    const site = await prisma.site.findFirst({
      where: { id: filters.siteId, tenantId, active: true },
      select: { id: true },
    });
    if (!site) {
      return { success: false, message: "Le site sélectionné est invalide.", data: [] };
    }
  }
  if (filters.enginId) {
    const engin = await prisma.engin.findFirst({
      where: {
        id: filters.enginId,
        parcId: filters.parcId,
        tenantId,
        ...(filters.siteId ? { siteId: filters.siteId } : {}),
      },
      select: { id: true },
    });
    if (!engin) {
      return {
        success: false,
        message: "L’engin sélectionné ne correspond pas au parc ou au site choisi.",
        data: [],
      };
    }
  }
  if (filters.lubrifiantId) {
    const lubrifiant = await prisma.lubrifiant.findFirst({
      where: {
        id: filters.lubrifiantId,
        tenantId,
        typeLubrifiantId: filters.typeLubrifiantId,
      },
      select: { id: true },
    });
    if (!lubrifiant) {
      return {
        success: false,
        message: "Le lubrifiant sélectionné ne correspond pas au type choisi.",
        data: [],
      };
    }
  }

  const commonWhere = {
    tenantId,
    du: { gte: du },
    au: { lte: au },
    ...(filters.parcId || filters.typeParcId || filters.siteId || filters.enginId
      ? {
          engin: {
            is: {
              ...(filters.enginId ? { id: filters.enginId } : {}),
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
              ...(filters.siteId ? { siteId: filters.siteId } : {}),
            },
          },
        }
      : {}),
    ...(filters.section?.trim()
      ? { section: { contains: filters.section.trim(), mode: "insensitive" as const } }
      : {}),
    ...(filters.imputation?.trim()
      ? { imputation: { contains: filters.imputation.trim(), mode: "insensitive" as const } }
      : {}),
  };
  const where = {
    ...commonWhere,
    lubrifiant: {
      is: {
        typeLubrifiantId: filters.typeLubrifiantId,
        ...(filters.lubrifiantId ? { id: filters.lubrifiantId } : {}),
      },
    },
  };

  const [entries, globalEntries] = await Promise.all([
    prisma.saisieLubrifiant.findMany({
      where,
      select: {
        qte: true,
        enginId: true,
        engin: {
          select: {
            id: true,
            name: true,
            parcId: true,
            siteId: true,
            site: { select: { name: true } },
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
            typeLubrifiant: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.saisieLubrifiant.findMany({
      where: {
        ...commonWhere,
        lubrifiant: { is: { tenantId } },
      },
      select: {
        qte: true,
        enginId: true,
        lubrifiant: { select: { unite: true } },
      },
    }),
  ]);

  const enginGroups = new Map<string, LubrifiantConsumptionReport["byEngin"][number]>();
  const parcGroups = new Map<string, LubrifiantConsumptionReport["byParc"][number]>();
  const specificParcGroups = new Map<
    string,
    Omit<LubrifiantConsumptionReport["specificByParcAndLubrifiant"][number], "hrm" | "specific">
  >();
  const specificEnginGroups = new Map<
    string,
    Omit<LubrifiantConsumptionReport["specificByEngin"][number], "hrm" | "specific" | "objectif" | "ecart">
  >();
  const relevantEnginsByParcGroup = new Map<string, Set<string>>();

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
        siteName: entry.engin.site.name,
        lubrifiantId: entry.lubrifiant.id,
        lubrifiantName: entry.lubrifiant.name,
        code: entry.lubrifiant.code,
        typeLubrifiantName: entry.lubrifiant.typeLubrifiant.name,
        unite: entry.lubrifiant.unite,
        qte: entry.qte,
      });
    }

    const parcKey = `${entry.engin.parcId}\u0000${entry.lubrifiantId}`;
    const parcGroup = parcGroups.get(parcKey);
    if (parcGroup) {
      parcGroup.qte += entry.qte;
    } else {
      parcGroups.set(parcKey, {
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

    const specificParcKey = `${entry.engin.parcId}\u0000${entry.lubrifiantId}`;
    const specificParcGroup = specificParcGroups.get(specificParcKey);
    if (specificParcGroup) {
      specificParcGroup.qte += entry.qte;
    } else {
      specificParcGroups.set(specificParcKey, {
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
    if (!relevantEnginsByParcGroup.has(specificParcKey)) {
      relevantEnginsByParcGroup.set(specificParcKey, new Set());
    }
    relevantEnginsByParcGroup.get(specificParcKey)?.add(entry.enginId);

    const specificEnginKey =
      `${entry.enginId}\u0000${entry.lubrifiant.typeLubrifiant.id}\u0000${entry.lubrifiant.unite}`;
    const specificEnginGroup = specificEnginGroups.get(specificEnginKey);
    if (specificEnginGroup) {
      specificEnginGroup.qte += entry.qte;
    } else {
      specificEnginGroups.set(specificEnginKey, {
        enginId: entry.engin.id,
        enginName: entry.engin.name,
        siteName: entry.engin.site.name,
        parcId: entry.engin.parc.id,
        parcName: entry.engin.parc.name,
        typeParcName: entry.engin.parc.typeparc.name,
        typeLubrifiantId: entry.lubrifiant.typeLubrifiant.id,
        typeLubrifiantName: entry.lubrifiant.typeLubrifiant.name,
        unite: entry.lubrifiant.unite,
        qte: entry.qte,
      });
    }
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

  const globalGroupsByUnit = new Map<string, { qte: number; enginIds: Set<string> }>();
  for (const entry of globalEntries) {
    const group = globalGroupsByUnit.get(entry.lubrifiant.unite);
    if (group) {
      group.qte += entry.qte;
      group.enginIds.add(entry.enginId);
    } else {
      globalGroupsByUnit.set(entry.lubrifiant.unite, {
        qte: entry.qte,
        enginIds: new Set([entry.enginId]),
      });
    }
  }
  const globalEnginIds = [...new Set(globalEntries.map((entry) => entry.enginId))];
  const globalHrmTotals = globalEnginIds.length
    ? await prisma.saisiehrm.groupBy({
        by: ["enginId"],
        where: {
          tenantId,
          enginId: { in: globalEnginIds },
          du: { gte: du, lte: au },
        },
        _sum: { hrm: true },
      })
    : [];
  const globalHrmByEngin = new Map(
    globalHrmTotals.map((item) => [item.enginId, item._sum.hrm ?? 0]),
  );
  const globalByParcByUnit = [...globalGroupsByUnit.entries()]
    .map(([unite, group]) => {
      const hrm = [...group.enginIds].reduce(
        (sum, enginId) => sum + (globalHrmByEngin.get(enginId) ?? 0),
        0,
      );
      return {
        unite,
        qte: roundToTwo(group.qte),
        hrm: roundToTwo(hrm),
        specific: hrm > 0 ? roundToTwo(group.qte / hrm) : null,
      };
    })
    .sort((a, b) => a.unite.localeCompare(b.unite, "fr"));

  const specificiteByParc = await getSpecificiteByParc(
    tenantId,
    parc.typeparcId,
    filters,
    du,
    au,
  );
  const siteIds = [...new Set(entries.map((entry) => entry.engin.siteId))];
  const siteIdByEngin = new Map(
    entries.map((entry) => [entry.enginId, entry.engin.siteId]),
  );
  const objectives = siteIds.length
    ? await prisma.objectif.findMany({
        where: {
          tenantId,
          annee: au.getUTCFullYear(),
          parcId: filters.parcId,
          siteId: { in: siteIds },
        },
        select: {
          siteId: true,
          spe_huile: true,
          spe_go: true,
          spe_graisse: true,
        },
      })
    : [];
  const objectiveBySite = new Map(objectives.map((item) => [item.siteId, item]));
  const specificByParcAndLubrifiant = [...specificParcGroups.entries()].map(
    ([key, group]) => {
      const hrm = [...(relevantEnginsByParcGroup.get(key) ?? [])].reduce(
        (sum, enginId) => sum + (hrmByEngin.get(enginId) ?? 0),
        0,
      );
      return {
        ...group,
        qte: roundToTwo(group.qte),
        hrm: roundToTwo(hrm),
        specific: hrm > 0 ? roundToTwo(group.qte / hrm) : null,
      };
    },
  );
  const specificByEngin = [...specificEnginGroups.values()].map((group) => {
    const hrm = hrmByEngin.get(group.enginId) ?? 0;
    const specific = hrm > 0 ? group.qte / hrm : null;
    const objectiveField = getLubrifiantObjectiveField(group.typeLubrifiantName);
    const rawObjective = objectiveField
      ? objectiveBySite.get(siteIdByEngin.get(group.enginId) ?? "")?.[objectiveField] ?? null
      : null;
    const objectif = rawObjective === null ? null : roundToTwo(rawObjective);
    return {
      ...group,
      qte: roundToTwo(group.qte),
      hrm: roundToTwo(hrm),
      specific: specific === null ? null : roundToTwo(specific),
      objectif,
      ecart: specific !== null && objectif !== null
        ? roundToTwo(roundToTwo(specific) - objectif)
        : null,
    };
  });

  const byParc = [...parcGroups.values()]
    .map((item) => ({ ...item, qte: roundToTwo(item.qte) }))
    .sort(
      (a, b) =>
        b.qte - a.qte ||
        a.parcName.localeCompare(b.parcName) ||
        a.lubrifiantName.localeCompare(b.lubrifiantName),
    );
  const byEngin = [...enginGroups.values()]
    .map((item) => ({ ...item, qte: roundToTwo(item.qte) }))
    .sort(
      (a, b) =>
        b.qte - a.qte ||
        a.parcName.localeCompare(b.parcName) ||
        a.enginName.localeCompare(b.enginName) ||
        a.lubrifiantName.localeCompare(b.lubrifiantName),
    );

  const report: LubrifiantConsumptionReport = {
    period: { du: filters.du, au: filters.au },
    specificiteByParc,
    globalByParcByUnit,
    byParc,
    byEngin,
    specificByParcAndLubrifiant: specificByParcAndLubrifiant.sort(
      (a, b) =>
        (b.specific ?? Number.NEGATIVE_INFINITY) -
          (a.specific ?? Number.NEGATIVE_INFINITY) ||
        a.parcName.localeCompare(b.parcName) ||
        a.lubrifiantName.localeCompare(b.lubrifiantName),
    ),
    specificByEngin: specificByEngin.sort(
      (a, b) =>
        (b.specific ?? -Infinity) - (a.specific ?? -Infinity) ||
        a.enginName.localeCompare(b.enginName),
    ),
  };
  return { success: true, message: "Rapports calculés.", data: [report] };
}
