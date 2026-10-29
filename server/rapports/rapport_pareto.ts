"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { getSession } from "@/lib/auth";
import { ActionResponse } from "@/lib/types/types";

export interface SearchParamsRapportPareto {
    mois?: number;
    annee?: number;
    typeParcId?: string;
    parcId?: string;
    siteId?: string;
    enginId?: string;
}

export interface EnginParetoOption {
    id: string;
    name: string;
    siteId: string;
    siteName: string;
}

export interface ParcParetoOption {
    id: string;
    name: string;
    engins: EnginParetoOption[];
}

export interface TypeParcParetoOption {
    id: string;
    name: string;
    parcs: ParcParetoOption[];
}

export interface EnginHimPareto {
    name: string;
    him: number;
}

export interface EnginNiPareto {
    name: string;
    ni: number;
}

export interface ParetoIndisponibiliteItem {
    panneId: string;
    panne: string;
    panneDescription: string;
    himTotal: number;
    niTotal: number;
    indispo: number;
    engins: EnginHimPareto[];
    engins_mtbf: EnginNiPareto[];
}

export interface ParetoMtbfItem {
    mois: string;
    mtbf: number | null;
    engins_actifs: number;
    objectif_mtbf: number | null;
}

export interface RapportParetoData {
    typeParcId: string;
    typeParcName: string;
    parcId: string;
    parcName: string;
    siteId: string | null;
    siteName: string | null;
    enginId: string | null;
    enginName: string | null;
    mois: number;
    annee: number;
    enginsActifs: number;
    nho: number;
    hrmTotalAnnee: number;
    niTotalAnnee: number;
    mtbfAnnuel: number | null;
    indisponibilites: ParetoIndisponibiliteItem[];
    evolutionMtbf: ParetoMtbfItem[];
}

type PanneAccumulator = {
    panneId: string;
    panne: string;
    panneDescription: string;
    himTotal: number;
    niTotal: number;
    engins: Map<
        string,
        {
            name: string;
            him: number;
            ni: number;
        }
    >;
};

type MonthlyAccumulator = {
    nho: number;
    hrm: number;
    ni: number;
};

const MONTH_NAMES = [
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

function safeNumber(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function getActiveTenantId(): Promise<
    | { success: true; tenantId: string }
    | { success: false; message: string }
> {
    const { currentTenantId } = await getSession();

    if (!currentTenantId) {
        return {
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
            success: false,
            message: "Le tenant sélectionné est introuvable ou désactivé.",
        };
    }

    return {
        success: true,
        tenantId: tenant.id,
    };
}

/**
 * Options du formulaire :
 * Type de parc -> Parc -> Site -> Engin.
 *
 * Le site et l'engin restent facultatifs dans le rapport.
 * Pour choisir un engin dans l'interface, il faut d'abord choisir un site.
 */
export async function getOptionsRapportPareto(): Promise<ActionResponse> {
    const permission = await guard(ACTION.READ, RESOURCE.RAPPORT);

    if (!permission.success) {
        return {
            data: [],
            success: false,
            message: permission.message,
        };
    }

    try {
        const tenantResult = await getActiveTenantId();

        if (!tenantResult.success) {
            return {
                data: [],
                success: false,
                message: tenantResult.message,
            };
        }

        const tenantId = tenantResult.tenantId;

        const typeParcs = await prisma.typeparc.findMany({
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
                            where: {
                                tenantId,
                                active: true,
                                site: { tenantId },
                            },
                            select: {
                                id: true,
                                name: true,
                                siteId: true,
                                site: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                            orderBy: { name: "asc" },
                        },
                    },
                    orderBy: { name: "asc" },
                },
            },
            orderBy: { name: "asc" },
        });

        const data: TypeParcParetoOption[] = typeParcs
            .map((typeParc) => ({
                id: typeParc.id,
                name: typeParc.name,
                parcs: typeParc.parcs
                    .filter((parc) => parc.engins.length > 0)
                    .map((parc) => ({
                        id: parc.id,
                        name: parc.name,
                        engins: parc.engins.map((engin) => ({
                            id: engin.id,
                            name: engin.name,
                            siteId: engin.siteId,
                            siteName: engin.site.name,
                        })),
                    })),
            }))
            .filter((typeParc) => typeParc.parcs.length > 0);

        return {
            data,
            success: true,
            message: "Options du rapport Pareto récupérées avec succès.",
            meta: {
                totalItems: data.length,
                totalPages: 1,
                currentPage: 1,
                itemsPerPage: data.length,
            },
        };
    } catch (error) {
        console.error("Erreur options rapport Pareto :", error);

        return {
            data: [],
            success: false,
            message: "Impossible de récupérer les options du rapport Pareto.",
        };
    }
}

/**
 * Génère :
 * - le Pareto HIM pour le mois sélectionné ;
 * - l'évolution du MTBF sur les 12 mois de l'année ;
 * - le MTBF annuel = HRM annuel total / NI annuel total.
 *
 * Sans site : tous les sites du parc.
 * Avec site : tous les engins actifs de ce site.
 * Avec site + engin : uniquement cet engin actif.
 */
