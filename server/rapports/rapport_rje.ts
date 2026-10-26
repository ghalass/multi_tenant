"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import type { ActionResponse } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";

export interface searchParamsRapportRje {
  date?: string;
  parc?: string;
  site?: string;
  currentPage?: number;
  itemsPerPage?: number;
}

export async function getRapportRje(
  filters?: searchParamsRapportRje,
): Promise<ActionResponse> {
  const g = await guard(ACTION.READ, RESOURCE.RAPPORT);

  if (!g.success) {
    return {
      data: [],
      success: false,
      message: g.message,
    };
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

  // Pagination : conservée pour compatibilité avec le rapport existant.
  const currentPage = Math.max(filters?.currentPage ?? 1, 1);
  const itemsPerPage = Math.max(
    filters?.itemsPerPage ?? PAGINATION_SETTINGS.itemsPerPage,
    1,
  );

  const date = filters?.date;
  const parc = filters?.parc;
  const site = filters?.site;

  let finalData: any[] = [];

  if (date && parc) {
    const dateCible = new Date(`${date}T00:00:00.000Z`);

    if (Number.isNaN(dateCible.getTime())) {
      return {
        data: [],
        success: false,
        message: "La date sélectionnée est invalide.",
      };
    }

    // --------------------------------------------------
    // CALCUL DES PÉRIODES
    // Les dates de fin sont exclusives : [début, fin[
    // --------------------------------------------------

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

    // Début du jour suivant : fin exclusive.
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

    // --------------------------------------------------
    // AGRÉGATION HIM, HRM ET NI POUR UN ENGIN
    // --------------------------------------------------

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
          _sum: { him: true },
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
          _sum: { hrm: true },
          where: {
            du: dateFilter,
            enginId,
            tenantId: currentTenantId,
          },
        }),

        // NI doit être la somme du champ ni,
        // et non le nombre de lignes Saisiehim.
        prisma.saisiehim.aggregate({
          _sum: { ni: true },
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

    // --------------------------------------------------
    // FORMULES DES INDICATEURS
    // --------------------------------------------------

    const calculateIndicators = (
      him: number,
      hrm: number,
      ni: number,
      nho: number,
    ) => {
      const dispo =
        nho > 0 ? ((1 - him / nho) * 100).toFixed(2) : "0.00";

      const mtbf =
        ni === 0 ? "0.00" : (hrm / ni).toFixed(2);

      const tdm =
        nho > 0 ? ((100 * hrm) / nho).toFixed(2) : "0.00";

      return {
        dispo,
        mtbf,
        tdm,
      };
    };

    // --------------------------------------------------
    // LISTE DES ENGINS
    // --------------------------------------------------

    const where: any = {
      saisiehrms: {
        some: {},
      },
      active: true,
      tenantId: currentTenantId,
      parc: {
        name: parc,
      },
    };

    if (site) {
      where.site = {
        name: site,
      };
    }

    const engins = await prisma.engin.findMany({
      where,
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
      distinct: ["name"],
    });

    // --------------------------------------------------
    // CALCUL DES INDICATEURS POUR CHAQUE ENGIN
    // --------------------------------------------------

    finalData = await Promise.all(
      engins.map(async (engin) => {
        const enginDetails = await prisma.engin.findUnique({
          where: {
            id: engin.id,
            active: true,
          },
          select: {
            parcId: true,
            parc: {
              select: {
                name: true,
              },
            },
          },
        });

        // Site correspondant à la saisie du jour sélectionné.
        const saisieJour = await prisma.saisiehrm.findFirst({
          where: {
            enginId: engin.id,
            du: {
              gte: dateCible,
              lt: finJournee,
            },
            tenantId: currentTenantId,
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

        const siteId = saisieJour?.siteId ?? null;
        const siteName = saisieJour?.site?.name ?? null;
        const annee = dateCible.getUTCFullYear();

        // Objectifs annuels de l'engin, selon son parc et son site.
        const objectif = siteId
          ? await prisma.objectif.findUnique({
            where: {
              annee_parcId_siteId: {
                annee,
                parcId: enginDetails?.parcId ?? "",
                siteId,
              },
            },
            select: {
              dispo: true,
              mtbf: true,
              tdm: true,
            },
          })
          : null;

        // Les trois périodes comprennent le jour sélectionné.
        // La fin reste exclusive pour éviter tout double comptage.
        const [dataJ, dataM, dataA] = await Promise.all([
          // Journalier : uniquement le jour sélectionné
          getHimHrmNi(
            engin.id,
            dateCible,
            finJournee,
          ),

          // Mensuel : du premier jour du mois
          // jusqu'au lendemain de la date sélectionnée
          getHimHrmNi(
            engin.id,
            debutMois,
            finJournee,
          ),

          // Annuel : du premier janvier
          // jusqu'au lendemain de la date sélectionnée
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
          parcId: enginDetails?.parcId,
          parcName: enginDetails?.parc?.name ?? null,
          siteId,
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

          // MOIS : cumul depuis le début du mois jusqu'à la date sélectionnée
          nho_m,
          dispo_m: indicatorsM.dispo,
          mtbf_m: indicatorsM.mtbf,
          tdm_m: indicatorsM.tdm,
          him_m: dataM.him,
          hrm_m: dataM.hrm,
          ni_m: dataM.ni,

          // ANNÉE : cumul depuis le début de l'année jusqu'à la date sélectionnée
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
  }

  const totalPages = Math.ceil(finalData.length / itemsPerPage);

  return {
    data: finalData,
    success: true,
    message: "Données récupérées avec succès!",
    meta: {
      totalItems: finalData.length,
      totalPages,
      currentPage,
      itemsPerPage,
    },
  };
}