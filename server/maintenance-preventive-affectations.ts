"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { PorteeAffectationMaintenance } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";
import { calculerCompteurCourant } from "@/lib/maintenance-preventive-compteur";

type AffectationInput = {
    planMaintenanceId: string;
    portee: PorteeAffectationMaintenance;
    typeparcId?: string | null;
    parcId?: string | null;
    siteId?: string | null;
    enginId?: string | null;
};

type CibleMaintenance = {
    id: string;
    name: string;
    parcId: string;
    siteId: string;
    parc: {
        typeparcId: string;
    };
};

type AffectationScope = {
    id: string;
    portee: PorteeAffectationMaintenance;
    typeparcId: string | null;
    parcId: string | null;
    siteId: string | null;
    enginId: string | null;
};

type ActionResult<T = undefined> = {
    success: boolean;
    message: string;
    data?: T | null;
};

type OptionsAffectationMaintenance = {
    plans: Prisma.PlanMaintenanceGetPayload<{
        select: { id: true; code: true; name: true };
    }>[];

    typeparcs: Prisma.TypeparcGetPayload<{
        select: { id: true; name: true };
    }>[];

    parcs: Prisma.ParcGetPayload<{
        select: { id: true; name: true; typeparcId: true };
    }>[];

    sites: Prisma.SiteGetPayload<{
        select: { id: true; name: true };
    }>[];

    engins: Prisma.EnginGetPayload<{
        select: {
            id: true;
            name: true;
            parcId: true;
            siteId: true;
        };
    }>[];
};

const EMPTY_TARGETS = {
    typeparcId: null,
    parcId: null,
    siteId: null,
    enginId: null,
};

type AffectationPlanMaintenanceListItem =
    Prisma.AffectationPlanMaintenanceGetPayload<{
        include: {
            planMaintenance: {
                select: {
                    id: true;
                    code: true;
                    name: true;
                    active: true;
                };
            };
            typeparc: {
                select: { id: true; name: true };
            };
            parc: {
                select: {
                    id: true;
                    name: true;
                    typeparc: {
                        select: { id: true; name: true };
                    };
                };
            };
            site: {
                select: { id: true; name: true };
            };
            engin: {
                select: { id: true; name: true };
            };
        };
    }>;

type SuiviCompteurReference =
    Prisma.SuiviPlanMaintenanceEnginGetPayload<{
        select: {
            id: true;
            planMaintenanceId: true;
            enginId: true;
            compteurDerniereMaintenance: true;
            dateDerniereMaintenance: true;
            planMaintenance: {
                select: {
                    id: true;
                    code: true;
                    name: true;
                };
            };
            engin: {
                select: {
                    id: true;
                    name: true;
                };
            };
        };
    }>;

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

function getTargetId(input: AffectationInput): string | null {
    switch (input.portee) {
        case PorteeAffectationMaintenance.TYPEPARC:
            return input.typeparcId?.trim() || null;

        case PorteeAffectationMaintenance.PARC:
            return input.parcId?.trim() || null;

        case PorteeAffectationMaintenance.SITE:
            return input.siteId?.trim() || null;

        case PorteeAffectationMaintenance.ENGIN:
            return input.enginId?.trim() || null;

        default:
            return null;
    }
}

function matchesScope(
    engin: CibleMaintenance,
    scope: Pick<
        AffectationScope,
        "portee" | "typeparcId" | "parcId" | "siteId" | "enginId"
    >,
): boolean {
    switch (scope.portee) {
        case PorteeAffectationMaintenance.TYPEPARC:
            return engin.parc.typeparcId === scope.typeparcId;

        case PorteeAffectationMaintenance.PARC:
            return engin.parcId === scope.parcId;

        case PorteeAffectationMaintenance.SITE:
            return engin.siteId === scope.siteId;

        case PorteeAffectationMaintenance.ENGIN:
            return engin.id === scope.enginId;

        default:
            return false;
    }
}

