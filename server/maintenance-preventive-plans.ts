"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { PorteeAffectationMaintenance } from "@/lib/generated/prisma/enums";
import {
    MaintenanceSyncError,
    synchroniserSuivisMaintenancePourEngin,
} from "@/lib/maintenance-preventive-sync";

type PlanMaintenanceInput = {
    code: string;
    name: string;
    description?: string | null;
    intervalleHeures: number;
    seuilAlerteHeures: number;
};

type PlanMaintenanceFilters = {
    search?: string;
    actif?: "tous" | "actifs" | "inactifs";
    currentPage?: number | string;
    itemsPerPage?: number | string;
};

type ActionResult = {
    success: boolean;
    message: string;
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

function normalizePlanInput(values: PlanMaintenanceInput) {
    const code =
        typeof values?.code === "string"
            ? values.code.trim().toUpperCase()
            : "";

    const name =
        typeof values?.name === "string"
            ? values.name.trim()
            : "";

    const description =
        typeof values?.description === "string"
            ? values.description.trim() || null
            : null;

    const intervalleHeures = values?.intervalleHeures;
    const seuilAlerteHeures = values?.seuilAlerteHeures;

    if (!code) {
        return {
            error: "Le code du plan est obligatoire.",
        } as const;
    }

    if (!name) {
        return {
            error: "Le nom du plan est obligatoire.",
        } as const;
    }

    if (
        !Number.isFinite(intervalleHeures) ||
        intervalleHeures <= 0
    ) {
        return {
            error: "L'intervalle doit être strictement supérieur à zéro.",
        } as const;
    }

    if (
        !Number.isFinite(seuilAlerteHeures) ||
        seuilAlerteHeures < 0
    ) {
        return {
            error: "Le seuil d'alerte doit être positif ou nul.",
        } as const;
    }

    return {
        data: {
            code,
            name,
            description,
            intervalleHeures,
            seuilAlerteHeures,
        },
    } as const;
}

/**
 * Liste les plans du tenant actif.
 *
 * itemsPerPage = 0 signifie « Tout afficher ».
 */
export async function getPlansMaintenance(
    filters: PlanMaintenanceFilters = {},
) {
    const permission = await guard(
        ACTION.READ,
        RESOURCE.MAINTENANCE_PREVENTIVE,
    );

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
            data: [],
            meta: undefined,
        };
    }

    const tenantId = await getMaintenanceTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif n'est sélectionné.",
            data: [],
            meta: undefined,
        };
    }

    const search = filters.search?.trim();

    const requestedItems = Number(
        filters.itemsPerPage ?? 10,
    );

    const showAll = requestedItems === 0;

    const itemsPerPage = showAll
        ? 0
        : Number.isFinite(requestedItems) && requestedItems > 0
            ? Math.trunc(requestedItems)
            : 10;

    const currentPage = Math.max(
        Math.trunc(Number(filters.currentPage) || 1),
        1,
    );

    const where = {
        tenantId,

        ...(filters.actif === "actifs"
            ? { active: true }
            : filters.actif === "inactifs"
                ? { active: false }
                : {}),

        ...(search
            ? {
                OR: [
                    {
                        code: {
                            contains: search,
                            mode: "insensitive" as const,
                        },
                    },
                    {
                        name: {
                            contains: search,
                            mode: "insensitive" as const,
                        },
                    },
                    {
                        description: {
                            contains: search,
                            mode: "insensitive" as const,
                        },
                    },
                ],
            }
            : {}),
    };

    try {
        const totalItems = await prisma.planMaintenance.count({
            where,
        });

        const data = await prisma.planMaintenance.findMany({
            where,
            orderBy: [
                { active: "desc" },
                { code: "asc" },
            ],
            skip: showAll
                ? 0
                : (currentPage - 1) * itemsPerPage,
            take: showAll ? undefined : itemsPerPage,
            include: {
                _count: {
                    select: {
                        affectations: true,
                        suivisEngins: true,
                    },
                },
            },
        });

        return {
            success: true,
            message: "Plans de maintenance récupérés avec succès.",
            data,
            meta: {
                totalItems,
                totalPages: showAll
                    ? 1
                    : Math.max(1, Math.ceil(totalItems / itemsPerPage)),
                currentPage: showAll ? 1 : currentPage,
                itemsPerPage: showAll
                    ? Math.max(totalItems, 1)
                    : itemsPerPage,
            },
        };
    } catch (error) {
        console.error("getPlansMaintenance error:", error);

        return {
            success: false,
            message: "Impossible de récupérer les plans de maintenance.",
            data: [],
            meta: undefined,
        };
    }
}

