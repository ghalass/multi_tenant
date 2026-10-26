
"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { getSession } from "@/lib/auth";
import { ActionResponse } from "@/lib/types";

export interface SearchParamsRapportEtatMensuel {
    mois?: number;
    annee?: number;
}

type RawMetrics = {
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
    mtbf: number;
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

function calculateMetrics(
    raw: RawMetrics,
    nho: number,
): Metrics {
    const { him, hrm, ni } = raw;
    const hrd = nho - (him + hrm);

    return {
        him: round(him),
        hrm: round(hrm),
        ni,
        hrd: round(hrd),
        mttr: round(ni > 0 ? him / ni : 0),
        disp: round(nho > 0 ? (1 - him / nho) * 100 : 0),
        util: round(hrm + hrd !== 0 ? (hrm / (hrm + hrd)) * 100 : 0),
        sw: 0,
        tdm: round(nho > 0 ? (hrm / nho) * 100 : 0),
        mtbf: round(ni > 0 ? hrm / ni : 0),
    };
}

function createPeriodMetrics(
    raw: RawMetrics,
    nbreEngins: number,
    heuresParEngin: number,
): PeriodMetrics {
    const nho = nbreEngins * heuresParEngin;

    return {
        nho,
        metrics: calculateMetrics(raw, nho),
    };
}

function emptyRawMetrics(): RawMetrics {
    return { him: 0, hrm: 0, ni: 0 };
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
        where: {
            id: currentTenantId,
            active: true,
        },
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

    // Les bornes sont en UTC et la date de fin est exclusive.
    const debutMois = new Date(Date.UTC(annee, mois - 1, 1));
    const finMois = new Date(Date.UTC(annee, mois, 1));
    const debutAnnee = new Date(Date.UTC(annee, 0, 1));

    const joursMois = new Date(
        Date.UTC(annee, mois, 0),
    ).getUTCDate();

    const joursCumules =
        (finMois.getTime() - debutAnnee.getTime()) /
        (24 * 60 * 60 * 1000);

    const heuresMois = joursMois * 24;
    const heuresCumulees = joursCumules * 24;

    // Les engins et toutes les données liées sont limités au tenant courant.
    const engins = await prisma.engin.findMany({
        where: {
            tenantId: currentTenantId,
            active: true,
            parc: {
                tenantId: currentTenantId,
                typeparc: {
                    tenantId: currentTenantId,
                },
            },
            site: {
                tenantId: currentTenantId,
            },
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
        orderBy: {
            name: "asc",
        },
    });

    if (engins.length === 0) {
        return {
            data: [],
            success: true,
            message: "Aucun engin actif trouvé pour ce tenant.",
            meta: {
                totalItems: 0,
                totalPages: 0,
                currentPage: 1,
                itemsPerPage: 0,
            },
        };
    }

    const enginIds = engins.map((engin) => engin.id);

    // Récupérer HRM et les HIM/NI associés en une seule lecture.
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
            hrm: true,
            saisiehim: {
                where: {
                    tenantId: currentTenantId,
                },
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

        const hrm = safeNumber(saisie.hrm);
        let him = 0;
        let ni = 0;

        for (const panne of saisie.saisiehim) {
            him += safeNumber(panne.him);
            ni += safeNumber(panne.ni);
        }

        cumul.annee.hrm += hrm;
        cumul.annee.him += him;
        cumul.annee.ni += ni;

        if (saisie.du >= debutMois && saisie.du < finMois) {
            cumul.mois.hrm += hrm;
            cumul.mois.him += him;
            cumul.mois.ni += ni;
        }
    }

    // Les objectifs sont définis par année, parc et site.
    const objectifs = await prisma.objectif.findMany({
        where: {
            tenantId: currentTenantId,
            annee,
            parc: { tenantId: currentTenantId },
            site: { tenantId: currentTenantId },
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

    // Regrouper les engins par type de parc, puis par parc.
    const groupes = new Map<
        string,
        {
            typeParcId: string;
            typeParcName: string;
            parcs: Map<string, typeof engins>;
        }
    >();

    for (const engin of engins) {
        const typeParc = engin.parc.typeparc;

        if (!groupes.has(typeParc.id)) {
            groupes.set(typeParc.id, {
                typeParcId: typeParc.id,
                typeParcName: typeParc.name,
                parcs: new Map(),
            });
        }

        const groupe = groupes.get(typeParc.id)!;

        if (!groupe.parcs.has(engin.parcId)) {
            groupe.parcs.set(engin.parcId, []);
        }

        groupe.parcs.get(engin.parcId)!.push(engin);
    }

    const result = [...groupes.values()]
        .sort((a, b) => a.typeParcName.localeCompare(b.typeParcName))
        .map((groupe) => {
            const parcs = [...groupe.parcs.entries()]
                .map(([parcId, parcEngins]) => {
                    const parc = parcEngins[0].parc;
                    const nbreEngins = parcEngins.length;

                    const rawMois = emptyRawMetrics();
                    const rawAnnee = emptyRawMetrics();

                    let objectifDispoTotal = 0;
                    let objectifDispoCount = 0;
                    let objectifUtilTotal = 0;
                    let objectifUtilCount = 0;

                    for (const engin of parcEngins) {
                        const cumul = cumulParEngin.get(engin.id);
                        if (!cumul) continue;

                        rawMois.him += cumul.mois.him;
                        rawMois.hrm += cumul.mois.hrm;
                        rawMois.ni += cumul.mois.ni;

                        rawAnnee.him += cumul.annee.him;
                        rawAnnee.hrm += cumul.annee.hrm;
                        rawAnnee.ni += cumul.annee.ni;

                        const objectif = objectifsParParcSite.get(
                            `${parcId}:${engin.siteId}`,
                        );

                        if (objectif?.dispo != null) {
                            objectifDispoTotal += objectif.dispo;
                            objectifDispoCount++;
                        }

                        if (objectif?.tdm != null) {
                            objectifUtilTotal += objectif.tdm;
                            objectifUtilCount++;
                        }
                    }

                    const mensuel = createPeriodMetrics(
                        rawMois,
                        nbreEngins,
                        heuresMois,
                    );

                    const annuel = createPeriodMetrics(
                        rawAnnee,
                        nbreEngins,
                        heuresCumulees,
                    );

                    return {
                        parcId,
                        parcName: parc.name,
                        nbreEngins,
                        nhoMois: mensuel.nho,
                        nhoAnnee: annuel.nho,
                        aggregatesMois: mensuel.metrics,
                        aggregatesAnnee: annuel.metrics,
                        objectifDispo:
                            objectifDispoCount > 0
                                ? round(objectifDispoTotal / objectifDispoCount)
                                : null,
                        objectifUtil:
                            objectifUtilCount > 0
                                ? round(objectifUtilTotal / objectifUtilCount)
                                : null,
                    };
                })
                .sort((a, b) => a.parcName.localeCompare(b.parcName));

            const totalRawMois = parcs.reduce(
                (total, parc) => ({
                    him: total.him + parc.aggregatesMois.him,
                    hrm: total.hrm + parc.aggregatesMois.hrm,
                    ni: total.ni + parc.aggregatesMois.ni,
                }),
                emptyRawMetrics(),
            );

            const totalRawAnnee = parcs.reduce(
                (total, parc) => ({
                    him: total.him + parc.aggregatesAnnee.him,
                    hrm: total.hrm + parc.aggregatesAnnee.hrm,
                    ni: total.ni + parc.aggregatesAnnee.ni,
                }),
                emptyRawMetrics(),
            );

            const totalEngins = parcs.reduce(
                (total, parc) => total + parc.nbreEngins,
                0,
            );

            const totalMois = createPeriodMetrics(
                totalRawMois,
                totalEngins,
                heuresMois,
            );

            const totalAnnee = createPeriodMetrics(
                totalRawAnnee,
                totalEngins,
                heuresCumulees,
            );

            return {
                typeParcId: groupe.typeParcId,
                typeParcName: groupe.typeParcName,
                parcs,
                totalTypeParc: {
                    nbreEngins: totalEngins,
                    nhoMois: totalMois.nho,
                    nhoAnnee: totalAnnee.nho,
                    aggregatesMois: totalMois.metrics,
                    aggregatesAnnee: totalAnnee.metrics,
                },
            };
        });

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