async function validateTarget(
    tx: Prisma.TransactionClient,
    tenantId: string,
    input: AffectationInput,
    targetId: string,
): Promise<boolean> {
    switch (input.portee) {
        case PorteeAffectationMaintenance.TYPEPARC:
            return Boolean(
                await tx.typeparc.findFirst({
                    where: { id: targetId, tenantId },
                    select: { id: true },
                }),
            );

        case PorteeAffectationMaintenance.PARC:
            return Boolean(
                await tx.parc.findFirst({
                    where: { id: targetId, tenantId },
                    select: { id: true },
                }),
            );

        case PorteeAffectationMaintenance.SITE:
            return Boolean(
                await tx.site.findFirst({
                    where: { id: targetId, tenantId },
                    select: { id: true },
                }),
            );

        case PorteeAffectationMaintenance.ENGIN:
            return Boolean(
                await tx.engin.findFirst({
                    where: { id: targetId, tenantId },
                    select: { id: true },
                }),
            );

        default:
            return false;
    }
}

/**
 * Crée une affectation collective ou individuelle.
 *
 * Les engins actuellement couverts reçoivent chacun un suivi.
 * Leur compteur de dernière maintenance reste vide tant qu'il
 * n'a pas été renseigné et validé.
 */
export async function createAffectationPlanMaintenance(
    input: AffectationInput,
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

    if (!input.planMaintenanceId?.trim()) {
        return {
            success: false,
            message: "Le plan de maintenance est obligatoire.",
        };
    }

    const targetId = getTargetId(input);

    const allTargetIds = [
        input.typeparcId,
        input.parcId,
        input.siteId,
        input.enginId,
    ].filter((value) => Boolean(value?.trim()));

    if (!targetId || allTargetIds.length !== 1) {
        return {
            success: false,
            message:
                "Sélectionnez une seule cible correspondant à la portée choisie.",
        };
    }

    try {
        return await prisma.$transaction(
            async (tx) => {
                const plan = await tx.planMaintenance.findFirst({
                    where: {
                        id: input.planMaintenanceId,
                        tenantId,
                        active: true,
                    },
                    select: {
                        id: true,
                        name: true,
                    },
                });

                if (!plan) {
                    return {
                        success: false,
                        message:
                            "Plan introuvable, inactif ou hors du tenant sélectionné.",
                    };
                }

                const targetValid = await validateTarget(
                    tx,
                    tenantId,
                    input,
                    targetId,
                );

                if (!targetValid) {
                    return {
                        success: false,
                        message:
                            "La cible sélectionnée est invalide ou hors du tenant actif.",
                    };
                }

                const cible = {
                    ...EMPTY_TARGETS,
                    ...(input.portee ===
                        PorteeAffectationMaintenance.TYPEPARC
                        ? { typeparcId: targetId }
                        : {}),
                    ...(input.portee ===
                        PorteeAffectationMaintenance.PARC
                        ? { parcId: targetId }
                        : {}),
                    ...(input.portee === PorteeAffectationMaintenance.SITE
                        ? { siteId: targetId }
                        : {}),
                    ...(input.portee === PorteeAffectationMaintenance.ENGIN
                        ? { enginId: targetId }
                        : {}),
                };

                const affectationExistante =
                    await tx.affectationPlanMaintenance.findFirst({
                        where: {
                            planMaintenanceId: plan.id,
                            tenantId,
                            ...cible,
                        },
                        select: { id: true },
                    });

                if (affectationExistante) {
                    return {
                        success: false,
                        message:
                            "Une affectation existe déjà pour cette cible et ce plan.",
                    };
                }

                const engins = await tx.engin.findMany({
                    where: {
                        tenantId,
                        active: true,
                    },
                    select: {
                        id: true,
                        name: true,
                        parcId: true,
                        siteId: true,
                        parc: {
                            select: { typeparcId: true },
                        },
                    },
                });

                const enginsCibles = engins.filter((engin) =>
                    matchesScope(engin, {
                        portee: input.portee,
                        ...cible,
                    }),
                );

                const affectationsActives =
                    await tx.affectationPlanMaintenance.findMany({
                        where: {
                            planMaintenanceId: plan.id,
                            tenantId,
                            active: true,
                        },
                        select: {
                            id: true,
                            portee: true,
                            typeparcId: true,
                            parcId: true,
                            siteId: true,
                            enginId: true,
                        },
                    });

                const chevauchements = enginsCibles.filter((engin) =>
                    affectationsActives.some((affectation) =>
                        matchesScope(engin, affectation),
                    ),
                );

                if (chevauchements.length > 0) {
                    const noms = chevauchements
                        .slice(0, 5)
                        .map((engin) => engin.name)
                        .join(", ");

                    const suffixe =
                        chevauchements.length > 5
                            ? ` et ${chevauchements.length - 5} autre(s)`
                            : "";

                    return {
                        success: false,
                        message:
                            `Ce plan couvre déjà ${chevauchements.length} ` +
                            `engin(s) : ${noms}${suffixe}. ` +
                            "Affectation refusée pour éviter les doublons.",
                    };
                }

                await tx.affectationPlanMaintenance.create({
                    data: {
                        planMaintenanceId: plan.id,
                        tenantId,
                        portee: input.portee,
                        typeparcId: cible.typeparcId,
                        parcId: cible.parcId,
                        siteId: cible.siteId,
                        enginId: cible.enginId,
                    },
                });

                if (enginsCibles.length > 0) {
                    await tx.suiviPlanMaintenanceEngin.createMany({
                        data: enginsCibles.map((engin) => ({
                            planMaintenanceId: plan.id,
                            enginId: engin.id,
                            tenantId,
                            compteurDerniereMaintenance: null,
                            dateDerniereMaintenance: null,
                        })),
                        skipDuplicates: true,
                    });
                }

                return {
                    success: true,
                    message:
                        `Affectation créée pour ${enginsCibles.length} engin(s). ` +
                        "Les compteurs de référence doivent être renseignés " +
                        "avant le calcul des échéances.",
                };
            },
            {
                isolationLevel: "Serializable",
            },
        );
    } catch (error) {
        console.error(
            "createAffectationPlanMaintenance error:",
            error,
        );

        return {
            success: false,
            message:
                "Impossible de créer l'affectation. Vérifiez les données et réessayez.",
        };
    }
}

