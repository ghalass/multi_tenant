"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { getSession } from "@/lib/auth";
import type { ActionResponse } from "@/lib/types/types";

export interface SearchParamsRapportEtatMensuel {
    mois?: number;
    annee?: number;
    typeParcId?: string;
    parcId?: string;
}

type RawMetrics = {
    nho: number;
    him: number;
    hrm: number;
    ni: number;
};

type Metrics = RawMetrics & {
    hrd: number;
    mttr: number;
    disp: number;
    util: number;
    sw: number;
    tdm: number;
    mtbf: number | null;
};

type PeriodMetrics = {
    nho: number;
    metrics: Metrics;
};

const safeNumber = (value: unknown): number => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};

const round = (value: number): number =>
    Math.round((value + Number.EPSILON) * 100) / 100;

function emptyRawMetrics(): RawMetrics {
    return { nho: 0, him: 0, hrm: 0, ni: 0 };
}

function calculateMetrics(raw: RawMetrics): Metrics {
    const { nho, him, hrm, ni } = raw;
    const hrd = nho - him - hrm;

    return {
        nho: round(nho),
        him: round(him),
        hrm: round(hrm),
        ni,
        hrd: round(hrd),
        mttr: round(ni > 0 ? him / ni : 0),
        disp: round(nho > 0 ? (1 - him / nho) * 100 : 0),
        util: round(hrm + hrd !== 0 ? (hrm / (hrm + hrd)) * 100 : 0),
        sw: 0,
        tdm: round(nho > 0 ? (hrm / nho) * 100 : 0),
        mtbf: ni > 0 ? round(hrm / ni) : null,
    };
}

function createPeriodMetrics(raw: RawMetrics): PeriodMetrics {
    return {
        nho: round(raw.nho),
        metrics: calculateMetrics(raw),
    };
}

function addRawMetrics(target: RawMetrics, source: RawMetrics): void {
    target.nho += source.nho;
    target.him += source.him;
    target.hrm += source.hrm;
    target.ni += source.ni;
}

export async function getOptionsRapportEtatMensuel(): Promise<ActionResponse> {
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
            message: "Sélectionnez un tenant avant de consulter ce rapport.",
        };
    }

    const tenant = await prisma.tenant.findFirst({
        where: { id: currentTenantId, active: true },
        select: { id: true },
    });

    if (!tenant) {
        return {
            data: [],
            success: false,
            message: "Le tenant sélectionné est introuvable ou désactivé.",
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
                        },
                        select: {
                            id: true,
                            name: true,
                        },
                        orderBy: { name: "asc" },
                    },
                },
                orderBy: { name: "asc" },
            },
        },
        orderBy: { name: "asc" },
    });

    return {
        data: typeParcs,
        success: true,
        message: "Options récupérées avec succès.",
        meta: {
            totalItems: typeParcs.length,
            totalPages: 1,
            currentPage: 1,
            itemsPerPage: typeParcs.length,
        },
    };
}

