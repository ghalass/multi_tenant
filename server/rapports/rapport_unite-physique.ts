"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { ActionResponse } from "@/lib/types/types";
import { getSession } from "@/lib/auth";
import { RESOURCE } from "@/lib/constantes";

export interface searchParamsRapportUnitePhysique {
  mois?: number;   // 1-12
  annee?: number;
}

const safeNumber = (v: any) => (v == null || isNaN(Number(v)) ? 0 : Number(v));

export async function getRapportUnitePhysique(
  filters?: searchParamsRapportUnitePhysique
): Promise<ActionResponse> {
  const g = await guard(ACTION.READ, RESOURCE.RAPPORT);
  if (!g.success) return { data: [], success: false, message: g.message };

  const { currentTenantId } = await getSession();

  // Un rapport doit toujours être limité à un tenant précis.
  if (!currentTenantId) {
    return {
      data: [],
      success: false,
      message: "Sélectionnez un tenant avant de consulter ce rapport.",
    };
  }

  // Vérifier que le tenant sélectionné existe et est actif.
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

  const { mois, annee } = filters ?? {};
  if (!mois || !annee) {
    return { data: [], success: false, message: "mois et annee sont requis" };
  }

  const year = annee;
  const monthIndex = mois - 1;

  // ---------- PÉRIODES ----------
  const debutMois = new Date(Date.UTC(year, monthIndex, 1));
  const finMois = new Date(Date.UTC(year, monthIndex + 1, 1)); // exclusif
  const debutAnnee = new Date(Date.UTC(year, 0, 1));
  const finAnnee = finMois;

  // ---------- 1. CHARGER LES ENGINS AVEC PARC + SITE ----------
  // On inclut les relations pour éviter un findUnique par engin ensuite
  const engins = await prisma.engin.findMany({
    where: { active: true, tenantId: currentTenantId },
    select: {
      id: true,
      name: true,
      parcId: true,
      siteId: true,
      parc: { select: { id: true, name: true, typeparcId: true, typeparc: { select: { id: true, name: true } } } },
      site: { select: { id: true, name: true } },
    },
  });

  if (engins.length === 0) {
    return { data: [], success: true, message: "Aucun engin actif", meta: { totalItems: 0, totalPages: 0, currentPage: 1, itemsPerPage: 0 } };
  }

  const enginIds = engins.map(e => e.id);

  // ---------- 2. AGRÉGATIONS PAR ENGIN (groupBy) ----------
  // HIM est sur saisiehim, filtré via la relation saisiehrm (du, enginId, tenantId)
  const himMois = await prisma.saisiehim.groupBy({
    by: ["saisiehrmId"], // on regroupe par saisiehrm pour filtrer via la relation
    _sum: { him: true },
    where: {
      tenantId: currentTenantId,
      saisiehrm: {
        du: { gte: debutMois, lt: finMois },
        enginId: { in: enginIds },
        tenantId: currentTenantId,
      },
    },
  });

  // Pour récupérer l'enginId associé, on joint ensuite avec saisiehrm
  // Mieux : groupBy directement sur saisiehrm et utiliser _sum via relation n'est pas possible dans Prisma
  // Solution : agréger sur saisiehim avec include de la relation, puis réduire en mémoire
  const himMoisRaw = await prisma.saisiehim.findMany({
    where: {
      tenantId: currentTenantId,
      saisiehrm: {
        du: { gte: debutMois, lt: finMois },
        enginId: { in: enginIds },
        tenantId: currentTenantId,
      },
    },
    select: {
      him: true,
      saisiehrm: { select: { enginId: true } },
    },
  });

  const himMoisParEngin = new Map<string, number>();
  for (const row of himMoisRaw) {
    const id = row.saisiehrm.enginId;
    himMoisParEngin.set(id, (himMoisParEngin.get(id) ?? 0) + safeNumber(row.him));
  }

  // HRM : agrégation directe sur saisiehrm (porte hrm)
  const hrmMoisRaw = await prisma.saisiehrm.findMany({
    where: {
      du: { gte: debutMois, lt: finMois },
      enginId: { in: enginIds },
      tenantId: currentTenantId,
    },
    select: { enginId: true, hrm: true },
  });

  const hrmMoisParEngin = new Map<string, number>();
  for (const row of hrmMoisRaw) {
    hrmMoisParEngin.set(row.enginId, (hrmMoisParEngin.get(row.enginId) ?? 0) + safeNumber(row.hrm));
  }

  // Idem pour l'année
  const himAnneeRaw = await prisma.saisiehim.findMany({
    where: {
      tenantId: currentTenantId,
      saisiehrm: {
        du: { gte: debutAnnee, lt: finAnnee },
        enginId: { in: enginIds },
        tenantId: currentTenantId,
      },
    },
    select: { him: true, saisiehrm: { select: { enginId: true } } },
  });
  const himAnneeParEngin = new Map<string, number>();
  for (const row of himAnneeRaw) {
    const id = row.saisiehrm.enginId;
    himAnneeParEngin.set(id, (himAnneeParEngin.get(id) ?? 0) + safeNumber(row.him));
  }

  const hrmAnneeRaw = await prisma.saisiehrm.findMany({
    where: { du: { gte: debutAnnee, lt: finAnnee }, enginId: { in: enginIds }, tenantId: currentTenantId },
    select: { enginId: true, hrm: true },
  });
  const hrmAnneeParEngin = new Map<string, number>();
  for (const row of hrmAnneeRaw) {
    hrmAnneeParEngin.set(row.enginId, (hrmAnneeParEngin.get(row.enginId) ?? 0) + safeNumber(row.hrm));
  }

  // ---------- 3. CONSTRUIRE LA STRUCTURE typeparc > parc > siteStats ----------
  // Regrouper les engins par typeparcId
  const enginsParTypeparc = new Map<string, typeof engins>();
  for (const e of engins) {
    const tpId = e.parc?.typeparcId ?? "inconnu";
    if (!enginsParTypeparc.has(tpId)) enginsParTypeparc.set(tpId, []);
    enginsParTypeparc.get(tpId)!.push(e);
  }

  const result: any[] = [];

  for (const [typeparcId, enginsDuType] of enginsParTypeparc) {
    const typeparcInfo = enginsDuType[0]?.parc?.typeparc;
    const typeparcObj: any = {
      typeParcId: typeparcId,
      typeParcName: typeparcInfo?.name ?? "Inconnu",
      parcs: [],
      totalTypeParc: {
        nbreEngins: 0,
        // ✅ NOUVEAU : stats par site agrégées au niveau typeParc
        siteStatsMois: {} as Record<string, { hrm: number; him: number; nbre: number }>,
        siteStatsAnnee: {} as Record<string, { hrm: number; him: number; nbre: number }>,
        aggregatesMois: { totalHRM: 0, totalHIM: 0 },
        aggregatesAnnee: { totalHRM: 0, totalHIM: 0 },
      },
    };

    // Regrouper par parcId
    const enginsParParc = new Map<string, typeof engins>();
    for (const e of enginsDuType) {
      if (!enginsParParc.has(e.parcId)) enginsParParc.set(e.parcId, []);
      enginsParParc.get(e.parcId)!.push(e);
    }

    for (const [parcId, enginsDuParc] of enginsParParc) {
      const parcInfo = enginsDuParc[0]?.parc;
      const parcObj: any = {
        parcId,
        parcName: parcInfo?.name ?? "Inconnu",
        nbreEngins: enginsDuParc.length,
        siteStatsMois: {} as Record<string, { hrm: number; him: number; nbre: number }>,
        siteStatsAnnee: {} as Record<string, { hrm: number; him: number; nbre: number }>,
        aggregatesMois: { totalHRM: 0, totalHIM: 0 },
        aggregatesAnnee: { totalHRM: 0, totalHIM: 0 },
      };

      for (const e of enginsDuParc) {
        const siteName = e.site?.name ?? "Inconnu";

        if (!parcObj.siteStatsMois[siteName]) {
          parcObj.siteStatsMois[siteName] = { hrm: 0, him: 0, nbre: 0 };
          parcObj.siteStatsAnnee[siteName] = { hrm: 0, him: 0, nbre: 0 };
        }
        parcObj.siteStatsMois[siteName].nbre++;
        parcObj.siteStatsAnnee[siteName].nbre++;

        const hrmM = hrmMoisParEngin.get(e.id) ?? 0;
        const himM = himMoisParEngin.get(e.id) ?? 0;
        const hrmA = hrmAnneeParEngin.get(e.id) ?? 0;
        const himA = himAnneeParEngin.get(e.id) ?? 0;

        parcObj.siteStatsMois[siteName].hrm += hrmM;
        parcObj.siteStatsMois[siteName].him += himM;
        parcObj.siteStatsAnnee[siteName].hrm += hrmA;
        parcObj.siteStatsAnnee[siteName].him += himA;

        parcObj.aggregatesMois.totalHRM += hrmM;
        parcObj.aggregatesMois.totalHIM += himM;
        parcObj.aggregatesAnnee.totalHRM += hrmA;
        parcObj.aggregatesAnnee.totalHIM += himA;
      }

      typeparcObj.parcs.push(parcObj);

      // ✅ Agrégation au niveau typeParc (nbreEngins + agrégats globaux)
      typeparcObj.totalTypeParc.nbreEngins += parcObj.nbreEngins;
      typeparcObj.totalTypeParc.aggregatesMois.totalHRM += parcObj.aggregatesMois.totalHRM;
      typeparcObj.totalTypeParc.aggregatesMois.totalHIM += parcObj.aggregatesMois.totalHIM;
      typeparcObj.totalTypeParc.aggregatesAnnee.totalHRM += parcObj.aggregatesAnnee.totalHRM;
      typeparcObj.totalTypeParc.aggregatesAnnee.totalHIM += parcObj.aggregatesAnnee.totalHIM;

      // ✅ NOUVEAU : fusionner les stats par site du parc dans celles du typeParc
      const parcSiteStatsMoisEntries = Object.entries(parcObj.siteStatsMois) as Array<
        [string, { hrm: number; him: number; nbre: number }]
      >;
      for (const [siteName, s] of parcSiteStatsMoisEntries) {
        if (!typeparcObj.totalTypeParc.siteStatsMois[siteName]) {
          typeparcObj.totalTypeParc.siteStatsMois[siteName] = { hrm: 0, him: 0, nbre: 0 };
        }
        typeparcObj.totalTypeParc.siteStatsMois[siteName].hrm += s.hrm;
        typeparcObj.totalTypeParc.siteStatsMois[siteName].him += s.him;
        typeparcObj.totalTypeParc.siteStatsMois[siteName].nbre += s.nbre;
      }

      const parcSiteStatsAnneeEntries = Object.entries(parcObj.siteStatsAnnee) as Array<
        [string, { hrm: number; him: number; nbre: number }]
      >;
      for (const [siteName, s] of parcSiteStatsAnneeEntries) {
        if (!typeparcObj.totalTypeParc.siteStatsAnnee[siteName]) {
          typeparcObj.totalTypeParc.siteStatsAnnee[siteName] = { hrm: 0, him: 0, nbre: 0 };
        }
        typeparcObj.totalTypeParc.siteStatsAnnee[siteName].hrm += s.hrm;
        typeparcObj.totalTypeParc.siteStatsAnnee[siteName].him += s.him;
        typeparcObj.totalTypeParc.siteStatsAnnee[siteName].nbre += s.nbre;
      }
    }

    result.push(typeparcObj);
  }

  return {
    data: result,
    success: true,
    message: "Données récupérées avec succès!",
    meta: { totalItems: result.length, totalPages: 1, currentPage: 1, itemsPerPage: result.length },
  };
}