/**
 * Enregistre le compteur réel de la dernière maintenance.
 * La date est facultative, puisque le calcul des échéances
 * repose exclusivement sur les heures.
 */
export async function renseignerCompteurDerniereMaintenance(
    values: {
        planMaintenanceId: string;
        enginId: string;
        compteur: number;
        date?: string | null;
    },
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

    if (
        !values.planMaintenanceId ||
        !values.enginId ||
        !Number.isFinite(values.compteur) ||
        values.compteur < 0
    ) {
        return {
            success: false,
            message: "Le compteur doit être un nombre positif ou nul.",
        };
    }

    let dateDerniereMaintenance: Date | null | undefined;

    if (values.date !== undefined) {
        if (!values.date) {
            dateDerniereMaintenance = null;
        } else {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
                return {
                    success: false,
                    message: "La date de maintenance est invalide.",
                };
            }

            const date = new Date(`${values.date}T00:00:00.000Z`);

            if (
                Number.isNaN(date.getTime()) ||
                date.toISOString().slice(0, 10) !== values.date
            ) {
                return {
                    success: false,
                    message: "La date de maintenance est invalide.",
                };
            }

            dateDerniereMaintenance = date;
        }
    }

    try {
        const suivi =
            await prisma.suiviPlanMaintenanceEngin.findFirst({
                where: {
                    planMaintenanceId: values.planMaintenanceId,
                    enginId: values.enginId,
                    tenantId,
                    planMaintenance: { tenantId },
                    engin: { tenantId },
                },
                select: { id: true },
            });

        if (!suivi) {
            return {
                success: false,
                message:
                    "Aucun suivi n'existe pour ce plan et cet engin dans le tenant actif.",
            };
        }

        const compteurCourant = await calculerCompteurCourant(
            values.enginId,
            tenantId,
        );

        if (!compteurCourant) {
            return {
                success: false,
                message: "Engin introuvable dans le tenant actif.",
            };
        }

        if (values.compteur > compteurCourant.compteurCourant) {
            return {
                success: false,
                message:
                    `Le compteur de référence (${values.compteur} h) ne peut pas ` +
                    `dépasser le compteur courant calculé ` +
                    `(${compteurCourant.compteurCourant} h) pour l'engin ` +
                    `"${compteurCourant.enginName}". ` +
                    "Vérifiez les relevés de compteur et les saisies HRM.",
            };
        }

        await prisma.suiviPlanMaintenanceEngin.update({
            where: { id: suivi.id },
            data: {
                compteurDerniereMaintenance: values.compteur,
                ...(dateDerniereMaintenance !== undefined
                    ? { dateDerniereMaintenance }
                    : {}),
            },
        });

        return {
            success: true,
            message:
                "Compteur de référence enregistré. " +
                "Le suivi peut maintenant calculer les échéances en heures.",
        };
    } catch (error) {
        console.error(
            "renseignerCompteurDerniereMaintenance error:",
            error,
        );

        return {
            success: false,
            message:
                "Impossible d'enregistrer le compteur de référence.",
        };
    }
}

