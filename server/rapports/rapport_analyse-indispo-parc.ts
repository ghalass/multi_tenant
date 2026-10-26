
"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { getSession } from "@/lib/auth";
import { ActionResponse } from "@/lib/types";

export interface SearchParamsAnalyseIndispoParc {
    mois?: number;
    annee?: number;
}

type ValeursPanne = {
    niMois: number;
    niAnnee: number;
    himMois: number;
    himAnnee: number;
};

type TotauxPanne = ValeursPanne & {
    coeffNiMois: number;
    coeffNiAnnee: number;
    coeffHimMois: number;
    coeffHimAnnee: number;
};

type PanneResult = {
    panneId: string;
    panneName: string;
} & TotauxPanne;

type TypePanneResult = {
    typepanneId: string;
    typepanneName: string;
    pannes: PanneResult[];
    totalTypePanne: TotauxPanne;
};

type TotauxParc = TotauxPanne & {
    nhoMois: number;
    nhoAnnee: number;
    indispMois: number;
    indispAnnee: number;
};

type ParcResult = {
    parcId: string;
    parcName: string;
    nbreEngins: number;
    nhoMois: number;
    nhoAnnee: number;
    pannes: TypePanneResult[];
    totalParc: TotauxParc;
};

type TypeParcResult = {
    typeParcId: string;
    typeParcName: string;
    parcs: ParcResult[];
    totalTypeParc: TotauxParc;
};

const round = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100;

const numberOrZero = (value: unknown) => {
    const valueAsNumber = Number(value);
    return Number.isFinite(valueAsNumber) ? valueAsNumber : 0;
};

function emptyPanneTotals(): TotauxPanne {
    return {
        niMois: 0,
        niAnnee: 0,
        himMois: 0,
        himAnnee: 0,
        coeffNiMois: 0,
        coeffNiAnnee: 0,
        coeffHimMois: 0,
        coeffHimAnnee: 0,
    };
}

function emptyParcTotals(): TotauxParc {
    return {
        ...emptyPanneTotals(),
        nhoMois: 0,
        nhoAnnee: 0,
        indispMois: 0,
        indispAnnee: 0,
    };
}

function addPanneTotals(
    target: TotauxPanne,
    source: ValeursPanne & Partial<TotauxPanne>,
) {
    target.niMois += source.niMois;
    target.niAnnee += source.niAnnee;
    target.himMois += source.himMois;
    target.himAnnee += source.himAnnee;
    target.coeffNiMois += source.coeffNiMois ?? 0;
    target.coeffNiAnnee += source.coeffNiAnnee ?? 0;
    target.coeffHimMois += source.coeffHimMois ?? 0;
    target.coeffHimAnnee += source.coeffHimAnnee ?? 0;
}

function roundPanneTotals(target: TotauxPanne) {
    target.niMois = round(target.niMois);
    target.niAnnee = round(target.niAnnee);
    target.himMois = round(target.himMois);
    target.himAnnee = round(target.himAnnee);
    target.coeffNiMois = round(target.coeffNiMois);
    target.coeffNiAnnee = round(target.coeffNiAnnee);
    target.coeffHimMois = round(target.coeffHimMois);
    target.coeffHimAnnee = round(target.coeffHimAnnee);
}

function roundParcTotals(target: TotauxParc) {
    roundPanneTotals(target);
    target.nhoMois = round(target.nhoMois);
    target.nhoAnnee = round(target.nhoAnnee);
    target.indispMois = round(target.indispMois);
    target.indispAnnee = round(target.indispAnnee);
}

/**
 * Récupère les types de parc, les parcs et le nombre d'engins actifs.
 * Toutes les données sont limitées au tenant de la session.
 */
