"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { getSession } from "@/lib/auth";
import { ActionResponse } from "@/lib/types/types";

export interface SearchParamsRapportEtatGeneral {
    mois?: number;
    annee?: number;
    typeParcId?: string;
    parcId?: string;
}

export interface EnginEtatGeneral {
    enginId: string;
    enginName: string;
    siteName: string;
    parcName: string;
    typeParcName: string;
    initialHeureChassis: number;
    hrmMois: number;
    heureChassisMois: number;
    totalHeureChassis: number;
}

export interface ParcEtatGeneral {
    parcId: string;
    parcName: string;
    typeParcId: string;
    typeParcName: string;
    engins: EnginEtatGeneral[];
    totalParc: {
        nombreEngins: number;
        totalHRMMois: number;
        totalHeureChassisMois: number;
    };
}

export interface TypeParcEtatGeneral {
    typeParcId: string;
    typeParcName: string;
    parcs: ParcEtatGeneral[];
    totalTypeParc: {
        nombreEngins: number;
        totalHRMMois: number;
        totalHeureChassisMois: number;
    };
}

export interface EnginEtatGeneralOption {
    id: string;
    name: string;
    siteId: string;
    siteName: string;
}

export interface ParcEtatGeneralOption {
    id: string;
    name: string;
    engins: EnginEtatGeneralOption[];
}

export interface TypeParcEtatGeneralOption {
    id: string;
    name: string;
    parcs: ParcEtatGeneralOption[];
}

type Totals = {
    nombreEngins: number;
    totalHRMMois: number;
    totalHeureChassisMois: number;
};

