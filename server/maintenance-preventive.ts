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
export async function getEcheancesMaintenancePreventive():
    Promise<EcheancesMaintenanceResponse> {
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