export async function getRapportPareto(
    filters?: SearchParamsRapportPareto,
): Promise<ActionResponse> {
    const permission = await guard(ACTION.READ, RESOURCE.RAPPORT);

    if (!permission.success) {
        return {
            data: [],
            success: false,
            message: permission.message,
        };
    }

    try {
        const tenantResult = await getActiveTenantId();

        if (!tenantResult.success) {
            return {
                data: [],
                success: false,
                message: tenantResult.message,
            };
        }

        const tenantId = tenantResult.tenantId;

        const mois = Number(filters?.mois);
        const annee = Number(filters?.annee);
        const typeParcId = filters?.typeParcId;
        const parcId = filters?.parcId;
        const siteId = filters?.siteId || undefined;
        const enginId = filters?.enginId || undefined;

        if (
            !Number.isInteger(mois) ||
            mois < 1 ||
            mois > 12 ||
            !Number.isInteger(annee) ||
            annee < 2000 ||
            annee > 9999
        ) {
            return {
                data: [],
                success: false,
                message: "Sélectionnez un mois et une année valides.",
            };
        }

        if (!typeParcId || !parcId) {
            return {
                data: [],
                success: false,
                message: "Sélectionnez un type de parc et un parc.",
            };
        }

        if (enginId && !siteId) {
            return {
                data: [],
                success: false,
                message:
                    "Sélectionnez un site avant de choisir un engin.",
            };
        }

        const parc = await prisma.parc.findFirst({
            where: {
                id: parcId,
                typeparcId: typeParcId,
                tenantId,
                typeparc: { tenantId },
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

        if (!parc) {
            return {
                data: [],
                success: false,
                message:
                    "Le parc sélectionné n'appartient pas au type de parc choisi ou au tenant actif.",
            };
        }

        const debutAnnee = new Date(Date.UTC(annee, 0, 1));
        const finAnnee = new Date(Date.UTC(annee + 1, 0, 1));
        const debutMois = new Date(Date.UTC(annee, mois - 1, 1));
        const finMois = new Date(Date.UTC(annee, mois, 1));

        const joursDansMois = new Date(
            Date.UTC(annee, mois, 0),
        ).getUTCDate();

        const heuresMois = joursDansMois * 24;

        const tousLesEngins = await prisma.engin.findMany({
            where: {
                tenantId,
                parcId,
                active: true,
                site: { tenantId },
                parc: {
                    tenantId,
                    typeparcId: typeParcId,
                    typeparc: { tenantId },
                },
            },
            select: {
                id: true,
                name: true,
                siteId: true,
                site: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });

        const enginsDuSite = siteId
            ? tousLesEngins.filter(
                (engin) => engin.siteId === siteId,
            )
            : tousLesEngins;

        if (siteId && enginsDuSite.length === 0) {
            return {
                data: [],
                success: false,
                message:
                    "Le site sélectionné ne contient aucun engin actif dans ce parc.",
            };
        }

        if (
            enginId &&
            !enginsDuSite.some((engin) => engin.id === enginId)
        ) {
            return {
                data: [],
                success: false,
                message:
                    "L'engin sélectionné n'appartient pas au site et au parc choisis, ou n'est pas actif.",
            };
        }

        const engins = enginId
            ? enginsDuSite.filter(
                (engin) => engin.id === enginId,
            )
            : enginsDuSite;

        const enginIds = engins.map((engin) => engin.id);

        const enginNameById = new Map(
            engins.map((engin) => [engin.id, engin.name]),
        );

        const saisies =
            enginIds.length > 0
                ? await prisma.saisiehrm.findMany({
                    where: {
                        tenantId,
                        enginId: { in: enginIds },
                        du: {
                            gte: debutAnnee,
                            lt: finAnnee,
                        },
                    },
                    select: {
                        du: true,
                        enginId: true,
                        hrm: true,
                        nho: true,
                        saisiehim: {
                            where: {
                                tenantId,
                                panne: { tenantId },
                            },
                            select: {
                                panneId: true,
                                him: true,
                                ni: true,
                                panne: {
                                    select: {
                                        id: true,
                                        name: true,
                                        description: true,
                                    },
                                },
                            },
                        },
                    },
                })
                : [];

        const monthlyStats: MonthlyAccumulator[] = Array.from(
            { length: 12 },
            () => ({
                nho: 0,
                hrm: 0,
                ni: 0,
            })
        );

        const pannesMap = new Map<string, PanneAccumulator>();

        for (const saisie of saisies) {

            const estMoisSelectionne =
                saisie.du >= debutMois &&
                saisie.du < finMois;

            for (const saisieHim of saisie.saisiehim) {
                const him = safeNumber(saisieHim.him);
                const ni = safeNumber(saisieHim.ni);

                if (!estMoisSelectionne) {
                    continue;
                }

                let panne = pannesMap.get(saisieHim.panneId);

                if (!panne) {
                    panne = {
                        panneId: saisieHim.panneId,
                        panne: saisieHim.panne.name,
                        panneDescription:
                            saisieHim.panne.description ?? "",
                        himTotal: 0,
                        niTotal: 0,
                        engins: new Map(),
                    };

                    pannesMap.set(saisieHim.panneId, panne);
                }

                panne.himTotal += him;
                panne.niTotal += ni;

                const enginName =
                    enginNameById.get(saisie.enginId) ?? "Inconnu";

                const enginPanne = panne.engins.get(saisie.enginId) ?? {
                    name: enginName,
                    him: 0,
                    ni: 0,
                };

                enginPanne.him += him;
                enginPanne.ni += ni;

                panne.engins.set(saisie.enginId, enginPanne);
            }
        }

        const nho = monthlyStats[mois - 1].nho;

        const indisponibilites: ParetoIndisponibiliteItem[] =
            Array.from(pannesMap.values())
                .map((panne) => {
                    const enginsParHim = Array.from(
                        panne.engins.values(),
                    )
                        .filter((engin) => engin.him > 0)
                        .map((engin) => ({
                            name: engin.name,
                            him: round(engin.him),
                        }))
                        .sort((a, b) => b.him - a.him);

                    const enginsParNi = Array.from(
                        panne.engins.values(),
                    )
                        .filter((engin) => engin.ni > 0)
                        .map((engin) => ({
                            name: engin.name,
                            ni: engin.ni,
                        }))
                        .sort((a, b) => b.ni - a.ni);

                    return {
                        panneId: panne.panneId,
                        panne: panne.panne,
                        panneDescription: panne.panneDescription,
                        himTotal: round(panne.himTotal),
                        niTotal: panne.niTotal,
                        indispo:
                            nho > 0
                                ? round((100 * panne.himTotal) / nho)
                                : 0,
                        engins: enginsParHim,
                        engins_mtbf: enginsParNi,
                    };
                })
                .sort((a, b) => b.indispo - a.indispo);

        /*
         * L'objectif est défini par année, parc et site.
         * Si un seul engin est sélectionné, son site est le seul
         * site utilisé ici.
         */
        const siteIds = Array.from(
            new Set(engins.map((engin) => engin.siteId)),
        );

        const objectifs =
            siteIds.length > 0
                ? await prisma.objectif.findMany({
                    where: {
                        tenantId,
                        annee,
                        parcId,
                        siteId: { in: siteIds },
                    },
                    select: {
                        siteId: true,
                        mtbf: true,
                    },
                })
                : [];

        const objectifsMtbf = objectifs
            .map((objectif) => objectif.mtbf)
            .filter(
                (value): value is number =>
                    value !== null &&
                    Number.isFinite(Number(value)),
            )
            .map(safeNumber);

        const objectifMtbfMoyen =
            objectifsMtbf.length > 0
                ? round(
                    objectifsMtbf.reduce(
                        (total, value) => total + value,
                        0,
                    ) / objectifsMtbf.length,
                )
                : null;

        const evolutionMtbf: ParetoMtbfItem[] = MONTH_NAMES.map(
            (nomMois, index) => {
                const stats = monthlyStats[index];

                return {
                    mois: nomMois,
                    mtbf:
                        stats.ni > 0
                            ? round(stats.hrm / stats.ni)
                            : null,
                    engins_actifs: engins.length,
                    objectif_mtbf: objectifMtbfMoyen,
                };
            },
        );

        const hrmTotalAnnee = monthlyStats.reduce(
            (total, stats) => total + stats.hrm,
            0,
        );

        const niTotalAnnee = monthlyStats.reduce(
            (total, stats) => total + stats.ni,
            0,
        );

        const mtbfAnnuel =
            niTotalAnnee > 0
                ? round(hrmTotalAnnee / niTotalAnnee)
                : null;

        const siteName =
            siteId && enginsDuSite.length > 0
                ? enginsDuSite[0].site.name
                : null;

        const selectedEngin = enginId
            ? engins.find((engin) => engin.id === enginId)
            : undefined;

        const result: RapportParetoData = {
            typeParcId: parc.typeparc.id,
            typeParcName: parc.typeparc.name,
            parcId: parc.id,
            parcName: parc.name,
            siteId: siteId ?? null,
            siteName,
            enginId: enginId ?? null,
            enginName: selectedEngin?.name ?? null,
            mois,
            annee,
            enginsActifs: engins.length,
            nho,
            hrmTotalAnnee: round(hrmTotalAnnee),
            niTotalAnnee,
            mtbfAnnuel,
            indisponibilites,
            evolutionMtbf,
        };

        return {
            data: [result],
            success: true,
            message: "Rapport Pareto généré avec succès.",
            meta: {
                totalItems: 1,
                totalPages: 1,
                currentPage: 1,
                itemsPerPage: 1,
            },
        };
    } catch (error) {
        console.error("Erreur rapport Pareto :", error);

        return {
            data: [],
            success: false,
            message:
                "Une erreur est survenue lors de la génération du rapport Pareto.",
        };
    }
}