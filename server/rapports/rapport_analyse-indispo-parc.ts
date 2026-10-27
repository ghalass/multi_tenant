
"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { getSession } from "@/lib/auth";
import { ActionResponse } from "@/lib/types/types";

export interface SearchParamsAnalyseIndispoParc {
    mois?: number;
    annee?: number;
    typeParcId?: string;
    parcId?: string;
    enginId?: string;
}

type ValeursBrutes = {
    niMois: number;
    niAnnee: number;
    himMois: number;
    himAnnee: number;
};

type TotauxPanne = ValeursBrutes & {
    coeffNiMois: number;
    coeffNiAnnee: number;
    coeffHimMois: number;
    coeffHimAnnee: number;
};

type PanneDefinition = {
    id: string;
    name: string;
    description: string | null;
    typepanneId: string;
    typepanneName: string;
};

type PanneResult = {
    panneId: string;
    panneName: string;
    description: string | null;
} & TotauxPanne;

type TypePanneResult = {
    typepanneId: string;
    typepanneName: string;
    pannes: PanneResult[];
    totalTypePanne: TotauxPanne;
};

type TotauxScope = TotauxPanne & {
    nhoMois: number;
    nhoAnnee: number;
    indispMois: number;
    indispAnnee: number;
};

type ScopeResult = {
    scopeId: string;
    scopeName: string;
    nbreEngins: number;
    nhoMois: number;
    nhoAnnee: number;
    pannes: TypePanneResult[];
    total: TotauxScope;
};

type TypeParcResult = {
    typeParcId: string;
    typeParcName: string;
    parc: ScopeResult;
    engins: ScopeResult[];
};

const round = (value: number): number =>
    Math.round((value + Number.EPSILON) * 100) / 100;

const safeNumber = (value: unknown): number => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};

function emptyValeurs(): ValeursBrutes {
    return {
        niMois: 0,
        niAnnee: 0,
        himMois: 0,
        himAnnee: 0,
    };
}

function emptyTotaux(): TotauxPanne {
    return {
        ...emptyValeurs(),
        coeffNiMois: 0,
        coeffNiAnnee: 0,
        coeffHimMois: 0,
        coeffHimAnnee: 0,
    };
}

function emptyTotauxScope(): TotauxScope {
    return {
        ...emptyTotaux(),
        nhoMois: 0,
        nhoAnnee: 0,
        indispMois: 0,
        indispAnnee: 0,
    };
}

function addValeurs(target: ValeursBrutes, source: ValeursBrutes) {
    target.niMois += source.niMois;
    target.niAnnee += source.niAnnee;
    target.himMois += source.himMois;
    target.himAnnee += source.himAnnee;
}

function addTotaux(target: TotauxPanne, source: TotauxPanne) {
    target.niMois += source.niMois;
    target.niAnnee += source.niAnnee;
    target.himMois += source.himMois;
    target.himAnnee += source.himAnnee;
    target.coeffNiMois += source.coeffNiMois;
    target.coeffNiAnnee += source.coeffNiAnnee;
    target.coeffHimMois += source.coeffHimMois;
    target.coeffHimAnnee += source.coeffHimAnnee;
}

function roundTotaux(target: TotauxPanne) {
    target.niMois = round(target.niMois);
    target.niAnnee = round(target.niAnnee);
    target.himMois = round(target.himMois);
    target.himAnnee = round(target.himAnnee);
    target.coeffNiMois = round(target.coeffNiMois);
    target.coeffNiAnnee = round(target.coeffNiAnnee);
    target.coeffHimMois = round(target.coeffHimMois);
    target.coeffHimAnnee = round(target.coeffHimAnnee);
}