/**
 * Charge les listes utilisées par le formulaire d'affectation.
 */
export async function getOptionsAffectationMaintenance(): Promise<
    ActionResult<OptionsAffectationMaintenance>
> {
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

    const tenantId = await getMaintenanceTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif n'est sélectionné.",
            data: null,
        };
    }

    try {
        const [plans, typeparcs, parcs, sites, engins] =
            await Promise.all([
                prisma.planMaintenance.findMany({
                    where: { tenantId, active: true },
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                    orderBy: { code: "asc" },
                }),

                prisma.typeparc.findMany({
                    where: { tenantId },
                    select: { id: true, name: true },
                    orderBy: { name: "asc" },
                }),

                prisma.parc.findMany({
                    where: { tenantId },
                    select: {
                        id: true,
                        name: true,
                        typeparcId: true,
                    },
                    orderBy: { name: "asc" },
                }),

                prisma.site.findMany({
                    where: { tenantId, active: true },
                    select: { id: true, name: true },
                    orderBy: { name: "asc" },
                }),

                prisma.engin.findMany({
                    where: { tenantId, active: true },
                    select: {
                        id: true,
                        name: true,
                        parcId: true,
                        siteId: true,
                    },
                    orderBy: { name: "asc" },
                }),
            ]);

        return {
            success: true,
            message: "",
            data: {
                plans,
                typeparcs,
                parcs,
                sites,
                engins,
            },
        };
    } catch (error) {
        console.error("getOptionsAffectationMaintenance error:", error);

        return {
            success: false,
            message: "Impossible de charger les options d'affectation.",
            data: null,
        };
    }
}

/**
 * Liste les affectations du tenant actif.
 */
export async function getAffectationsPlansMaintenance(): Promise<
    ActionResult<AffectationPlanMaintenanceListItem[]>
> {
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
        const data = await prisma.affectationPlanMaintenance.findMany({
            where: { tenantId },
            include: {
                planMaintenance: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        active: true,
                    },
                },
                typeparc: {
                    select: { id: true, name: true },
                },
                parc: {
                    select: {
                        id: true,
                        name: true,
                        typeparc: {
                            select: { id: true, name: true },
                        },
                    },
                },
                site: {
                    select: { id: true, name: true },
                },
                engin: {
                    select: { id: true, name: true },
                },
            },
            orderBy: [
                { active: "desc" },
                { createdAt: "desc" },
            ],
        });

        return {
            success: true,
            message: "Affectations récupérées avec succès.",
            data,
        };
    } catch (error) {
        console.error("getAffectationsPlansMaintenance error:", error);

        return {
            success: false,
            message: "Impossible de récupérer les affectations.",
            data: [],
        };
    }
}

/**
 * Active ou suspend une affectation sans supprimer son historique.
 *
 * À la réactivation, les chevauchements avec les autres
 * affectations actives du même plan sont vérifiés.
 */
