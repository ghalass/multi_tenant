"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import {
    calculerCompteurCourant,
    type CompteurCourantData,
} from "@/lib/maintenance-preventive-compteur";


type CompteurCourantResponse =
    | {
        success: true;
        message: string;
        data: CompteurCourantData;
    }
    | {
        success: false;
        message: string;
        data: null;
    };

type StatutEcheanceMaintenance =
    | "REFERENCE_MANQUANTE"
    | "COMPTEUR_INDISPONIBLE"
    | "A_VENIR"
    | "ECHEANCE_PROCHE"
    | "A_ECHEANCE"
    | "EN_RETARD";

type FiltresEcheancesMaintenance = {
    typeparcId?: string;
    parcId?: string;
    siteId?: string;
};

type EcheanceMaintenanceData = {
    suiviId: string;
    planMaintenance: {
        id: string;
        code: string;
        name: string;
        intervalleHeures: number;
        seuilAlerteHeures: number;
    };
    engin: {
        id: string;
        name: string;
        site: { id: string; name: string };
        parc: {
            id: string;
            name: string;
            typeparc: { id: string; name: string };
        };
    };
    compteurDerniereMaintenance: number | null;
    dateDerniereMaintenance: string | null;
    compteurCourant: number | null;
    compteurEcheance: number | null;
    heuresRestantes: number | null;
    heuresRetard: number | null;
    statut: StatutEcheanceMaintenance;
    avertissementCompteur: string | null;
};

type EcheancesMaintenanceResponse =
    | {
        success: true;
        message: string;
        data: EcheanceMaintenanceData[];
    }
    | {
        success: false;
        message: string;
        data: [];
    };

type EnregistrerMaintenanceResponse =
    | {
        success: true;
        message: string;
        data: { id: string };
    }
    | {
        success: false;
        message: string;
        data: null;
    };

type FiltresHistoriqueMaintenance = {
    typeparcId?: string;
    parcId?: string;
    siteId?: string;
    dateDebut?: string;
    dateFin?: string;
};

type HistoriqueMaintenanceItem = {
    id: string;
    planMaintenanceId: string;
    enginId: string;
    dateMaintenance: string;
    compteur: number;
    commentaire: string | null;
    createdAt: string;
    planMaintenance: {
        id: string;
        code: string;
        name: string;
    };
    engin: {
        id: string;
        name: string;
        site: {
            id: string;
            name: string;
        };
        parc: {
            id: string;
            name: string;
            typeparc: {
                id: string;
                name: string;
            };
        };
    };
};

type HistoriqueMaintenanceResponse =
    | {
        success: true;
        message: string;
        data: HistoriqueMaintenanceItem[];
    }
    | {
        success: false;
        message: string;
        data: [];
    };

