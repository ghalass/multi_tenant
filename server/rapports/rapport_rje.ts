"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { ActionResponse } from "@/lib/types"; import { getSession } from "@/lib/auth";
import { ACTIVE, PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";

export interface searchParamsRapportRje {
  date?: string;
  parc?: string;
  site?: string;
  currentPage?: number;
  itemsPerPage?: number;
}


export async function getRapportRje(filters?: searchParamsRapportRje): Promise<ActionResponse> {
  const g = await guard(ACTION.READ, RESOURCE.RAPPORT);
  if (!g.success) return { data: [], success: false, message: g.message };

  const { userId, currentTenantId } = await getSession();

  // Pagination
  const currentPage = Math.max(filters?.currentPage ?? 1, 1);
  const itemsPerPage = Math.max(filters?.itemsPerPage ?? PAGINATION_SETTINGS.itemsPerPage, 1);

  const date = filters?.date;
  const parc = filters?.parc;
  const site = filters?.site;

  let finalData: any[] = [];

  if (date && parc) {

    const dateCible = new Date(`${date}T00:00:00.000Z`);
    // ---------- CALCUL DES PÉRIODES ----------
    const debutMois = new Date(Date.UTC(
      dateCible.getUTCFullYear(),
      dateCible.getUTCMonth(),
      1
    ));
    const debutAnnee = new Date(Date.UTC(dateCible.getUTCFullYear(), 0, 1));
    const finJournee = new Date(Date.UTC(
      dateCible.getUTCFullYear(),
      dateCible.getUTCMonth(),
      dateCible.getUTCDate() + 1
    ));
    const nho_j = 24;
    const nho_m = dateCible.getUTCDate() * 24;
    const joursEcoules = dateCible.getUTCDate() === 1 &&
      dateCible.getUTCMonth() === 0 ? 1 : Math.floor(
        (dateCible.getTime() - debutAnnee.getTime()) / (24 * 60 * 60 * 1000)
      ) + 1;

    const nho_a = joursEcoules * 24;
    // ---------- FONCTION DE RÉCUPÉRATION DES AGRÉGATS ----------
    const getHimHrmNi = async (
      enginId: string,
      startDate: Date,
      endDate: Date
    ) => {
      const him = await prisma.saisiehim.aggregate({
        _sum: { him: true },
        where: {
          saisiehrm: {
            du: { gte: startDate, lte: endDate },
            enginId: enginId,
            tenantId: currentTenantId
          },
        },
      });

      const hrm = await prisma.saisiehrm.aggregate({
        _sum: { hrm: true },
        where: {
          du: { gte: startDate, lte: endDate },
          enginId: enginId,
          tenantId: currentTenantId
        },
      });

      const ni = await prisma.saisiehim.count({
        where: {
          saisiehrm: {
            du: { gte: startDate, lte: endDate },
            enginId: enginId,
            tenantId: currentTenantId
          },
        },
      });

      return {
        him: him._sum.him || 0,
        hrm: hrm._sum.hrm || 0,
        ni: ni || 0,
      };
    };
    // ---------- FORMULES ----------
    const calculateIndicators = (
      him: number,
      hrm: number,
      ni: number,
      nho: number
    ) => {
      const dispo = ((1 - him / nho) * 100).toFixed(2);
      const mtbf = ni === 0 ? "0.00" : (hrm / ni).toFixed(2);
      const tdm = ((100 * hrm) / nho).toFixed(2);
      return { dispo, mtbf, tdm };
    };

    const where: any = {
      saisiehrms: { some: {} },
      active: true,
      tenantId: currentTenantId,
      parc: { name: parc },
    };
    if (site) where.site = { name: site };

    // ---------- LISTE DES ENGINS ----------
    const engins = await prisma.engin.findMany({
      where,
      select: {
        id: true,
        name: true,
        parcId: true,
        siteId: true,
        parc: { select: { name: true } },
        site: { select: { name: true } },
      },
      distinct: ["name"],
    });

    // ---------- CALCUL COMPLET ENGINE PAR ENGINE ----------
    finalData = await Promise.all(
      engins.map(async (engin) => {
        const enginDetails = await prisma.engin.findUnique({
          where: { id: engin.id, active: true },
          select: {
            parcId: true,
            parc: { select: { name: true } },
          },
        });

        // Trouver le site basé sur la saisie du jour
        // Normalisation stricte en date pure (UTC, sans heure) pour @db.Date
        const jourDebut = new Date(Date.UTC(
          dateCible.getUTCFullYear(),
          dateCible.getUTCMonth(),
          dateCible.getUTCDate()
        ));
        const jourFin = new Date(Date.UTC(
          dateCible.getUTCFullYear(),
          dateCible.getUTCMonth(),
          dateCible.getUTCDate() + 1
        ));

        const saisieJour = await prisma.saisiehrm.findFirst({
          where: {
            enginId: engin.id,
            du: {
              gte: jourDebut,
              lt: jourFin,
            },
            tenantId: currentTenantId,
          },
          select: {
            siteId: true,
            site: { select: { name: true } },
          },
        });

        const siteId = saisieJour?.siteId ?? null;
        const siteName = saisieJour?.site?.name ?? null;
        const annee = dateCible.getUTCFullYear();

        // Objectifs
        const objectif = siteId
          ? await prisma.objectif.findUnique({
            where: {
              annee_parcId_siteId: {
                annee,
                parcId: enginDetails?.parcId ?? "",
                siteId: siteId,
              },
            },
            select: {
              dispo: true,
              mtbf: true,
              tdm: true,
            },
          })
          : null;

        const [dataJ, dataM, dataA] = await Promise.all([
          getHimHrmNi(engin.id, dateCible, finJournee),
          getHimHrmNi(engin.id, debutMois, dateCible),
          getHimHrmNi(engin.id, debutAnnee, dateCible),
        ]);

        const indicatorsJ = calculateIndicators(
          dataJ.him,
          dataJ.hrm,
          dataJ.ni,
          nho_j
        );
        const indicatorsM = calculateIndicators(
          dataM.him,
          dataM.hrm,
          dataM.ni,
          nho_m
        );
        const indicatorsA = calculateIndicators(
          dataA.him,
          dataA.hrm,
          dataA.ni,
          nho_a
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

          // MOIS
          nho_m,
          dispo_m: indicatorsM.dispo,
          mtbf_m: indicatorsM.mtbf,
          tdm_m: indicatorsM.tdm,
          him_m: dataM.him,
          hrm_m: dataM.hrm,
          ni_m: dataM.ni,

          // ANNEE
          nho_a,
          dispo_a: indicatorsA.dispo,
          mtbf_a: indicatorsA.mtbf,
          tdm_a: indicatorsA.tdm,
          him_a: dataA.him,
          hrm_a: dataA.hrm,
          ni_a: dataA.ni,
        };
      })
    );
  }

  const totalPages = Math.ceil(finalData.length / itemsPerPage);

  return {
    data: finalData,
    success: true, message: "Données récupérées avec succès!",
    meta: { totalItems: finalData.length, totalPages, currentPage, itemsPerPage },
  };
}