function buildScopeResult({
    scopeId,
    scopeName,
    nbreEngins,
    heuresMois,
    heuresAnnee,
    definitions,
    valeursParPanne,
}: {
    scopeId: string;
    scopeName: string;
    nbreEngins: number;
    heuresMois: number;
    heuresAnnee: number;
    definitions: PanneDefinition[];
    valeursParPanne: Map<string, ValeursBrutes>;
}): ScopeResult {
    const nhoMois = nbreEngins * heuresMois;
    const nhoAnnee = nbreEngins * heuresAnnee;

    const totalBrut = emptyValeurs();

    for (const panne of definitions) {
        const valeurs = valeursParPanne.get(panne.id) ?? emptyValeurs();
        addValeurs(totalBrut, valeurs);
    }

    const indispMois =
        nhoMois > 0 ? (totalBrut.himMois / nhoMois) * 100 : 0;

    const indispAnnee =
        nhoAnnee > 0 ? (totalBrut.himAnnee / nhoAnnee) * 100 : 0;

    const typePannesMap = new Map<string, TypePanneResult>();

    for (const definition of definitions) {
        if (!typePannesMap.has(definition.typepanneId)) {
            typePannesMap.set(definition.typepanneId, {
                typepanneId: definition.typepanneId,
                typepanneName: definition.typepanneName,
                pannes: [],
                totalTypePanne: emptyTotaux(),
            });
        }

        const valeurs = valeursParPanne.get(definition.id) ?? emptyValeurs();

        const ligne: PanneResult = {
            panneId: definition.id,
            panneName: definition.name,
            description: definition.description,
            ...valeurs,
            coeffNiMois:
                totalBrut.niMois > 0
                    ? (valeurs.niMois * indispMois) / totalBrut.niMois
                    : 0,
            coeffNiAnnee:
                totalBrut.niAnnee > 0
                    ? (valeurs.niAnnee * indispAnnee) / totalBrut.niAnnee
                    : 0,
            coeffHimMois:
                totalBrut.himMois > 0
                    ? (valeurs.himMois * indispMois) / totalBrut.himMois
                    : 0,
            coeffHimAnnee:
                totalBrut.himAnnee > 0
                    ? (valeurs.himAnnee * indispAnnee) / totalBrut.himAnnee
                    : 0,
        };

        const typePanne = typePannesMap.get(definition.typepanneId);
        if (!typePanne) continue;

        typePanne.pannes.push(ligne);
        addTotaux(typePanne.totalTypePanne, ligne);
    }

    const pannes = Array.from(typePannesMap.values())
        .map((typePanne) => {
            typePanne.pannes.sort((a, b) =>
                a.panneName.localeCompare(b.panneName, "fr"),
            );

            roundTotaux(typePanne.totalTypePanne);
            return typePanne;
        })
        .sort((a, b) =>
            a.typepanneName.localeCompare(b.typepanneName, "fr"),
        );

    const total: TotauxScope = {
        ...emptyTotaux(),
        nhoMois,
        nhoAnnee,
        niMois: round(totalBrut.niMois),
        niAnnee: round(totalBrut.niAnnee),
        himMois: round(totalBrut.himMois),
        himAnnee: round(totalBrut.himAnnee),
        indispMois: round(indispMois),
        indispAnnee: round(indispAnnee),
        coeffNiMois: round(indispMois),
        coeffNiAnnee: round(indispAnnee),
        coeffHimMois: round(indispMois),
        coeffHimAnnee: round(indispAnnee),
    };

    return {
        scopeId,
        scopeName,
        nbreEngins,
        nhoMois,
        nhoAnnee,
        pannes,
        total,
    };
}

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
        where: { id: currentTenantId, active: true },
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
                        select: { id: true, name: true },
                        orderBy: { name: "asc" },
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
        data: typeParcs,
        meta: {
            totalItems: typeParcs.length,
            totalPages: 1,
            currentPage: 1,
            itemsPerPage: typeParcs.length,
        },
    };
}

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
        where: { id: currentTenantId, active: true },
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
    const typeParcId = filters.typeParcId;
    const parcId = filters.parcId;
    const enginId = filters.enginId || undefined;

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

    if (!typeParcId || !parcId) {
        return {
            success: false,
            message: "Sélectionnez un type de parc et un parc.",
            data: [],
        };
    }

    const debutMois = new Date(Date.UTC(annee, mois - 1, 1));
    const finMois = new Date(Date.UTC(annee, mois, 1));
    const debutAnnee = new Date(Date.UTC(annee, 0, 1));

    const heuresMois =
        new Date(Date.UTC(annee, mois, 0)).getUTCDate() * 24;

    const heuresAnnee =
        (finMois.getTime() - debutAnnee.getTime()) /
        (24 * 60 * 60 * 1000) *
        24;

    const parc = await prisma.parc.findFirst({
        where: {
            id: parcId,
            tenantId: currentTenantId,
            typeparcId: typeParcId,
            typeparc: { tenantId: currentTenantId },
        },
        select: {
            id: true,
            name: true,
            typeparc: {
                select: { id: true, name: true },
            },
            pannes: {
                where: { tenantId: currentTenantId },
                select: {
                    id: true,
                    name: true,
                    description: true,
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
            engins: {
                where: {
                    tenantId: currentTenantId,
                    active: true,
                    site: { tenantId: currentTenantId },
                },
                select: {
                    id: true,
                    name: true,
                },
                orderBy: { name: "asc" },
            },
        },
    });

    if (!parc) {
        return {
            success: false,
            message: "Le parc sélectionné n'existe pas dans ce tenant.",
            data: [],
        };
    }

    if (
        enginId &&
        !parc.engins.some((engin) => engin.id === enginId)
    ) {
        return {
            success: false,
            message: "L'engin sélectionné n'appartient pas à ce parc ou n'est pas actif.",
            data: [],
        };
    }

    if (parc.engins.length === 0) {
        return {
            success: true,
            message: "Aucun engin actif trouvé dans ce parc.",
            data: [],
            meta: {
                totalItems: 0,
                totalPages: 0,
                currentPage: 1,
                itemsPerPage: 0,
            },
        };
    }

    const definitions: PanneDefinition[] = parc.pannes.map((panne) => ({
        id: panne.id,
        name: panne.name,
        description: panne.description,
        typepanneId: panne.typepanneId,
        typepanneName: panne.typepanne.name,
    }));

    const enginIds = parc.engins.map((engin) => engin.id);

    const saisies = await prisma.saisiehrm.findMany({
        where: {
            tenantId: currentTenantId,
            enginId: { in: enginIds },
            du: {
                gte: debutAnnee,
                lt: finMois,
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
    });

    const parcValeurs = new Map<string, ValeursBrutes>();
    const valeursParEngin = new Map<
        string,
        Map<string, ValeursBrutes>
    >();

    for (const engin of parc.engins) {
        valeursParEngin.set(engin.id, new Map());
    }

    const panneIds = new Set(definitions.map((panne) => panne.id));

    for (const saisie of saisies) {
        const dansLeMois =
            saisie.du >= debutMois && saisie.du < finMois;

        for (const detail of saisie.saisiehim) {
            if (!panneIds.has(detail.panneId)) continue;

            const valeursParc =
                parcValeurs.get(detail.panneId) ?? emptyValeurs();

            const valeursEnginMap = valeursParEngin.get(saisie.enginId);
            if (!valeursEnginMap) continue;

            const valeursEngin =
                valeursEnginMap.get(detail.panneId) ?? emptyValeurs();

            const ni = safeNumber(detail.ni);
            const him = safeNumber(detail.him);

            valeursParc.niAnnee += ni;
            valeursParc.himAnnee += him;
            valeursEngin.niAnnee += ni;
            valeursEngin.himAnnee += him;

            if (dansLeMois) {
                valeursParc.niMois += ni;
                valeursParc.himMois += him;
                valeursEngin.niMois += ni;
                valeursEngin.himMois += him;
            }

            parcValeurs.set(detail.panneId, valeursParc);
            valeursEnginMap.set(detail.panneId, valeursEngin);
        }
    }

    const parcResult = buildScopeResult({
        scopeId: parc.id,
        scopeName: parc.name,
        nbreEngins: parc.engins.length,
        heuresMois,
        heuresAnnee,
        definitions,
        valeursParPanne: parcValeurs,
    });

    const enginsResult = parc.engins
        .filter((engin) => !enginId || engin.id === enginId)
        .map((engin) =>
            buildScopeResult({
                scopeId: engin.id,
                scopeName: engin.name,
                nbreEngins: 1,
                heuresMois,
                heuresAnnee,
                definitions,
                valeursParPanne:
                    valeursParEngin.get(engin.id) ?? new Map(),
            }),
        );

    const result: TypeParcResult[] = [
        {
            typeParcId: parc.typeparc.id,
            typeParcName: parc.typeparc.name,
            parc: parcResult,
            engins: enginsResult,
        },
    ];

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
