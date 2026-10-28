import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { PorteeAffectationMaintenance } from "@/lib/generated/prisma/enums";

type Transaction = Prisma.TransactionClient;

export class MaintenanceSyncError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MaintenanceSyncError";
    }
}

type Affectation = {
    id: string;
    planMaintenanceId: string;
    portee: PorteeAffectationMaintenance;
    typeparcId: string | null;
    parcId: string | null;
    siteId: string | null;
    enginId: string | null;
    planMaintenance: {
        name: string;
    };
};

function couvreEngin(
    affectation: Affectation,
    engin: {
        id: string;
        parcId: string;
        siteId: string;
        parc: {
            typeparcId: string;
        };
    },
): boolean {
    switch (affectation.portee) {
        case PorteeAffectationMaintenance.TYPEPARC:
            return engin.parc.typeparcId === affectation.typeparcId;

        case PorteeAffectationMaintenance.PARC:
            return engin.parcId === affectation.parcId;

        case PorteeAffectationMaintenance.SITE:
            return engin.siteId === affectation.siteId;

        case PorteeAffectationMaintenance.ENGIN:
            return engin.id === affectation.enginId;

        default:
            return false;
    }
}

/**
 * Synchronise les suivis d'un engin au sein d'une transaction.
 *
 * À appeler après la création ou la modification de l'engin,
 * dans la même transaction que cette opération.
 */
export async function synchroniserSuivisMaintenancePourEngin(
    tx: Transaction,
    tenantId: string,
    enginId: string,
): Promise<void> {
    const engin = await tx.engin.findFirst({
        where: {
            id: enginId,
            tenantId,
        },
        select: {
            id: true,
            name: true,
            active: true,
            parcId: true,
            siteId: true,
            parc: {
                select: {
                    typeparcId: true,
                },
            },
        },
    });

    if (!engin) {
        throw new MaintenanceSyncError(
            "Engin introuvable dans le tenant actif.",
        );
    }

    // Un engin inactif conserve ses suivis, mais les suspend.
    if (!engin.active) {
        await tx.suiviPlanMaintenanceEngin.updateMany({
            where: {
                tenantId,
                enginId,
                active: true,
            },
            data: {
                active: false,
            },
        });

        return;
    }

    const affectations = await tx.affectationPlanMaintenance.findMany({
        where: {
            tenantId,
            active: true,
            planMaintenance: {
                is: {
                    tenantId,
                    active: true,
                },
            },
        },
        select: {
            id: true,
            planMaintenanceId: true,
            portee: true,
            typeparcId: true,
            parcId: true,
            siteId: true,
            enginId: true,
            planMaintenance: {
                select: {
                    name: true,
                },
            },
        },
    });

    const affectationsApplicables = affectations.filter((affectation) =>
        couvreEngin(affectation, engin),
    );

    // Un même plan ne doit correspondre qu'à une seule affectation
    // active pour cet engin.
    const affectationsParPlan = new Map<
        string,
        (typeof affectationsApplicables)[number][]
    >();

    for (const affectation of affectationsApplicables) {
        const existantes =
            affectationsParPlan.get(affectation.planMaintenanceId) ?? [];

        existantes.push(affectation);

        affectationsParPlan.set(
            affectation.planMaintenanceId,
            existantes,
        );
    }

    for (const affectationsDuPlan of affectationsParPlan.values()) {
        if (affectationsDuPlan.length > 1) {
            const nomPlan =
                affectationsDuPlan[0].planMaintenance.name;

            throw new MaintenanceSyncError(
                `L'engin ${engin.name} est couvert plusieurs fois par ` +
                `le plan "${nomPlan}". Modifiez les affectations avant ` +
                "de poursuivre.",
            );
        }
    }

    const plansApplicables = new Set(affectationsParPlan.keys());

    const suivisExistants =
        await tx.suiviPlanMaintenanceEngin.findMany({
            where: {
                tenantId,
                enginId,
            },
            select: {
                id: true,
                planMaintenanceId: true,
                active: true,
            },
        });

    // Suspendre les suivis qui ne correspondent plus au périmètre.
    for (const suivi of suivisExistants) {
        if (
            suivi.active &&
            !plansApplicables.has(suivi.planMaintenanceId)
        ) {
            await tx.suiviPlanMaintenanceEngin.update({
                where: {
                    id: suivi.id,
                },
                data: {
                    active: false,
                },
            });
        }
    }

    // Créer les suivis manquants ou réactiver les suivis existants.
    // L'upsert ne modifie jamais le compteur de référence existant.
    for (const planMaintenanceId of plansApplicables) {
        await tx.suiviPlanMaintenanceEngin.upsert({
            where: {
                planMaintenanceId_enginId_tenantId: {
                    planMaintenanceId,
                    enginId,
                    tenantId,
                },
            },
            create: {
                planMaintenanceId,
                enginId,
                tenantId,
                active: true,
                compteurDerniereMaintenance: null,
                dateDerniereMaintenance: null,
            },
            update: {
                active: true,
            },
        });
    }
}