function parseDateHistorique(
    value: string | undefined,
): { valid: boolean; date?: Date } {
    if (!value?.trim()) {
        return { valid: true };
    }

    const dateValue = value.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return { valid: false };
    }

    const date = new Date(`${dateValue}T00:00:00.000Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== dateValue
    ) {
        return { valid: false };
    }

    return { valid: true, date };
}

async function getMaintenanceTenantId(): Promise<string | null> {
    const { currentTenantId } = await getSession();

    if (!currentTenantId) {
        return null;
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

    return tenant?.id ?? null;
}

/**
 * Action serveur : consulter le compteur courant d'un engin.
 *
 * Le contrôle RBAC et l'appartenance au tenant actif
 * sont vérifiés côté serveur.
 */
export async function getCompteurCourantMaintenance(
    enginId: string,
): Promise<CompteurCourantResponse> {
    const permission = await guard(
        ACTION.READ,
        RESOURCE.MAINTENANCE_PREVENTIVE,
    );

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
            data: null,
        };
    }

    if (!enginId?.trim()) {
        return {
            success: false,
            message: "L'engin est obligatoire.",
            data: null,
        };
    }

    const tenantId = await getMaintenanceTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif n'est sélectionné.",
            data: null,
        };
    }

    try {
        const data = await calculerCompteurCourant(
            enginId,
            tenantId,
        );

        if (!data) {
            return {
                success: false,
                message: "Engin introuvable dans le tenant actif.",
                data: null,
            };
        }

        return {
            success: true,
            message: "Compteur courant calculé avec succès.",
            data,
        };
    } catch (error) {
        console.error(
            "getCompteurCourantMaintenance error:",
            error,
        );

        return {
            success: false,
            message: "Impossible de calculer le compteur courant.",
            data: null,
        };
    }
}

/**
 * Calcule les échéances des suivis actifs du tenant.
 *
 * Les statuts sont calculés à la lecture : ils ne sont pas stockés
 * en base et évoluent avec les HRM et les relevés de compteur.
 */
export async function getEcheancesMaintenancePreventive(
    filters: FiltresEcheancesMaintenance = {},
): Promise<EcheancesMaintenanceResponse> {
    const permission = await guard(
        ACTION.READ,
        RESOURCE.MAINTENANCE_PREVENTIVE,
    );

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
            data: [],
        };
    }

    const tenantId = await getMaintenanceTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif n'est sélectionné.",
            data: [],
        };
    }

    try {
        const suivis = await prisma.suiviPlanMaintenanceEngin.findMany({
            where: {
                tenantId,
                active: true,
                engin: {
                    is: {
                        tenantId,
                        active: true,
                        ...(filters.parcId
                            ? { parcId: filters.parcId }
                            : {}),
                        ...(filters.siteId
                            ? { siteId: filters.siteId }
                            : {}),
                        ...(filters.typeparcId
                            ? {
                                parc: {
                                    is: {
                                        typeparcId: filters.typeparcId,
                                    },
                                },
                            }
                            : {}),
                    },
                },
                planMaintenance: {
                    is: {
                        tenantId,
                        active: true,
                    },
                },
            },
            select: {
                id: true,
                enginId: true,
                compteurDerniereMaintenance: true,
                dateDerniereMaintenance: true,
                engin: {
                    select: {
                        id: true,
                        name: true,
                        site: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
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
                },
                planMaintenance: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        intervalleHeures: true,
                        seuilAlerteHeures: true,
                    },
                },
            },
            orderBy: [
                { engin: { name: "asc" } },
                { planMaintenance: { name: "asc" } },
            ],
        });

        // Chaque engin est calculé une seule fois, même s'il possède
        // plusieurs plans. Les requêtes sont traitées par lots pour
        // éviter de lancer toutes les requêtes simultanément.
        const enginIds = [...new Set(suivis.map((suivi) => suivi.enginId))];

        const compteursParEngin = new Map<
            string,
            Awaited<ReturnType<typeof calculerCompteurCourant>>
        >();

        const tailleLot = 10;

        for (let i = 0; i < enginIds.length; i += tailleLot) {
            const lot = enginIds.slice(i, i + tailleLot);

            const resultats = await Promise.all(
                lot.map(async (enginId) => ({
                    enginId,
                    compteur: await calculerCompteurCourant(
                        enginId,
                        tenantId,
                    ),
                })),
            );

            for (const resultat of resultats) {
                compteursParEngin.set(
                    resultat.enginId,
                    resultat.compteur,
                );
            }
        }

        const data: EcheanceMaintenanceData[] = suivis.map((suivi) => {
            const compteur = compteursParEngin.get(suivi.enginId) ?? null;
            const reference = suivi.compteurDerniereMaintenance;
            const plan = suivi.planMaintenance;

            let statut: StatutEcheanceMaintenance;
            let compteurEcheance: number | null = null;
            let heuresRestantes: number | null = null;
            let heuresRetard: number | null = null;

            if (reference === null) {
                statut = "REFERENCE_MANQUANTE";
            } else if (!compteur) {
                statut = "COMPTEUR_INDISPONIBLE";
            } else {
                compteurEcheance = reference + plan.intervalleHeures;

                const ecart = compteurEcheance - compteur.compteurCourant;
                const tolerance = 0.000001;

                heuresRestantes = ecart;
                heuresRetard = Math.max(0, -ecart);

                if (ecart < -tolerance) {
                    statut = "EN_RETARD";
                } else if (Math.abs(ecart) <= tolerance) {
                    statut = "A_ECHEANCE";
                    heuresRestantes = 0;
                } else if (ecart <= plan.seuilAlerteHeures) {
                    statut = "ECHEANCE_PROCHE";
                } else {
                    statut = "A_VENIR";
                }
            }

            return {
                suiviId: suivi.id,
                planMaintenance: plan,
                engin: suivi.engin,
                compteurDerniereMaintenance: reference,
                dateDerniereMaintenance:
                    suivi.dateDerniereMaintenance?.toISOString().slice(0, 10) ??
                    null,
                compteurCourant: compteur?.compteurCourant ?? null,
                compteurEcheance,
                heuresRestantes,
                heuresRetard,
                statut,
                avertissementCompteur: compteur?.avertissement ?? null,
            };
        });

        return {
            success: true,
            message: "Échéances de maintenance calculées avec succès.",
            data,
        };
    } catch (error) {
        console.error(
            "getEcheancesMaintenancePreventive error:",
            error,
        );

        return {
            success: false,
            message: "Impossible de calculer les échéances de maintenance.",
            data: [],
        };
    }
}

/**
 * Enregistre une maintenance réellement effectuée.
 *
 * L'historique et le compteur de référence sont mis à jour
 * dans une même transaction.
 */
export async function enregistrerMaintenanceRealisee(
    values: {
        planMaintenanceId: string;
        enginId: string;
        dateMaintenance: string;
        compteur: number;
        commentaire?: string | null;
    },
): Promise<EnregistrerMaintenanceResponse> {
    const permission = await guard(
        ACTION.CREATE,
        RESOURCE.MAINTENANCE_PREVENTIVE,
    );

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
            data: null,
        };
    }

    const tenantId = await getMaintenanceTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif n'est sélectionné.",
            data: null,
        };
    }

    if (
        !values.planMaintenanceId?.trim() ||
        !values.enginId?.trim() ||
        !Number.isFinite(values.compteur) ||
        values.compteur < 0
    ) {
        return {
            success: false,
            message:
                "Le plan, l'engin et un compteur positif ou nul sont obligatoires.",
            data: null,
        };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.dateMaintenance)) {
        return {
            success: false,
            message: "La date de maintenance est invalide.",
            data: null,
        };
    }

    const dateMaintenance = new Date(
        `${values.dateMaintenance}T00:00:00.000Z`,
    );

    if (
        Number.isNaN(dateMaintenance.getTime()) ||
        dateMaintenance.toISOString().slice(0, 10) !==
        values.dateMaintenance
    ) {
        return {
            success: false,
            message: "La date de maintenance est invalide.",
            data: null,
        };
    }

    const now = new Date();
    const aujourdHui = new Date(
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
        ),
    );

    if (dateMaintenance > aujourdHui) {
        return {
            success: false,
            message:
                "La date de maintenance ne peut pas être dans le futur.",
            data: null,
        };
    }

    try {
        const compteurCourant = await calculerCompteurCourant(
            values.enginId,
            tenantId,
        );

        if (!compteurCourant) {
            return {
                success: false,
                message: "Engin introuvable dans le tenant actif.",
                data: null,
            };
        }

        if (values.compteur > compteurCourant.compteurCourant) {
            return {
                success: false,
                message:
                    `Le compteur saisi (${values.compteur} h) dépasse ` +
                    `le compteur courant (${compteurCourant.compteurCourant} h).`,
                data: null,
            };
        }

        const commentaire =
            typeof values.commentaire === "string"
                ? values.commentaire.trim() || null
                : null;

        return await prisma.$transaction(
            async (tx) => {
                const suivi =
                    await tx.suiviPlanMaintenanceEngin.findFirst({
                        where: {
                            planMaintenanceId:
                                values.planMaintenanceId,
                            enginId: values.enginId,
                            tenantId,
                            active: true,
                            planMaintenance: {
                                is: {
                                    tenantId,
                                    active: true,
                                },
                            },
                            engin: {
                                is: {
                                    tenantId,
                                    active: true,
                                },
                            },
                        },
                        select: {
                            id: true,
                            compteurDerniereMaintenance: true,
                            dateDerniereMaintenance: true,
                        },
                    });

                if (!suivi) {
                    return {
                        success: false as const,
                        message:
                            "Aucun suivi actif n'existe pour ce plan et cet engin dans le tenant actif.",
                        data: null,
                    };
                }

                const doublon =
                    await tx.historiqueMaintenancePreventive.findFirst({
                        where: {
                            tenantId,
                            planMaintenanceId: values.planMaintenanceId,
                            enginId: values.enginId,
                            dateMaintenance,
                            compteur: values.compteur,
                            commentaire,
                        },
                        select: {
                            id: true,
                        },
                    });

                if (doublon) {
                    return {
                        success: false as const,
                        message:
                            "Une maintenance identique est déjà enregistrée pour cet engin, ce plan, cette date et ce compteur.",
                        data: null,
                    };
                }

                const dernierHistorique =
                    await tx.historiqueMaintenancePreventive.findFirst({
                        where: {
                            tenantId,
                            planMaintenanceId:
                                values.planMaintenanceId,
                            enginId: values.enginId,
                        },
                        orderBy: [
                            { dateMaintenance: "desc" },
                            { createdAt: "desc" },
                        ],
                        select: {
                            dateMaintenance: true,
                            compteur: true,
                        },
                    });

                const datesExistantes = [
                    suivi.dateDerniereMaintenance,
                    dernierHistorique?.dateMaintenance,
                ].filter(
                    (date): date is Date => date !== null && date !== undefined,
                );

                const derniereDate = datesExistantes.reduce<Date | null>(
                    (latest, date) =>
                        !latest || date > latest ? date : latest,
                    null,
                );

                if (
                    derniereDate &&
                    dateMaintenance < derniereDate
                ) {
                    return {
                        success: false as const,
                        message:
                            "La date saisie précède la dernière maintenance enregistrée.",
                        data: null,
                    };
                }

                const compteursExistants = [
                    suivi.compteurDerniereMaintenance,
                    dernierHistorique?.compteur,
                ].filter(
                    (compteur): compteur is number =>
                        compteur !== null &&
                        compteur !== undefined,
                );

                const dernierCompteur = compteursExistants.reduce<
                    number | null
                >(
                    (latest, compteur) =>
                        latest === null || compteur > latest
                            ? compteur
                            : latest,
                    null,
                );

                if (
                    dernierCompteur !== null &&
                    values.compteur < dernierCompteur
                ) {
                    return {
                        success: false as const,
                        message:
                            "Le compteur saisi est inférieur au dernier compteur de maintenance enregistré.",
                        data: null,
                    };
                }

                const historique =
                    await tx.historiqueMaintenancePreventive.create({
                        data: {
                            planMaintenanceId:
                                values.planMaintenanceId,
                            enginId: values.enginId,
                            tenantId,
                            dateMaintenance,
                            compteur: values.compteur,
                            commentaire,
                        },
                        select: {
                            id: true,
                        },
                    });

                await tx.suiviPlanMaintenanceEngin.update({
                    where: {
                        id: suivi.id,
                    },
                    data: {
                        compteurDerniereMaintenance: values.compteur,
                        dateDerniereMaintenance: dateMaintenance,
                    },
                });

                return {
                    success: true as const,
                    message:
                        "Maintenance enregistrée dans l'historique et compteur de référence mis à jour.",
                    data: historique,
                };
            },
            {
                isolationLevel: "Serializable",
            },
        );
    } catch (error) {
        console.error(
            "enregistrerMaintenanceRealisee error:",
            error,
        );

        return {
            success: false,
            message:
                "Impossible d'enregistrer la maintenance. Vérifiez les données et réessayez.",
            data: null,
        };
    }
}

/**
 * Consulte l'historique des maintenances réalisées.
 *
 * Les recherches sont limitées au tenant actif et au type de parc.
 * Les filtres facultatifs permettent d'affiner par parc, site et période.
 */
export async function getHistoriqueMaintenancesPreventives(
    filters: FiltresHistoriqueMaintenance,
): Promise<HistoriqueMaintenanceResponse> {
    const permission = await guard(
        ACTION.READ,
        RESOURCE.MAINTENANCE_PREVENTIVE,
    );

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
            data: [],
        };
    }

    const tenantId = await getMaintenanceTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif n'est sélectionné.",
            data: [],
        };
    }

    const typeparcId = filters.typeparcId?.trim();
    const parcId = filters.parcId?.trim();
    const siteId = filters.siteId?.trim();

    if (!typeparcId) {
        return {
            success: false,
            message: "Sélectionnez au minimum un type de parc.",
            data: [],
        };
    }

    const debut = parseDateHistorique(filters.dateDebut);
    const fin = parseDateHistorique(filters.dateFin);

    if (!debut.valid || !fin.valid) {
        return {
            success: false,
            message: "La période sélectionnée contient une date invalide.",
            data: [],
        };
    }

    if (
        debut.date &&
        fin.date &&
        debut.date.getTime() > fin.date.getTime()
    ) {
        return {
            success: false,
            message:
                "La date de début doit être antérieure ou égale à la date de fin.",
            data: [],
        };
    }

    try {
        const historique =
            await prisma.historiqueMaintenancePreventive.findMany({
                where: {
                    tenantId,
                    ...(debut.date || fin.date
                        ? {
                            dateMaintenance: {
                                ...(debut.date
                                    ? { gte: debut.date }
                                    : {}),
                                ...(fin.date
                                    ? { lte: fin.date }
                                    : {}),
                            },
                        }
                        : {}),
                    planMaintenance: {
                        is: { tenantId },
                    },
                    engin: {
                        is: {
                            tenantId,
                            ...(parcId ? { parcId } : {}),
                            ...(siteId ? { siteId } : {}),
                            parc: {
                                is: {
                                    tenantId,
                                    typeparcId,
                                },
                            },
                            site: {
                                is: { tenantId },
                            },
                        },
                    },
                },
                select: {
                    id: true,
                    planMaintenanceId: true,
                    enginId: true,
                    dateMaintenance: true,
                    compteur: true,
                    commentaire: true,
                    createdAt: true,
                    planMaintenance: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                        },
                    },
                    engin: {
                        select: {
                            id: true,
                            name: true,
                            site: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
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
                    },
                },
                orderBy: [
                    { dateMaintenance: "desc" },
                    { createdAt: "desc" },
                ],
            });

        const data: HistoriqueMaintenanceItem[] =
            historique.map((item) => ({
                ...item,
                dateMaintenance: item.dateMaintenance
                    .toISOString()
                    .slice(0, 10),
                createdAt: item.createdAt.toISOString(),
            }));

        return {
            success: true,
            message: "Historique des maintenances récupéré avec succès.",
            data,
        };
    } catch (error) {
        console.error(
            "getHistoriqueMaintenancesPreventives error:",
            error,
        );

        return {
            success: false,
            message:
                "Impossible de récupérer l'historique des maintenances.",
            data: [],
        };
    }
}