function safeNumber(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function emptyTotals(): Totals {
    return {
        nombreEngins: 0,
        totalHRMMois: 0,
        totalHeureChassisMois: 0,
    };
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
 * type de parc -> parc -> sites disponibles dans le parc.
 */
export async function getOptionsRapportEtatGeneral(): Promise<ActionResponse> {
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
            where: {
                tenantId,
            },
            select: {
                id: true,
                name: true,
                parcs: {
                    where: {
                        tenantId,
                    },
                    select: {
                        id: true,
                        name: true,
                        engins: {
                            where: {
                                tenantId,
                                active: true,
                                site: {
                                    tenantId,
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
                            orderBy: {
                                name: "asc",
                            },
                        },
                    },
                    orderBy: {
                        name: "asc",
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
        });

        const data: TypeParcEtatGeneralOption[] = typeParcs.map(
            (typeParc) => ({
                id: typeParc.id,
                name: typeParc.name,
                parcs: typeParc.parcs.map((parc) => ({
                    id: parc.id,
                    name: parc.name,
                    engins: parc.engins.map((engin) => ({
                        id: engin.id,
                        name: engin.name,
                        siteId: engin.siteId,
                        siteName: engin.site.name,
                    })),
                })),
            }),
        );

        return {
            data,
            success: true,
            message: "Options récupérées avec succès.",
            meta: {
                totalItems: data.length,
                totalPages: 1,
                currentPage: 1,
                itemsPerPage: data.length,
            },
        };
    } catch (error) {
        console.error(
            "Erreur récupération des options État général :",
            error,
        );

        return {
            data: [],
            success: false,
            message:
                "Impossible de récupérer les options du rapport État général.",
        };
    }
}

/**
 * Génération du rapport pour :
 * - une période ;
 * - un type de parc ;
 * - un parc ;
 * - zéro, un ou plusieurs sites.
 *
 * Sans site sélectionné, tous les sites du parc sont pris en compte.
 */
export async function getRapportEtatGeneral(
    filters?: SearchParamsRapportEtatGeneral,
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

        /*
         * Vérification que le parc appartient bien au type de parc
         * sélectionné et au tenant actif.
         */
        const parcSelectionne = await prisma.parc.findFirst({
            where: {
                id: parcId,
                typeparcId: typeParcId,
                tenantId,
                typeparc: {
                    tenantId,
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
                message:
                    "Le parc sélectionné n'appartient pas au type de parc ou au tenant actif.",
            };
        }

        const debutMois = new Date(Date.UTC(annee, mois - 1, 1));
        const finMois = new Date(Date.UTC(annee, mois, 1));

        /*
         * Un tableau siteIds vide signifie :
         * ne pas appliquer de filtre par site.
         */
        const engins = await prisma.engin.findMany({
            where: {
                tenantId,
                active: true,
                parcId,
                parc: {
                    tenantId,
                    typeparcId: typeParcId,
                    typeparc: {
                        tenantId,
                    },
                },
            },
            select: {
                id: true,
                name: true,
                initialHeureChassis: true,
                site: {
                    select: {
                        name: true,
                    },
                },
                saisiehrms: {
                    where: {
                        tenantId,
                        du: {
                            gte: debutMois,
                            lt: finMois,
                        },
                    },
                    select: {
                        hrm: true,
                        saisiehim: {
                            where: {
                                tenantId,
                            },
                            select: {
                                him: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
        });

        if (engins.length === 0) {
            return {
                data: [],
                success: true,
                message:
                    "Aucun engin actif trouvé pour les critères sélectionnés.",
                meta: {
                    totalItems: 0,
                    totalPages: 0,
                    currentPage: 1,
                    itemsPerPage: 0,
                },
            };
        }

        /*
         * Calcul des valeurs de chaque engin.
         */
        const enginsResult: EnginEtatGeneral[] = engins.map((engin) => {
            const hrmMois = engin.saisiehrms.reduce(
                (total, saisie) =>
                    total + safeNumber(saisie.hrm),
                0,
            );

            /*
             * Formule conservée du projet gmao_nextjs :
             * heures châssis mensuelles = somme des HIM du mois.
             */
            const heureChassisMois = engin.saisiehrms.reduce(
                (totalHim, saisie) =>
                    totalHim +
                    saisie.saisiehim.reduce(
                        (totalSaisie, panne) =>
                            totalSaisie + safeNumber(panne.him),
                        0,
                    ),
                0,
            );

            const initialHeureChassis = safeNumber(
                engin.initialHeureChassis,
            );

            return {
                enginId: engin.id,
                enginName: engin.name,
                siteName: engin.site.name,
                parcName: parcSelectionne.name,
                typeParcName: parcSelectionne.typeparc.name,
                initialHeureChassis,
                hrmMois,
                heureChassisMois,
                totalHeureChassis:
                    initialHeureChassis + heureChassisMois,
            };
        });

        /*
         * Les totaux sont calculés uniquement sur les engins
         * correspondant aux critères, y compris le filtre par site.
         */
        const total = enginsResult.reduce<Totals>(
            (totaux, engin) => {
                totaux.nombreEngins += 1;
                totaux.totalHRMMois += engin.hrmMois;
                totaux.totalHeureChassisMois +=
                    engin.heureChassisMois;

                return totaux;
            },
            emptyTotals(),
        );

        const result: TypeParcEtatGeneral[] = [
            {
                typeParcId: parcSelectionne.typeparc.id,
                typeParcName: parcSelectionne.typeparc.name,
                parcs: [
                    {
                        parcId: parcSelectionne.id,
                        parcName: parcSelectionne.name,
                        typeParcId: parcSelectionne.typeparc.id,
                        typeParcName: parcSelectionne.typeparc.name,
                        engins: enginsResult,
                        totalParc: total,
                    },
                ],
                totalTypeParc: { ...total },
            },
        ];

        return {
            data: result,
            success: true,
            message: "Rapport État général généré avec succès.",
            meta: {
                totalItems: result.length,
                totalPages: 1,
                currentPage: 1,
                itemsPerPage: result.length,
            },
        };
    } catch (error) {
        console.error("Erreur rapport État général :", error);

        return {
            data: [],
            success: false,
            message:
                "Une erreur est survenue lors de la génération du rapport État général.",
        };
    }
}