export async function getOptionsRapportAnalyseIndispoParc(): Promise<ActionResponse> {
    const permission = await guard(ACTION.READ, RESOURCE.RAPPORT);

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
            data: [],
        };
    }

    const { currentTenantId } = await getSession();

    if (!currentTenantId) {
        return {
            success: false,
            message: "Sélectionnez un tenant avant de consulter ce rapport.",
            data: [],
        };
    }

    const tenant = await prisma.tenant.findFirst({
        where: {
            id: currentTenantId,
            active: true,
        },
        select: { id: true },
    });

    if (!tenant) {
        return {
            success: false,
            message: "Le tenant sélectionné est introuvable ou désactivé.",
            data: [],
        };
    }

    const typeParcs = await prisma.typeparc.findMany({
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
                    engins: {
                        where: {
                            tenantId: currentTenantId,
                            active: true,
                        },
                        select: { id: true },
                    },
                },
                orderBy: { name: "asc" },
            },
        },
        orderBy: { name: "asc" },
    });

    return {
        success: true,
        message: "Options récupérées avec succès.",
        data: typeParcs.map((typeParc) => ({
            id: typeParc.id,
            name: typeParc.name,
            parcs: typeParc.parcs.map((parc) => ({
                id: parc.id,
                name: parc.name,
                nbreEngins: parc.engins.length,
            })),
        })),
    };
}

/**
 * Analyse les indisponibilités du mois et du cumul annuel
 * jusqu'à la fin du mois sélectionné.
 */