export async function getRapportEtatMensuel(
    filters?: SearchParamsRapportEtatMensuel,
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
            message: "Sélectionnez un tenant avant de consulter ce rapport.",
        };
    }

    const tenant = await prisma.tenant.findFirst({
        where: { id: currentTenantId, active: true },
        select: { id: true },
    });

    if (!tenant) {
        return {
            data: [],
            success: false,
            message: "Le tenant sélectionné est introuvable ou désactivé.",
        };
    }

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

    const debutMois = new Date(Date.UTC(annee, mois - 1, 1));
    const finMois = new Date(Date.UTC(annee, mois, 1));
    const debutAnnee = new Date(Date.UTC(annee, 0, 1));

    const engins = await prisma.engin.findMany({
        where: {
            tenantId: currentTenantId,
            active: true,
            parcId,
            parc: {
                tenantId: currentTenantId,
                typeparcId: typeParcId,
                typeparc: { tenantId: currentTenantId },
            },
            site: { tenantId: currentTenantId },
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
                    typeparc: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
        orderBy: { name: "asc" },
    });

    if (engins.length === 0) {
        return {
            data: [],
            success: true,
            message: "Aucun engin actif trouvé pour ce parc.",
            meta: {
                totalItems: 0,
                totalPages: 0,
                currentPage: 1,
                itemsPerPage: 0,
            },
        };
    }

    const enginIds = engins.map((engin) => engin.id);

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
            nho: true,
            hrm: true,
            saisiehim: {
                where: { tenantId: currentTenantId },
                select: {
                    him: true,
                    ni: true,
                },
            },
        },
    });

    const cumulParEngin = new Map<
        string,
        { mois: RawMetrics; annee: RawMetrics }
    >();

    for (const engin of engins) {
        cumulParEngin.set(engin.id, {
            mois: emptyRawMetrics(),
            annee: emptyRawMetrics(),
        });
    }

    for (const saisie of saisies) {
        const cumul = cumulParEngin.get(saisie.enginId);
        if (!cumul) continue;

        const nho = safeNumber(saisie.nho);
        const hrm = safeNumber(saisie.hrm);

        let him = 0;
        let ni = 0;

        for (const panne of saisie.saisiehim) {
            him += safeNumber(panne.him);
            ni += safeNumber(panne.ni);
        }

        cumul.annee.nho += nho;
        cumul.annee.hrm += hrm;
        cumul.annee.him += him;
        cumul.annee.ni += ni;

        if (saisie.du >= debutMois && saisie.du < finMois) {
            cumul.mois.nho += nho;
            cumul.mois.hrm += hrm;
            cumul.mois.him += him;
            cumul.mois.ni += ni;
        }
    }

    const objectifs = await prisma.objectif.findMany({
        where: {
            tenantId: currentTenantId,
            annee,
            parc: { tenantId: currentTenantId },
            site: { tenantId: currentTenantId },
            parcId,
        },
        select: {
            parcId: true,
            siteId: true,
            dispo: true,
            tdm: true,
        },
    });

    const objectifsParParcSite = new Map(
        objectifs.map((objectif) => [
            `${objectif.parcId}:${objectif.siteId}`,
            objectif,
        ]),
    );

    const typeParc = engins[0].parc.typeparc;
    const parc = engins[0].parc;

    const rawParcMois = emptyRawMetrics();
    const rawParcAnnee = emptyRawMetrics();

    let objectifDispoTotal = 0;
    let objectifDispoCount = 0;
    let objectifUtilTotal = 0;
    let objectifUtilCount = 0;

    const enginsResult = engins.map((engin) => {
        const cumul = cumulParEngin.get(engin.id)!;

        addRawMetrics(rawParcMois, cumul.mois);
        addRawMetrics(rawParcAnnee, cumul.annee);

        const objectif = objectifsParParcSite.get(
            `${engin.parcId}:${engin.siteId}`,
        );

        if (objectif?.dispo != null) {
            objectifDispoTotal += safeNumber(objectif.dispo);
            objectifDispoCount++;
        }

        if (objectif?.tdm != null) {
            objectifUtilTotal += safeNumber(objectif.tdm);
            objectifUtilCount++;
        }

        const mensuel = createPeriodMetrics(cumul.mois);
        const annuel = createPeriodMetrics(cumul.annee);

        return {
            enginId: engin.id,
            enginName: engin.name,
            nbreEngins: 1,
            nhoMois: mensuel.nho,
            nhoAnnee: annuel.nho,
            aggregatesMois: mensuel.metrics,
            aggregatesAnnee: annuel.metrics,
            objectifDispo:
                objectif?.dispo != null
                    ? round(safeNumber(objectif.dispo))
                    : null,
            objectifUtil:
                objectif?.tdm != null
                    ? round(safeNumber(objectif.tdm))
                    : null,
        };
    });

    const parcMensuel = createPeriodMetrics(rawParcMois);
    const parcAnnuel = createPeriodMetrics(rawParcAnnee);

    const result = [
        {
            typeParcId: typeParc.id,
            typeParcName: typeParc.name,
            parcs: [
                {
                    parcId: parc.id,
                    parcName: parc.name,
                    nbreEngins: engins.length,
                    nhoMois: parcMensuel.nho,
                    nhoAnnee: parcAnnuel.nho,
                    aggregatesMois: parcMensuel.metrics,
                    aggregatesAnnee: parcAnnuel.metrics,
                    objectifDispo:
                        objectifDispoCount > 0
                            ? round(objectifDispoTotal / objectifDispoCount)
                            : null,
                    objectifUtil:
                        objectifUtilCount > 0
                            ? round(objectifUtilTotal / objectifUtilCount)
                            : null,
                    engins: enginsResult,
                },
            ],
            totalTypeParc: {
                nbreEngins: engins.length,
                nhoMois: parcMensuel.nho,
                nhoAnnee: parcAnnuel.nho,
                aggregatesMois: parcMensuel.metrics,
                aggregatesAnnee: parcAnnuel.metrics,
            },
        },
    ];

    return {
        data: result,
        success: true,
        message: "Rapport mensuel généré avec succès.",
        meta: {
            totalItems: result.length,
            totalPages: 1,
            currentPage: 1,
            itemsPerPage: result.length,
        },
    };
}