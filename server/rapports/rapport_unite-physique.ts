
"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { ActionResponse } from "@/lib/types/types";
import { getSession } from "@/lib/auth";
import { RESOURCE } from "@/lib/constantes";

export interface searchParamsRapportUnitePhysique {
  mois?: number;
  annee?: number;
}

type SiteStats = {
  hrm: number;
  him: number;
  nbre: number;
};

type AggregateStats = {
  totalHRM: number;
  totalHIM: number;
};

type ParcReport = {
  parcId: string;
  parcName: string;
  nbreEngins: number;
  siteStatsMois: Record<string, SiteStats>;
  siteStatsAnnee: Record<string, SiteStats>;
  aggregatesMois: AggregateStats;
  aggregatesAnnee: AggregateStats;
};

type TypeParcReport = {
  typeParcId: string;
  typeParcName: string;
  parcs: ParcReport[];
  totalTypeParc: {
    nbreEngins: number;
    siteStatsMois: Record<string, SiteStats>;
    siteStatsAnnee: Record<string, SiteStats>;
    aggregatesMois: AggregateStats;
    aggregatesAnnee: AggregateStats;
  };
};

const safeNumber = (value: unknown): number => {
  if (value == null) return 0;

  const numericValue =
    typeof value === "number" ? value : Number(value);

  return Number.isNaN(numericValue) ? 0 : numericValue;
};

