"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import type { ActionResponse } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";

export interface searchParamsRapportRje {
  date?: string;
  typeParcId?: string;
  parcId?: string;
  siteId?: string;
  currentPage?: number;
  itemsPerPage?: number;
}

export type RapportRjeOptions = {
  typeParcs: {
    id: string;
    name: string;
    parcs: {
      id: string;
      name: string;
    }[];
  }[];
  sites: {
    id: string;
    name: string;
  }[];
};

export type RapportRjeOptionsResponse = {
  success: boolean;
  message: string;
  data: RapportRjeOptions;
};

const EMPTY_OPTIONS: RapportRjeOptions = {
  typeParcs: [],
  sites: [],
};

/**
 * Options des filtres RJE.
 * L'accès est contrôlé par le droit de lecture des rapports.
 */
export async function getOptionsRapportRje(): Promise<RapportRjeOptionsResponse> {
  const permission = await guard(ACTION.READ, RESOURCE.RAPPORT);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
      data: EMPTY_OPTIONS,
    };
  }

  const { currentTenantId } = await getSession();

  if (!currentTenantId) {
    return {
      success: false,
      message: "Sélectionnez un tenant actif.",
      data: EMPTY_OPTIONS,
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
      success: false,
      message: "Le tenant sélectionné est introuvable ou désactivé.",
      data: EMPTY_OPTIONS,
    };
  }

  const [typeParcs, sites] = await Promise.all([
    prisma.typeparc.findMany({
      where: {
        tenantId: currentTenantId,
      },
      select: {
        id: true,
        name: true,
        parcs: {
          where: {
            tenantId: currentTenantId,
          },
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            name: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.site.findMany({
      where: {
        tenantId: currentTenantId,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return {
    success: true,
    message: "Options du rapport récupérées avec succès.",
    data: {
      typeParcs,
      sites,
    },
  };
}

export async function getRapportRje(
  filters?: searchParamsRapportRje,
): Promise<ActionResponse> {
  const permission = await guard(ACTION.READ, RESOURCE.RAPPORT);

  if (!permission.success) {
    return {
      data: [],
      success: false,
      message: permission.message,
    };
  }

  const { currentTenantId } = await getSession();

  if (!currentTenantId) {
    return {
      data: [],
      success: false,
      message: "Sélectionnez un tenant actif.",
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

  const date = filters?.date?.trim();
  const typeParcId = filters?.typeParcId?.trim();
  const parcId = filters?.parcId?.trim();
  const siteId = filters?.siteId?.trim() || undefined;

  if (
    !date ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !typeParcId ||
    !parcId
  ) {
    return {
      data: [],
      success: false,
      message: "Sélectionnez une date, un type de parc et un parc.",
    };
  }

  const dateCible = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(dateCible.getTime()) ||
    dateCible.toISOString().slice(0, 10) !== date
  ) {
    return {
      data: [],
      success: false,
      message: "La date sélectionnée est invalide.",
    };
  }

  // Vérifier que le parc appartient au type de parc et au tenant.
  const parcSelectionne = await prisma.parc.findFirst({
    where: {
      id: parcId,
      tenantId: currentTenantId,
      typeparcId: typeParcId,
      typeparc: {
        tenantId: currentTenantId,
      },
    },
    select: {
      id: true,
      name: true,
      typeparc: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!parcSelectionne) {
    return {
      data: [],
      success: false,
      message: "Le parc sélectionné ne correspond pas au type de parc.",
    };
  }

  // Le site est facultatif, mais s'il est renseigné,
  // il doit appartenir au tenant et être actif.
  if (siteId) {
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        tenantId: currentTenantId,
        active: true,
      },
      select: {
        id: true,
      },
    });

    if (!site) {
      return {
        data: [],
        success: false,
        message: "Le site sélectionné est invalide ou inactif.",
      };
    }
  }

  const debutMois = new Date(
    Date.UTC(
      dateCible.getUTCFullYear(),
      dateCible.getUTCMonth(),
      1,
    ),
  );

  const debutAnnee = new Date(
    Date.UTC(dateCible.getUTCFullYear(), 0, 1),
  );

  // Fin exclusive : les données du lendemain sont exclues.
  const finJournee = new Date(
    Date.UTC(
      dateCible.getUTCFullYear(),
      dateCible.getUTCMonth(),
      dateCible.getUTCDate() + 1,
    ),
  );

  const nho_j = 24;
  const nho_m = dateCible.getUTCDate() * 24;

  const joursEcoules =
    Math.floor(
      (dateCible.getTime() - debutAnnee.getTime()) /
      (24 * 60 * 60 * 1000),
    ) + 1;

  const nho_a = joursEcoules * 24;

  // Agrégation HIM, HRM et NI.
  // NI correspond à la somme du champ ni, pas au nombre de lignes.
  const getHimHrmNi = async (
    enginId: string,
    startDate: Date,
    endDateExclusive: Date,
  ) => {
    const dateFilter = {
      gte: startDate,
      lt: endDateExclusive,
    };

    const [him, hrm, ni] = await Promise.all([
      prisma.saisiehim.aggregate({
        _sum: {
          him: true,
        },
        where: {
          tenantId: currentTenantId,
          saisiehrm: {
            du: dateFilter,
            enginId,
            tenantId: currentTenantId,
          },
        },
      }),

      prisma.saisiehrm.aggregate({
        _sum: {
          hrm: true,
        },
        where: {
          du: dateFilter,
          enginId,
          tenantId: currentTenantId,
        },
      }),

      prisma.saisiehim.aggregate({
        _sum: {
          ni: true,
        },
        where: {
          tenantId: currentTenantId,
          saisiehrm: {
            du: dateFilter,
            enginId,
            tenantId: currentTenantId,
          },
        },
      }),
    ]);

    return {
      him: him._sum.him ?? 0,
      hrm: hrm._sum.hrm ?? 0,
      ni: ni._sum.ni ?? 0,
    };
  };

  const calculateIndicators = (
    him: number,
    hrm: number,
    ni: number,
    nho: number,
  ) => {
    const dispo =
      nho > 0
        ? ((1 - him / nho) * 100).toFixed(2)
        : "0.00";

    const mtbf =
      ni > 0
        ? (hrm / ni).toFixed(2)
        : "0.00";

    const tdm =
      nho > 0
        ? ((100 * hrm) / nho).toFixed(2)
        : "0.00";

    return {
      dispo,
      mtbf,
      tdm,
    };
  };

  // Récupérer les engins actifs du parc.
  // Sans site : tous les sites du parc.
  // Avec site : uniquement les engins du site sélectionné.
  const engins = await prisma.engin.findMany({
    where: {
      tenantId: currentTenantId,
      active: true,
      parcId: parcSelectionne.id,

      parc: {
        tenantId: currentTenantId,
        typeparcId: typeParcId,
        typeparc: {
          tenantId: currentTenantId,
        },
      },

      site: {
        tenantId: currentTenantId,
        ...(siteId ? { id: siteId } : {}),
      },

      saisiehrms: {
        some: {
          tenantId: currentTenantId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      parcId: true,
      siteId: true,
      parc: {
        select: {
          name: true,
        },
      },
      site: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
    distinct: ["name"],
  });

  const finalData = await Promise.all(
    engins.map(async (engin) => {
      // Site enregistré pour l'engin à la date sélectionnée.
      const saisieJour = await prisma.saisiehrm.findFirst({
        where: {
          enginId: engin.id,
          tenantId: currentTenantId,
          du: {
            gte: dateCible,
            lt: finJournee,
          },
        },
        select: {
          siteId: true,
          site: {
            select: {
              name: true,
            },
          },
        },
      });

      const siteObjectifId = saisieJour?.siteId ?? engin.siteId;
      const siteName = saisieJour?.site?.name ?? engin.site.name;
      const annee = dateCible.getUTCFullYear();

      const objectif = await prisma.objectif.findUnique({
        where: {
          annee_parcId_siteId: {
            annee,
            parcId: engin.parcId,
            siteId: siteObjectifId,
          },
        },
        select: {
          dispo: true,
          mtbf: true,
          tdm: true,
        },
      });

      const [dataJ, dataM, dataA] = await Promise.all([
        getHimHrmNi(
          engin.id,
          dateCible,
          finJournee,
        ),

        getHimHrmNi(
          engin.id,
          debutMois,
          finJournee,
        ),

        getHimHrmNi(
          engin.id,
          debutAnnee,
          finJournee,
        ),
      ]);

      const indicatorsJ = calculateIndicators(
        dataJ.him,
        dataJ.hrm,
        dataJ.ni,
        nho_j,
      );

      const indicatorsM = calculateIndicators(
        dataM.him,
        dataM.hrm,
        dataM.ni,
        nho_m,
      );

      const indicatorsA = calculateIndicators(
        dataA.him,
        dataA.hrm,
        dataA.ni,
        nho_a,
      );

      return {
        engin: engin.name,
        parcId: engin.parcId,
        parcName: engin.parc.name,
        typeParcName: parcSelectionne.typeparc.name,
        siteId: siteObjectifId,
        siteName,
        annee,

        objectif_dispo: objectif?.dispo ?? null,
        objectif_mtbf: objectif?.mtbf ?? null,
        objectif_tdm: objectif?.tdm ?? null,

        // JOUR
        nho_j,
        dispo_j: indicatorsJ.dispo,
        mtbf_j: indicatorsJ.mtbf,
        tdm_j: indicatorsJ.tdm,
        him_j: dataJ.him,
        hrm_j: dataJ.hrm,
        ni_j: dataJ.ni,

        // MOIS
        nho_m,
        dispo_m: indicatorsM.dispo,
        mtbf_m: indicatorsM.mtbf,
        tdm_m: indicatorsM.tdm,
        him_m: dataM.him,
        hrm_m: dataM.hrm,
        ni_m: dataM.ni,

        // ANNÉE
        nho_a,
        dispo_a: indicatorsA.dispo,
        mtbf_a: indicatorsA.mtbf,
        tdm_a: indicatorsA.tdm,
        him_a: dataA.him,
        hrm_a: dataA.hrm,
        ni_a: dataA.ni,
      };
    }),
  );

  const currentPage = Math.max(filters?.currentPage ?? 1, 1);
  const itemsPerPage = Math.max(
    filters?.itemsPerPage ?? PAGINATION_SETTINGS.itemsPerPage,
    1,
  );

  return {
    data: finalData,
    success: true,
    message: "Données récupérées avec succès.",
    meta: {
      totalItems: finalData.length,
      totalPages: Math.ceil(finalData.length / itemsPerPage),
      currentPage,
      itemsPerPage,
    },
  };
}