export async function setAffectationPlanMaintenanceActive(
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
            message: "Affectation ou état demandé invalide.",
        };
    }

    try {
        return await prisma.$transaction(
            async (tx) => {
                const affectation =
                    await tx.affectationPlanMaintenance.findFirst({
                        where: { id, tenantId },
                        include: {
                            planMaintenance: {
                                select: {
                                    id: true,
                                    name: true,
                                    active: true,
                                },
                            },
                        },
                    });

                if (!affectation) {
                    return {
                        success: false,
                        message: "Affectation introuvable dans le tenant actif.",
                    };
                }

                if (affectation.active === active) {
                    return {
                        success: true,
                        message: active
                            ? "Cette affectation est déjà active."
                            : "Cette affectation est déjà suspendue.",
                    };
                }

                if (active && !affectation.planMaintenance.active) {
                    return {
                        success: false,
                        message:
                            "Réactivez d'abord le plan de maintenance associé.",
                    };
                }

                const engins = await tx.engin.findMany({
                    where: {
                        tenantId,
                        active: true,
                    },
                    select: {
                        id: true,
                        name: true,
                        parcId: true,
                        siteId: true,
                        parc: {
                            select: {
                                typeparcId: true,
                            },
                        },
                    },
                });

                const enginsCibles = engins.filter((engin) =>
                    matchesScope(engin, affectation),
                );

                if (active) {
                    const autresAffectations =
                        await tx.affectationPlanMaintenance.findMany({
                            where: {
                                tenantId,
                                planMaintenanceId:
                                    affectation.planMaintenanceId,
                                active: true,
                                NOT: { id },
                            },
                            select: {
                                id: true,
                                portee: true,
                                typeparcId: true,
                                parcId: true,
                                siteId: true,
                                enginId: true,
                            },
                        });

                    const chevauchements = enginsCibles.filter((engin) =>
                        autresAffectations.some((autre) =>
                            matchesScope(engin, autre),
                        ),
                    );

                    if (chevauchements.length > 0) {
                        return {
                            success: false,
                            message:
                                `Réactivation refusée : ${chevauchements.length} ` +
                                "engin(s) sont déjà couverts par une autre affectation " +
                                "active du même plan.",
                        };
                    }
                }

                await tx.affectationPlanMaintenance.update({
                    where: { id },
                    data: { active },
                });

                const enginIds = enginsCibles.map((engin) => engin.id);

                if (enginIds.length > 0 && !active) {
                    await tx.suiviPlanMaintenanceEngin.updateMany({
                        where: {
                            tenantId,
                            planMaintenanceId:
                                affectation.planMaintenanceId,
                            enginId: { in: enginIds },
                            active: true,
                        },
                        data: { active: false },
                    });
                }

                if (active) {
                    for (const engin of enginsCibles) {
                        await tx.suiviPlanMaintenanceEngin.upsert({
                            where: {
                                planMaintenanceId_enginId_tenantId: {
                                    planMaintenanceId:
                                        affectation.planMaintenanceId,
                                    enginId: engin.id,
                                    tenantId,
                                },
                            },
                            create: {
                                planMaintenanceId:
                                    affectation.planMaintenanceId,
                                enginId: engin.id,
                                tenantId,
                                active: true,
                                compteurDerniereMaintenance: null,
                                dateDerniereMaintenance: null,
                            },
                            update: { active: true },
                        });
                    }
                }

                return {
                    success: true,
                    message: active
                        ? `Affectation réactivée pour ${enginsCibles.length} engin(s) actif(s).`
                        : "Affectation suspendue. Les références de maintenance sont conservées.",
                };
            },
            {
                isolationLevel: "Serializable",
            },
        );
    } catch (error) {
        console.error(
            "setAffectationPlanMaintenanceActive error:",
            error,
        );

        return {
            success: false,
            message:
                "Impossible de modifier l'affectation. Vérifiez les données et réessayez.",
        };
    }
}

/**
 * Liste les suivis actifs par plan et engin pour renseigner
 * le compteur réel de la dernière maintenance.
 */
export async function getSuivisCompteursReference(): Promise<
    ActionResult<SuiviCompteurReference[]>
> {
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
        const data =
            await prisma.suiviPlanMaintenanceEngin.findMany({
                where: {
                    tenantId,
                    active: true,
                    planMaintenance: { tenantId },
                    engin: { tenantId },
                },
                select: {
                    id: true,
                    planMaintenanceId: true,
                    enginId: true,
                    compteurDerniereMaintenance: true,
                    dateDerniereMaintenance: true,
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
                        },
                    },
                },
                orderBy: [
                    { createdAt: "desc" },
                    { enginId: "asc" },
                ],
            });

        return {
            success: true,
            message: "Suivis récupérés avec succès.",
            data,
        };
    } catch (error) {
        console.error(
            "getSuivisCompteursReference error:",
            error,
        );

        return {
            success: false,
            message:
                "Impossible de récupérer les compteurs de référence.",
            data: [],
        };
    }
}