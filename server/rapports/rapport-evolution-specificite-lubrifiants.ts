"use server";

import { getSession } from "@/lib/auth";
import { ACTION } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { RESOURCE } from "@/lib/constantes";
import { guard } from "@/lib/rbac/middleware";
import type { ActionResponse } from "@/lib/types/types";
import { getLubrifiantObjectiveField } from "@/server/lubrifiant-shared";

export type EvolutionSpecificiteFilters = {
  annee: number;
  typeParcId: string;
  parcId: string;
  siteId?: string;
  enginId?: string;
  typeLubrifiantId: string;
  lubrifiantId?: string;
};

export type EvolutionSpecificiteLubrifiantOptions = {
  id: string;
  name: string;
  lubrifiants: {
    id: string;
    name: string;
    code: string;
  }[];
}[];

export type EvolutionSpecificiteItem = {
  typeLubrifiantId: string;
  typeLubrifiantName: string;
  unite: string;
  objectif: number | null;
  months: {
    mois: string;
    specific: number | null;
    qte: number;
    hrm: number;
  }[];
};

export type EvolutionConsumptionTopItem = {
  id: string;
  name: string;
  unite: string;
  qte: number;
};

export type EvolutionSpecificiteReport = {
  evolution: EvolutionSpecificiteItem[];
  topEngins: EvolutionConsumptionTopItem[];
  topLubrifiants: EvolutionConsumptionTopItem[];
};

const MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function getEvolutionSpecificiteLubrifiants(
  filters: EvolutionSpecificiteFilters,
): Promise<ActionResponse<EvolutionSpecificiteReport>> {
  const permission = await guard(ACTION.READ, RESOURCE.RAPPORT);
  if (!permission.success) {
    return { success: false, message: permission.message, data: [] };
  }

  const { currentTenantId } = await getSession();
  if (!currentTenantId) {
    return { success: false, message: "Sélectionnez un tenant actif.", data: [] };
  }

  const tenant = await prisma.tenant.findFirst({
    where: { id: currentTenantId, active: true },
    select: { id: true },
  });
  if (!tenant) {
    return { success: false, message: "Le tenant sélectionné est introuvable ou désactivé.", data: [] };
  }

  const {
    annee,
    typeParcId,
    parcId,
    siteId,
    enginId,
    typeLubrifiantId,
    lubrifiantId,
  } = filters;
  if (!Number.isInteger(annee) || annee < 2000 || annee > 9999) {
    return { success: false, message: "Sélectionnez une année valide.", data: [] };
  }
  if (!typeParcId || !parcId) {
    return { success: false, message: "Sélectionnez un type de parc et un parc.", data: [] };
  }
  if (!typeLubrifiantId) {
    return {
      success: false,
      message: "Sélectionnez un type de lubrifiant pour générer le rapport.",
      data: [],
    };
  }
  if (enginId && !siteId) {
    return { success: false, message: "Sélectionnez un site avant de choisir un engin.", data: [] };
  }
  if (lubrifiantId && !typeLubrifiantId) {
    return { success: false, message: "Sélectionnez un type de lubrifiant avant de choisir un lubrifiant.", data: [] };
  }
  const validType = await prisma.typeLubrifiant.findFirst({
    where: { id: typeLubrifiantId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!validType) {
    return { success: false, message: "Le type de lubrifiant sélectionné est invalide.", data: [] };
  }
  if (lubrifiantId) {
    const validLubrifiant = await prisma.lubrifiant.findFirst({
      where: {
        id: lubrifiantId,
        tenantId: tenant.id,
        typeLubrifiantId,
      },
      select: { id: true },
    });
    if (!validLubrifiant) {
      return { success: false, message: "Le lubrifiant sélectionné ne correspond pas au type choisi.", data: [] };
    }
  }

  const parc = await prisma.parc.findFirst({
    where: { id: parcId, typeparcId: typeParcId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!parc) {
    return { success: false, message: "Le parc sélectionné ne correspond pas au type de parc.", data: [] };
  }

  const engins = await prisma.engin.findMany({
    where: {
      tenantId: tenant.id,
      parcId,
      active: true,
      ...(siteId ? { siteId } : {}),
      ...(enginId ? { id: enginId } : {}),
    },
    select: { id: true, name: true, siteId: true },
  });
  if ((siteId || enginId) && engins.length === 0) {
    return { success: false, message: "Aucun engin actif ne correspond aux filtres sélectionnés.", data: [] };
  }

  const enginIds = engins.map((engin) => engin.id);
  const siteIds = [...new Set(engins.map((engin) => engin.siteId))];
  const yearStart = new Date(Date.UTC(annee, 0, 1));
  const yearEnd = new Date(Date.UTC(annee + 1, 0, 1));

  const entries = enginIds.length
    ? await prisma.saisieLubrifiant.findMany({
        where: {
          tenantId: tenant.id,
          enginId: { in: enginIds },
          du: { gte: yearStart, lt: yearEnd },
          au: { lt: yearEnd },
          engin: { tenantId: tenant.id, parcId, active: true },
          lubrifiant: {
            tenantId: tenant.id,
            ...(lubrifiantId ? { id: lubrifiantId } : {}),
            typeLubrifiantId,
            typeLubrifiant: { tenantId: tenant.id },
          },
        },
        select: {
          du: true,
          au: true,
          qte: true,
          enginId: true,
          lubrifiant: {
            select: {
              unite: true,
              id: true,
              name: true,
              code: true,
              typeLubrifiant: { select: { id: true, name: true } },
            },
          },
        },
      })
    : [];

  const hrmEntries = enginIds.length
    ? await prisma.saisiehrm.findMany({
        where: {
          tenantId: tenant.id,
          enginId: { in: enginIds },
          du: { gte: yearStart, lt: yearEnd },
          site: { tenantId: tenant.id },
        },
        select: { du: true, enginId: true, hrm: true },
      })
    : [];

  const hrmByEnginMonth = new Map<string, number>();
  for (const entry of hrmEntries) {
    const key = `${entry.enginId}\u0000${entry.du.getUTCMonth()}`;
    hrmByEnginMonth.set(key, (hrmByEnginMonth.get(key) ?? 0) + entry.hrm);
  }

  type Group = {
    typeLubrifiantId: string;
    typeLubrifiantName: string;
    unite: string;
    qteByMonth: number[];
    enginsByMonth: Set<string>[];
  };

  const groups = new Map<string, Group>();
  const enginConsumption = new Map<string, EvolutionConsumptionTopItem>();
  const lubricantConsumption = new Map<string, EvolutionConsumptionTopItem>();
  const enginNameById = new Map(engins.map((engin) => [engin.id, engin.name]));

  for (const entry of entries) {
    const monthIndex = entry.du.getUTCMonth();
    if (
      entry.au.getUTCFullYear() !== annee ||
      entry.au.getUTCMonth() !== monthIndex
    ) {
      continue;
    }
    const enginId = entry.enginId;
    const enginName = enginNameById.get(enginId);
    if (enginName) {
      const enginKey = `${enginId}\u0000${entry.lubrifiant.unite}`;
      const currentEngin = enginConsumption.get(enginKey);
      if (currentEngin) {
        currentEngin.qte += entry.qte;
      } else {
        enginConsumption.set(enginKey, {
          id: enginId,
          name: enginName,
          unite: entry.lubrifiant.unite,
          qte: entry.qte,
        });
      }
    }

    const lubricantKey = `${entry.lubrifiant.id}\u0000${entry.lubrifiant.unite}`;
    const currentLubrifiant = lubricantConsumption.get(lubricantKey);
    if (currentLubrifiant) {
      currentLubrifiant.qte += entry.qte;
    } else {
      lubricantConsumption.set(lubricantKey, {
        id: entry.lubrifiant.id,
        name: `${entry.lubrifiant.code} — ${entry.lubrifiant.name}`,
        unite: entry.lubrifiant.unite,
        qte: entry.qte,
      });
    }

    const { typeLubrifiant } = entry.lubrifiant;
    const key = `${typeLubrifiant.id}\u0000${entry.lubrifiant.unite}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        typeLubrifiantId: typeLubrifiant.id,
        typeLubrifiantName: typeLubrifiant.name,
        unite: entry.lubrifiant.unite,
        qteByMonth: Array.from({ length: 12 }, () => 0),
        enginsByMonth: Array.from({ length: 12 }, () => new Set<string>()),
      };
      groups.set(key, group);
    }
    group.qteByMonth[monthIndex] += entry.qte;
    group.enginsByMonth[monthIndex].add(entry.enginId);
  }

  const objectifs = siteIds.length
    ? await prisma.objectif.findMany({
        where: {
          tenantId: tenant.id,
          annee,
          parcId,
          siteId: { in: siteIds },
        },
        select: {
          spe_huile: true,
          spe_go: true,
          spe_graisse: true,
        },
      })
    : [];

  const evolution = [...groups.values()].map((group) => {
    const objectiveField = getLubrifiantObjectiveField(group.typeLubrifiantName);
    const objectiveValues = objectiveField
      ? objectifs
          .map((objectif) => objectif[objectiveField])
          .filter((value): value is number => value !== null && Number.isFinite(value))
      : [];
    const objectif = objectiveValues.length
      ? round(objectiveValues.reduce((sum, value) => sum + value, 0) / objectiveValues.length)
      : null;

    return {
      typeLubrifiantId: group.typeLubrifiantId,
      typeLubrifiantName: group.typeLubrifiantName,
      unite: group.unite,
      objectif,
      months: MONTHS.map((mois, index) => {
        const hrm = [...group.enginsByMonth[index]].reduce(
          (sum, enginId) => sum + (hrmByEnginMonth.get(`${enginId}\u0000${index}`) ?? 0),
          0,
        );
        const qte = group.qteByMonth[index];
        return {
          mois,
          specific: hrm > 0 ? round(qte / hrm) : null,
          qte: round(qte),
          hrm: round(hrm),
        };
      }),
    };
  }).sort((a, b) =>
    a.typeLubrifiantName.localeCompare(b.typeLubrifiantName, "fr") ||
    a.unite.localeCompare(b.unite, "fr"),
  );

  return {
    success: true,
    message: "Évolution du spécifique calculée.",
    data: [{
      evolution,
      topEngins: [...new Set([...enginConsumption.values()].map((item) => item.unite))]
        .flatMap((unite) =>
          [...enginConsumption.values()]
            .filter((item) => item.unite === unite)
            .sort((a, b) => b.qte - a.qte || a.name.localeCompare(b.name, "fr"))
            .slice(0, 10)
            .map((item) => ({ ...item, qte: round(item.qte) })),
        ),
      topLubrifiants: [...new Set([...lubricantConsumption.values()].map((item) => item.unite))]
        .flatMap((unite) =>
          [...lubricantConsumption.values()]
            .filter((item) => item.unite === unite)
            .sort((a, b) => b.qte - a.qte || a.name.localeCompare(b.name, "fr"))
            .slice(0, 10)
            .map((item) => ({ ...item, qte: round(item.qte) })),
        ),
    }],
  };
}

export async function getEvolutionSpecificiteLubrifiantOptions(): Promise<
  ActionResponse<EvolutionSpecificiteLubrifiantOptions[number]>
> {
  const permission = await guard(ACTION.READ, RESOURCE.RAPPORT);
  if (!permission.success) {
    return { success: false, message: permission.message, data: [] };
  }

  const { currentTenantId } = await getSession();
  if (!currentTenantId) {
    return { success: false, message: "Sélectionnez un tenant actif.", data: [] };
  }

  const tenant = await prisma.tenant.findFirst({
    where: { id: currentTenantId, active: true },
    select: { id: true },
  });
  if (!tenant) {
    return { success: false, message: "Le tenant sélectionné est introuvable ou désactivé.", data: [] };
  }

  const types = await prisma.typeLubrifiant.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      name: true,
      lubrifiants: {
        where: { tenantId: tenant.id },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return {
    success: true,
    message: "Filtres de lubrifiant récupérés.",
    data: types,
  };
}