/**
 * Crée un plan de maintenance.
 */
export async function createPlanMaintenance(
    values: PlanMaintenanceInput,
): Promise<ActionResult> {
    const permission = await guard(
        ACTION.CREATE,
        RESOURCE.MAINTENANCE_PREVENTIVE,
    );

    if (!permission.success) {
        return permission;
    }

    const tenantId = await getMaintenanceTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif n'est sélectionné.",
        };
    }

    const normalized = normalizePlanInput(values);

    if (
        "error" in normalized &&
        typeof normalized.error === "string"
    ) {
        return {
            success: false,
            message: normalized.error,
        };
    }

    const data = normalized.data;

    try {
        const duplicate = await prisma.planMaintenance.findFirst({
            where: {
                tenantId,
                code: {
                    equals: data.code,
                    mode: "insensitive",
                },
            },
            select: {
                id: true,
            },
        });

        if (duplicate) {
            return {
                success: false,
                message: "Un plan avec ce code existe déjà.",
            };
        }

        await prisma.planMaintenance.create({
            data: {
                ...data,
                tenantId,
            },
        });

        return {
            success: true,
            message: "Plan de maintenance créé avec succès.",
        };
    } catch (error) {
        console.error("createPlanMaintenance error:", error);

        return {
            success: false,
            message:
                "Erreur lors de la création du plan. Vérifiez le code et les valeurs saisies.",
        };
    }
}

/**
 * Modifie les informations d'un plan.
 *
 * L'activation et la désactivation disposent d'une action dédiée
 * afin de synchroniser correctement les suivis des engins.
 */
export async function updatePlanMaintenance(
    id: string,
    values: PlanMaintenanceInput,
): Promise<ActionResult> {
    const permission = await guard(
        ACTION.UPDATE,
        RESOURCE.MAINTENANCE_PREVENTIVE,
    );

    if (!permission.success) {
        return permission;
    }

    const tenantId = await getMaintenanceTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif n'est sélectionné.",
        };
    }

    if (!id?.trim()) {
        return {
            success: false,
            message: "Identifiant du plan invalide.",
        };
    }

    const normalized = normalizePlanInput(values);

    if (
        "error" in normalized &&
        typeof normalized.error === "string"
    ) {
        return {
            success: false,
            message: normalized.error,
        };
    }

    const data = normalized.data;

    try {
        const existing = await prisma.planMaintenance.findFirst({
            where: {
                id,
                tenantId,
            },
            select: {
                id: true,
            },
        });

        if (!existing) {
            return {
                success: false,
                message: "Plan introuvable dans le tenant actif.",
            };
        }

        const duplicate = await prisma.planMaintenance.findFirst({
            where: {
                tenantId,
                code: {
                    equals: data.code,
                    mode: "insensitive",
                },
                NOT: {
                    id,
                },
            },
            select: {
                id: true,
            },
        });

        if (duplicate) {
            return {
                success: false,
                message: "Un autre plan utilise déjà ce code.",
            };
        }

        await prisma.planMaintenance.update({
            where: {
                id,
            },
            data,
        });

        return {
            success: true,
            message: "Plan de maintenance modifié avec succès.",
        };
    } catch (error) {
        console.error("updatePlanMaintenance error:", error);

        return {
            success: false,
            message: "Erreur lors de la modification du plan.",
        };
    }
}