export async function getRapportUnitePhysique(
  filters?: searchParamsRapportUnitePhysique
): Promise<ActionResponse> {
  const g = await guard(ACTION.READ, RESOURCE.RAPPORT);

  if (!g.success) {
    return { data: [], success: false, message: g.message };
  }

  const { currentTenantId } = await getSession();

  if (!currentTenantId) {
    return {
      data: [],
      success: false,
      message: "Sélectionnez un tenant avant de consulter ce rapport.",
    };
  }

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
    return {
      data: [],
      success: false,
      message: "mois et annee sont requis",
    };
  }

  const year = annee;
  const monthIndex = mois - 1;

  // ---------- PÉRIODES ----------
  const debutMois = new Date(Date.UTC(year, monthIndex, 1));
  const finMois = new Date(Date.UTC(year, monthIndex + 1, 1));
  const debutAnnee = new Date(Date.UTC(year, 0, 1));
  const finAnnee = finMois;

  // ---------- 1. CHARGER LES ENGINS ----------
  const engins = await prisma.engin.findMany({
    where: {
      active: true,
      tenantId: currentTenantId,
    },
    select: {
      id: true,
      name: true,
      parcId: true,
      siteId: true,
      parc: {
        select: {
          id: true,
          name: true,
          typeparcId: true,
          typeparc: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      site: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (engins.length === 0) {
    return {
      data: [],
      success: true,
      message: "Aucun engin actif",
      meta: {
        totalItems: 0,
        totalPages: 0,
        currentPage: 1,
        itemsPerPage: 0,
      },
    };
  }

  const enginIds = engins.map((engin) => engin.id);

  // ---------- 2. AGRÉGATIONS HIM DU MOIS ----------
  const himMoisRaw = await prisma.saisiehim.findMany({
    where: {
      tenantId: currentTenantId,
      saisiehrm: {
        du: {
          gte: debutMois,
          lt: finMois,
        },
        enginId: {
          in: enginIds,
        },
        tenantId: currentTenantId,
      },
    },
    select: {
      him: true,
      saisiehrm: {
        select: {
          enginId: true,
        },
      },
    },
  });

  const himMoisParEngin = new Map<string, number>();

  for (const row of himMoisRaw) {
    const id = row.saisiehrm.enginId;

    himMoisParEngin.set(
      id,
      (himMoisParEngin.get(id) ?? 0) + safeNumber(row.him)
    );
  }

  // ---------- HRM DU MOIS ----------
  const hrmMoisRaw = await prisma.saisiehrm.findMany({
    where: {
      du: {
        gte: debutMois,
        lt: finMois,
      },
      enginId: {
        in: enginIds,
      },
      tenantId: currentTenantId,
    },
    select: {
      enginId: true,
      hrm: true,
    },
  });

  const hrmMoisParEngin = new Map<string, number>();

  for (const row of hrmMoisRaw) {
    hrmMoisParEngin.set(
      row.enginId,
      (hrmMoisParEngin.get(row.enginId) ?? 0) + safeNumber(row.hrm)
    );
  }

  // ---------- HIM DE L'ANNÉE ----------
  const himAnneeRaw = await prisma.saisiehim.findMany({
    where: {
      tenantId: currentTenantId,
      saisiehrm: {
        du: {
          gte: debutAnnee,
          lt: finAnnee,
        },
        enginId: {
          in: enginIds,
        },
        tenantId: currentTenantId,
      },
    },
    select: {
      him: true,
      saisiehrm: {
        select: {
          enginId: true,
        },
      },
    },
  });

  const himAnneeParEngin = new Map<string, number>();

  for (const row of himAnneeRaw) {
    const id = row.saisiehrm.enginId;

    himAnneeParEngin.set(
      id,
      (himAnneeParEngin.get(id) ?? 0) + safeNumber(row.him)
    );
  }

  // ---------- HRM DE L'ANNÉE ----------
  const hrmAnneeRaw = await prisma.saisiehrm.findMany({
    where: {
      du: {
        gte: debutAnnee,
        lt: finAnnee,
      },
      enginId: {
        in: enginIds,
      },
      tenantId: currentTenantId,
    },
    select: {
      enginId: true,
      hrm: true,
    },
  });

  const hrmAnneeParEngin = new Map<string, number>();

  for (const row of hrmAnneeRaw) {
    hrmAnneeParEngin.set(
      row.enginId,
      (hrmAnneeParEngin.get(row.enginId) ?? 0) + safeNumber(row.hrm)
    );
  }

  // ---------- 3. REGROUPEMENT PAR TYPE DE PARC ----------
  const enginsParTypeparc = new Map<string, typeof engins>();

  for (const engin of engins) {
    const typeparcId = engin.parc?.typeparcId ?? "inconnu";

    if (!enginsParTypeparc.has(typeparcId)) {
      enginsParTypeparc.set(typeparcId, []);
    }

    enginsParTypeparc.get(typeparcId)!.push(engin);
  }

  const result: TypeParcReport[] = [];

  for (const [typeparcId, enginsDuType] of enginsParTypeparc) {
    const typeparcInfo = enginsDuType[0]?.parc?.typeparc;

    const typeparcObj: TypeParcReport = {
      typeParcId: typeparcId,
      typeParcName: typeparcInfo?.name ?? "Inconnu",
      parcs: [],
      totalTypeParc: {
        nbreEngins: 0,
        siteStatsMois: {},
        siteStatsAnnee: {},
        aggregatesMois: {
          totalHRM: 0,
          totalHIM: 0,
        },
        aggregatesAnnee: {
          totalHRM: 0,
          totalHIM: 0,
        },
      },
    };

    // ---------- REGROUPEMENT PAR PARC ----------
    const enginsParParc = new Map<string, typeof engins>();

    for (const engin of enginsDuType) {
      if (!enginsParParc.has(engin.parcId)) {
        enginsParParc.set(engin.parcId, []);
      }

      enginsParParc.get(engin.parcId)!.push(engin);
    }

    for (const [parcId, enginsDuParc] of enginsParParc) {
      const parcInfo = enginsDuParc[0]?.parc;

      const parcObj: ParcReport = {
        parcId,
        parcName: parcInfo?.name ?? "Inconnu",
        nbreEngins: enginsDuParc.length,
        siteStatsMois: {},
        siteStatsAnnee: {},
        aggregatesMois: {
          totalHRM: 0,
          totalHIM: 0,
        },
        aggregatesAnnee: {
          totalHRM: 0,
          totalHIM: 0,
        },
      };

      for (const engin of enginsDuParc) {
        const siteName = engin.site?.name ?? "Inconnu";

        if (!parcObj.siteStatsMois[siteName]) {
          parcObj.siteStatsMois[siteName] = {
            hrm: 0,
            him: 0,
            nbre: 0,
          };

          parcObj.siteStatsAnnee[siteName] = {
            hrm: 0,
            him: 0,
            nbre: 0,
          };
        }

        parcObj.siteStatsMois[siteName].nbre++;
        parcObj.siteStatsAnnee[siteName].nbre++;

        const hrmM = hrmMoisParEngin.get(engin.id) ?? 0;
        const himM = himMoisParEngin.get(engin.id) ?? 0;
        const hrmA = hrmAnneeParEngin.get(engin.id) ?? 0;
        const himA = himAnneeParEngin.get(engin.id) ?? 0;

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

      // ---------- AGRÉGATION DU TYPE DE PARC ----------
      typeparcObj.totalTypeParc.nbreEngins += parcObj.nbreEngins;

      typeparcObj.totalTypeParc.aggregatesMois.totalHRM +=
        parcObj.aggregatesMois.totalHRM;

      typeparcObj.totalTypeParc.aggregatesMois.totalHIM +=
        parcObj.aggregatesMois.totalHIM;

      typeparcObj.totalTypeParc.aggregatesAnnee.totalHRM +=
        parcObj.aggregatesAnnee.totalHRM;

      typeparcObj.totalTypeParc.aggregatesAnnee.totalHIM +=
        parcObj.aggregatesAnnee.totalHIM;

      // ---------- FUSION DES STATISTIQUES PAR SITE ----------
      for (const [siteName, stats] of Object.entries(
        parcObj.siteStatsMois
      )) {
        if (!typeparcObj.totalTypeParc.siteStatsMois[siteName]) {
          typeparcObj.totalTypeParc.siteStatsMois[siteName] = {
            hrm: 0,
            him: 0,
            nbre: 0,
          };
        }

        typeparcObj.totalTypeParc.siteStatsMois[siteName].hrm += stats.hrm;
        typeparcObj.totalTypeParc.siteStatsMois[siteName].him += stats.him;
        typeparcObj.totalTypeParc.siteStatsMois[siteName].nbre += stats.nbre;
      }

      for (const [siteName, stats] of Object.entries(
        parcObj.siteStatsAnnee
      )) {
        if (!typeparcObj.totalTypeParc.siteStatsAnnee[siteName]) {
          typeparcObj.totalTypeParc.siteStatsAnnee[siteName] = {
            hrm: 0,
            him: 0,
            nbre: 0,
          };
        }

        typeparcObj.totalTypeParc.siteStatsAnnee[siteName].hrm += stats.hrm;
        typeparcObj.totalTypeParc.siteStatsAnnee[siteName].him += stats.him;
        typeparcObj.totalTypeParc.siteStatsAnnee[siteName].nbre += stats.nbre;
      }
    }

    result.push(typeparcObj);
  }

  return {
    data: result,
    success: true,
    message: "Données récupérées avec succès!",
    meta: {
      totalItems: result.length,
      totalPages: 1,
      currentPage: 1,
      itemsPerPage: result.length,
    },
  };
}