export async function getRapportAnalyseIndispoParc(
    filters: SearchParamsAnalyseIndispoParc,
): Promise<ActionResponse> {
    const permission = await guard(ACTION.READ, RESOURCE.RAPPORT);

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
            data: [],
        };
    }

    const { currentTenantId } = await getSession();

    if (!currentTenantId) {
        return {
            success: false,
            message: "Sélectionnez un tenant avant de consulter ce rapport.",
            data: [],
        };
    }

    const tenant = await prisma.tenant.findFirst({
        where: {
            id: currentTenantId,
            active: true,
        },
        select: { id: true },
    });

    if (!tenant) {
        return {
            success: false,
            message: "Le tenant sélectionné est introuvable ou désactivé.",
            data: [],
        };
    }

    const mois = Number(filters.mois);
    const annee = Number(filters.annee);

    if (
        !Number.isInteger(mois) ||
        mois < 1 ||
        mois > 12 ||
        !Number.isInteger(annee) ||
        annee < 2000 ||
        annee > 9999
    ) {
        return {
            success: false,
            message: "Sélectionnez un mois et une année valides.",
            data: [],
        };
    }

    const debutMois = new Date(Date.UTC(annee, mois - 1, 1));
    const finMoisExclus = new Date(Date.UTC(annee, mois, 1));
    const debutAnnee = new Date(Date.UTC(annee, 0, 1));

    const joursMois = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
    const joursCumules =
        (finMoisExclus.getTime() - debutAnnee.getTime()) /
        (24 * 60 * 60 * 1000);

    const heuresParEnginMois = joursMois * 24;
    const heuresParEnginAnnee = joursCumules * 24;

    // Récupérer uniquement les parcs et les engins du tenant actif.
    const typeParcs = await prisma.typeparc.findMany({
        where: { tenantId: currentTenantId },
        select: {
            id: true,
            name: true,
            parcs: {
                where: { tenantId: currentTenantId },
                select: {
                    id: true,
                    name: true,
                    engins: {
                        where: {
                            tenantId: currentTenantId,
                            active: true,
                            site: { tenantId: currentTenantId },
                        },
                        select: { id: true },
                        orderBy: { name: "asc" },
                    },
                    pannes: {
                        where: { tenantId: currentTenantId },
                        select: {
                            id: true,
                            name: true,
                            typepanneId: true,
                            typepanne: {
                                select: {
                                    id: true,
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

    const enginIds = typeParcs.flatMap((typeParc) =>
        typeParc.parcs.flatMap((parc) =>
            parc.engins.map((engin) => engin.id),
        ),
    );

    // Les saisies sont limitées à la période cumulée et aux engins actifs
    // du tenant courant.
    const saisies = enginIds.length
        ? await prisma.saisiehrm.findMany({
            where: {
                tenantId: currentTenantId,
                enginId: { in: enginIds },
                du: {
                    gte: debutAnnee,
                    lt: finMoisExclus,
                },
                engin: {
                    tenantId: currentTenantId,
                    active: true,
                    site: { tenantId: currentTenantId },
                    parc: { tenantId: currentTenantId },
                },
            },
            select: {
                du: true,
                enginId: true,
                saisiehim: {
                    where: {
                        tenantId: currentTenantId,
                        panne: { tenantId: currentTenantId },
                    },
                    select: {
                        panneId: true,
                        him: true,
                        ni: true,
                    },
                },
            },
        })
        : [];

    const saisiesParParcEtPanne = new Map<
        string,
        ValeursPanne
    >();

    const enginParId = new Map<
        string,
        { parcId: string }
    >();

    for (const typeParc of typeParcs) {
        for (const parc of typeParc.parcs) {
            for (const engin of parc.engins) {
                enginParId.set(engin.id, { parcId: parc.id });
            }
        }
    }

    for (const saisie of saisies) {
        const engin = enginParId.get(saisie.enginId);
        if (!engin) continue;

        const estDansLeMois =
            saisie.du >= debutMois && saisie.du < finMoisExclus;

        for (const saisieHim of saisie.saisiehim) {
            const key = `${engin.parcId}:${saisieHim.panneId}`;

            const valeurs = saisiesParParcEtPanne.get(key) ?? {
                niMois: 0,
                niAnnee: 0,
                himMois: 0,
                himAnnee: 0,
            };

            valeurs.niAnnee += numberOrZero(saisieHim.ni);
            valeurs.himAnnee += numberOrZero(saisieHim.him);

            if (estDansLeMois) {
                valeurs.niMois += numberOrZero(saisieHim.ni);
                valeurs.himMois += numberOrZero(saisieHim.him);
            }

            saisiesParParcEtPanne.set(key, valeurs);
        }
    }

    const result: TypeParcResult[] = [];

    for (const typeParc of typeParcs) {
        const typeParcResult: TypeParcResult = {
            typeParcId: typeParc.id,
            typeParcName: typeParc.name,
            parcs: [],
            totalTypeParc: emptyParcTotals(),
        };

        for (const parc of typeParc.parcs) {
            const nbreEngins = parc.engins.length;

            // Comme dans gmao_nextjs, un parc sans engin actif est ignoré.
            if (nbreEngins === 0) continue;

            const nhoMois = nbreEngins * heuresParEnginMois;
            const nhoAnnee = nbreEngins * heuresParEnginAnnee;

            const totalBrut: ValeursPanne = {
                niMois: 0,
                niAnnee: 0,
                himMois: 0,
                himAnnee: 0,
            };

            const typesPanneMap = new Map<
                string,
                {
                    typepanneId: string;
                    typepanneName: string;
                    pannes: PanneResult[];
                    totalTypePanne: TotauxPanne;
                }
            >();

            // Première passe : totaux bruts du parc.
            for (const panne of parc.pannes) {
                const valeurs = saisiesParParcEtPanne.get(
                    `${parc.id}:${panne.id}`,
                ) ?? {
                    niMois: 0,
                    niAnnee: 0,
                    himMois: 0,
                    himAnnee: 0,
                };

                totalBrut.niMois += valeurs.niMois;
                totalBrut.niAnnee += valeurs.niAnnee;
                totalBrut.himMois += valeurs.himMois;
                totalBrut.himAnnee += valeurs.himAnnee;

                const typePanneId = panne.typepanneId;
                const typePanneName = panne.typepanne?.name ?? "Sans type";

                if (!typesPanneMap.has(typePanneId)) {
                    typesPanneMap.set(typePanneId, {
                        typepanneId: typePanneId,
                        typepanneName: typePanneName,
                        pannes: [],
                        totalTypePanne: emptyPanneTotals(),
                    });
                }
            }

            const indispMois =
                nhoMois > 0
                    ? (totalBrut.himMois / nhoMois) * 100
                    : 0;

            const indispAnnee =
                nhoAnnee > 0
                    ? (totalBrut.himAnnee / nhoAnnee) * 100
                    : 0;

            // Deuxième passe : détails par panne et coefficients.
            for (const panne of parc.pannes) {
                const valeurs = saisiesParParcEtPanne.get(
                    `${parc.id}:${panne.id}`,
                ) ?? {
                    niMois: 0,
                    niAnnee: 0,
                    himMois: 0,
                    himAnnee: 0,
                };

                const ligne: PanneResult = {
                    panneId: panne.id,
                    panneName: panne.name,
                    ...valeurs,
                    coeffNiMois:
                        totalBrut.niMois > 0
                            ? (valeurs.niMois * indispMois) /
                            totalBrut.niMois
                            : 0,
                    coeffNiAnnee:
                        totalBrut.niAnnee > 0
                            ? (valeurs.niAnnee * indispAnnee) /
                            totalBrut.niAnnee
                            : 0,
                    coeffHimMois:
                        totalBrut.himMois > 0
                            ? (valeurs.himMois * indispMois) /
                            totalBrut.himMois
                            : 0,
                    coeffHimAnnee:
                        totalBrut.himAnnee > 0
                            ? (valeurs.himAnnee * indispAnnee) /
                            totalBrut.himAnnee
                            : 0,
                };

                const typePanne = typesPanneMap.get(panne.typepanneId);
                if (!typePanne) continue;

                typePanne.pannes.push(ligne);
                addPanneTotals(typePanne.totalTypePanne, ligne);
            }

            const pannesResult: TypePanneResult[] = [];

            for (const typePanne of typesPanneMap.values()) {
                roundPanneTotals(typePanne.totalTypePanne);

                typePanne.pannes.sort((a, b) =>
                    a.panneName.localeCompare(b.panneName, "fr"),
                );

                pannesResult.push(typePanne);
            }

            pannesResult.sort((a, b) =>
                a.typepanneName.localeCompare(b.typepanneName, "fr"),
            );

            const totalParc: TotauxParc = {
                ...emptyPanneTotals(),
                nhoMois,
                nhoAnnee,
                indispMois: round(indispMois),
                indispAnnee: round(indispAnnee),
                niMois: round(totalBrut.niMois),
                niAnnee: round(totalBrut.niAnnee),
                himMois: round(totalBrut.himMois),
                himAnnee: round(totalBrut.himAnnee),
                // Le coefficient du total du parc correspond à son taux
                // d'indisponibilité.
                coeffNiMois: round(indispMois),
                coeffNiAnnee: round(indispAnnee),
                coeffHimMois: round(indispMois),
                coeffHimAnnee: round(indispAnnee),
            };

            const parcResult: ParcResult = {
                parcId: parc.id,
                parcName: parc.name,
                nbreEngins,
                nhoMois,
                nhoAnnee,
                pannes: pannesResult,
                totalParc,
            };

            typeParcResult.parcs.push(parcResult);

            addPanneTotals(typeParcResult.totalTypeParc, totalParc);
            typeParcResult.totalTypeParc.nhoMois += nhoMois;
            typeParcResult.totalTypeParc.nhoAnnee += nhoAnnee;
            typeParcResult.totalTypeParc.indispMois += indispMois;
            typeParcResult.totalTypeParc.indispAnnee += indispAnnee;
        }

        // Calcul des totaux de type de parc.
        const total = typeParcResult.totalTypeParc;

        total.indispMois =
            total.nhoMois > 0
                ? (total.himMois / total.nhoMois) * 100
                : 0;

        total.indispAnnee =
            total.nhoAnnee > 0
                ? (total.himAnnee / total.nhoAnnee) * 100
                : 0;

        total.coeffNiMois = total.coeffHimMois = total.indispMois;
        total.coeffNiAnnee = total.coeffHimAnnee = total.indispAnnee;

        roundParcTotals(total);

        if (typeParcResult.parcs.length > 0) {
            result.push(typeParcResult);
        }
    }

    return {
        success: true,
        message: "Analyse d'indisponibilité générée avec succès.",
        data: result,
        meta: {
            totalItems: result.length,
            totalPages: 1,
            currentPage: 1,
            itemsPerPage: result.length,
        },
    };
}