type AffectationScope = {
    portee: PorteeAffectationMaintenance;
    typeparcId: string | null;
    parcId: string | null;
    siteId: string | null;
    enginId: string | null;
};

type EnginCible = {
    id: string;
    parcId: string;
    siteId: string;
    parc: {
        typeparcId: string;
    };
};

function affectationCouvreEngin(
    affectation: AffectationScope,
    engin: EnginCible,
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
 * Active ou désactive un plan.
 *
 * La désactivation suspend les suivis sans supprimer leur historique.
 * La réactivation synchronise les engins actifs concernés.
 */
export async function setPlanMaintenanceActive(
    id: string,
    active: boolean,
): Promise<ActionResult> {
    const permission = await guard(
        ACTION.UPDATE,
        RESOURCE.MAINTENANCE_PREVENTIVE,
    );

    if (!permission.success) {
        return permission;
    }

    const tenantId = await getMaintenanceTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif n'est sélectionné.",
        };
    }

    if (!id?.trim() || typeof active !== "boolean") {
        return {
            success: false,
            message: "Plan ou état demandé invalide.",
        };
    }

    try {
        return await prisma.$transaction(
            async (tx) => {
                const plan = await tx.planMaintenance.findFirst({
                    where: {
                        id,
                        tenantId,
                    },
                    select: {
                        id: true,
                        name: true,
                        active: true,
                    },
                });

                if (!plan) {
                    return {
                        success: false,
                        message: "Plan introuvable dans le tenant actif.",
                    };
                }

                if (plan.active !== active) {
                    await tx.planMaintenance.update({
                        where: {
                            id: plan.id,
                        },
                        data: {
                            active,
                        },
                    });
                }

                if (!active) {
                    await tx.suiviPlanMaintenanceEngin.updateMany({
                        where: {
                            tenantId,
                            planMaintenanceId: plan.id,
                            active: true,
                        },
                        data: {
                            active: false,
                        },
                    });

                    return {
                        success: true,
                        message:
                            "Plan désactivé. Les suivis sont suspendus sans suppression de leur historique.",
                    };
                }

                // En réactivation, ne synchroniser que les engins actifs
                // réellement concernés par les affectations de ce plan.
                const [affectations, engins] = await Promise.all([
                    tx.affectationPlanMaintenance.findMany({
                        where: {
                            tenantId,
                            planMaintenanceId: plan.id,
                            active: true,
                        },
                        select: {
                            portee: true,
                            typeparcId: true,
                            parcId: true,
                            siteId: true,
                            enginId: true,
                        },
                    }),

                    tx.engin.findMany({
                        where: {
                            tenantId,
                            active: true,
                        },
                        select: {
                            id: true,
                            parcId: true,
                            siteId: true,
                            parc: {
                                select: {
                                    typeparcId: true,
                                },
                            },
                        },
                    }),
                ]);

                const enginsConcernes = engins.filter((engin) =>
                    affectations.some((affectation) =>
                        affectationCouvreEngin(affectation, engin),
                    ),
                );

                for (const engin of enginsConcernes) {
                    await synchroniserSuivisMaintenancePourEngin(
                        tx,
                        tenantId,
                        engin.id,
                    );
                }

                return {
                    success: true,
                    message:
                        `Plan activé. ${enginsConcernes.length} engin(s) actif(s) ` +
                        "ont été vérifiés et synchronisés.",
                };
            },
            {
                isolationLevel: "Serializable",
            },
        );
    } catch (error) {
        if (error instanceof MaintenanceSyncError) {
            return {
                success: false,
                message: error.message,
            };
        }

        console.error("setPlanMaintenanceActive error:", error);

        return {
            success: false,
            message:
                "Impossible de modifier l'état du plan. Vérifiez les affectations et réessayez.",
        };
    }
}