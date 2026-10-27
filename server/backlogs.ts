"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";

import {
    PrioriteBacklog,
    SourceBacklog,
    StatutBacklog,
} from "@/lib/generated/prisma/enums";

import type {
    BacklogFilters,
    BacklogFormValues,
    BacklogOptions,
    BacklogOptionsResponse,
    BacklogPeriodStats,
    BacklogPeriodStatsResponse,
    BacklogStatsFilters,
    BacklogStats,
    BacklogStatsResponse,
} from "@/lib/types/backlog";

const EMPTY_OPTIONS: BacklogOptions = {
    typeparcs: [],
    parcs: [],
    sites: [],
    engins: [],
};

const STATUS_VALUES = Object.values(StatutBacklog);
const PRIORITY_VALUES = Object.values(PrioriteBacklog);
const SOURCE_VALUES = Object.values(SourceBacklog);

async function getBacklogTenantId(): Promise<string | null> {
    const { currentTenantId } = await getSession();

    if (!currentTenantId) return null;

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

function parseDate(value?: string | null): Date | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
    ) {
        return null;
    }

    return date;
}

function nullableText(value?: string | null): string | null {
    const result = value?.trim();
    return result ? result : null;
}

function emptyStats(): BacklogStats {
    return {
        total: 0,
        parStatut: Object.fromEntries(
            STATUS_VALUES.map((value) => [value, 0]),
        ) as Record<StatutBacklog, number>,
        parPriorite: Object.fromEntries(
            PRIORITY_VALUES.map((value) => [value, 0]),
        ) as Record<PrioriteBacklog, number>,
        parSource: Object.fromEntries(
            SOURCE_VALUES.map((value) => [value, 0]),
        ) as Record<SourceBacklog, number>,
    };
}

function emptyPeriodStats(
    pas: "jour" | "mois" = "jour",
    global = false,
): BacklogPeriodStats {
    return {
        total: 0,
        global,
        pas,
        evolution: [],
        parStatut: [],
        parPriorite: [],
        parSource: [],
    };
}

export async function getBacklogOptions(): Promise<BacklogOptionsResponse> {
    const permission = await guard(ACTION.READ, RESOURCE.BACKLOG);

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
            data: EMPTY_OPTIONS,
        };
    }

    const tenantId = await getBacklogTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif n'est sélectionné.",
            data: EMPTY_OPTIONS,
        };
    }

    const [typeparcs, parcs, sites, engins] = await Promise.all([
        prisma.typeparc.findMany({
            where: { tenantId },
            select: {
                id: true,
                name: true,
            },
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
            where: { tenantId },
            select: {
                id: true,
                name: true,
                active: true,
            },
            orderBy: { name: "asc" },
        }),

        prisma.engin.findMany({
            where: { tenantId },
            select: {
                id: true,
                name: true,
                parcId: true,
                siteId: true,
                active: true,
            },
            orderBy: { name: "asc" },
        }),
    ]);

    return {
        success: true,
        message: "",
        data: {
            typeparcs,
            parcs,
            sites,
            engins,
        },
    };
}

export async function getBacklogs(filters: BacklogFilters = {}) {
    const permission = await guard(ACTION.READ, RESOURCE.BACKLOG);

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
            data: [],
            meta: undefined,
        };
    }

    const tenantId = await getBacklogTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif n'est sélectionné.",
            data: [],
            meta: undefined,
        };
    }

    const currentPage = Math.max(Number(filters.currentPage) || 1, 1);

    const requestedItems = Number(
        filters.itemsPerPage ?? PAGINATION_SETTINGS.itemsPerPage,
    );

    // 0 signifie « Tout afficher ».
    const showAll = requestedItems === 0;

    const itemsPerPage = showAll
        ? 0
        : Math.max(
            requestedItems || PAGINATION_SETTINGS.itemsPerPage,
            1,
        );

    const search = filters.search?.trim();
    const dateFrom = filters.dateFrom
        ? parseDate(filters.dateFrom)
        : null;
    const dateTo = filters.dateTo
        ? parseDate(filters.dateTo)
        : null;

    if (filters.dateFrom && !dateFrom) {
        return {
            success: false,
            message: "La date de début est invalide.",
            data: [],
            meta: undefined,
        };
    }

    if (filters.dateTo && !dateTo) {
        return {
            success: false,
            message: "La date de fin est invalide.",
            data: [],
            meta: undefined,
        };
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
        return {
            success: false,
            message: "La date de début doit précéder la date de fin.",
            data: [],
            meta: undefined,
        };
    }

    /*
     * Si un type de parc ou un parc est sélectionné,
     * récupérer les engins correspondants dans le tenant actif.
     */
    let matchingEnginIds: string[] | undefined;

    if (filters.typeparcId || filters.parcId) {
        const matchingEngins = await prisma.engin.findMany({
            where: {
                tenantId,

                ...(filters.parcId
                    ? { parcId: filters.parcId }
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
            select: {
                id: true,
            },
        });

        matchingEnginIds = matchingEngins.map((engin) => engin.id);
    }

    const where: any = {
        tenantId,

        ...(filters.statut &&
            STATUS_VALUES.includes(filters.statut as StatutBacklog)
            ? { statut: filters.statut }
            : {}),

        ...(filters.priorite &&
            PRIORITY_VALUES.includes(filters.priorite as PrioriteBacklog)
            ? { priorite: filters.priorite }
            : {}),

        ...(filters.source &&
            SOURCE_VALUES.includes(filters.source as SourceBacklog)
            ? { source: filters.source }
            : {}),

        ...(filters.siteId ? { siteId: filters.siteId } : {}),
        ...(matchingEnginIds !== undefined
            ? {
                enginId: {
                    in: matchingEnginIds.filter(
                        (id) => !filters.enginId || id === filters.enginId,
                    ),
                },
            }
            : filters.enginId
                ? { enginId: filters.enginId }
                : {}),

        ...(dateFrom || dateTo
            ? {
                dateDetection: {
                    ...(dateFrom ? { gte: dateFrom } : {}),
                    ...(dateTo ? { lte: dateTo } : {}),
                },
            }
            : {}),

        ...(search
            ? {
                OR: [
                    {
                        numeroBacklog: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        description: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        engin: {
                            name: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    },
                ],
            }
            : {}),
    };

    // Compter d'abord les résultats pour gérer correctement « Tout afficher ».
    const totalItems = await prisma.backlog.count({ where });

    const [data] = await Promise.all([
        prisma.backlog.findMany({
            where,
            include: {
                engin: {
                    select: {
                        id: true,
                        name: true,
                        siteId: true,
                        active: true,
                    },
                },
                site: {
                    select: {
                        id: true,
                        name: true,
                        active: true,
                    },
                },
                historiqueStatutBacklogs: {
                    orderBy: {
                        dateChangement: "desc",
                    },
                    take: 10,
                },
            },
            orderBy: [
                { dateDetection: "desc" },
                { createdAt: "desc" },
            ],
            skip: showAll ? 0 : (currentPage - 1) * itemsPerPage,
            take: showAll ? undefined : itemsPerPage,
        }),
    ]);

    return {
        success: true,
        message: "Backlogs récupérés avec succès.",
        data,
        meta: {
            totalItems,
            totalPages: showAll
                ? 1
                : Math.max(1, Math.ceil(totalItems / itemsPerPage)),
            currentPage: showAll ? 1 : currentPage,
            // La pagination inférieure reconnaît aussi le mode « Tout afficher ».
            itemsPerPage: showAll
                ? Math.max(totalItems, 1)
                : itemsPerPage,
        },
    };
}

export async function getBacklogStats(): Promise<BacklogStatsResponse> {
    const permission = await guard(ACTION.READ, RESOURCE.BACKLOG);

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
            data: emptyStats(),
        };
    }

    const tenantId = await getBacklogTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif n'est sélectionné.",
            data: emptyStats(),
        };
    }

    const [total, statuses, priorities, sources] = await Promise.all([
        prisma.backlog.count({ where: { tenantId } }),
        prisma.backlog.groupBy({
            by: ["statut"],
            where: { tenantId },
            _count: { _all: true },
        }),
        prisma.backlog.groupBy({
            by: ["priorite"],
            where: { tenantId },
            _count: { _all: true },
        }),
        prisma.backlog.groupBy({
            by: ["source"],
            where: { tenantId },
            _count: { _all: true },
        }),
    ]);

    const data = emptyStats();
    data.total = total;

    for (const row of statuses) {
        data.parStatut[row.statut] = row._count._all;
    }

    for (const row of priorities) {
        data.parPriorite[row.priorite] = row._count._all;
    }

    for (const row of sources) {
        data.parSource[row.source] = row._count._all;
    }

    return {
        success: true,
        message: "Statistiques récupérées avec succès.",
        data,
    };
}

export async function getBacklogStatsByPeriod(
    dateFromValue?: string,
    dateToValue?: string,
    filters: BacklogStatsFilters = {},
): Promise<BacklogPeriodStatsResponse> {
    const global = !dateFromValue && !dateToValue;
    const dateFrom = dateFromValue ? parseDate(dateFromValue) : null;
    const dateTo = dateToValue ? parseDate(dateToValue) : null;

    if (
        (!global && (!dateFrom || !dateTo || dateFrom > dateTo))
    ) {
        return {
            success: false,
            message: "La période sélectionnée est invalide.",
            data: emptyPeriodStats(),
        };
    }

    const permission = await guard(ACTION.READ, RESOURCE.BACKLOG);

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
            data: emptyPeriodStats(),
        };
    }

    const tenantId = await getBacklogTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif n'est sélectionné.",
            data: emptyPeriodStats(),
        };
    }

    const dayCount = dateFrom && dateTo
        ? Math.floor((dateTo.getTime() - dateFrom.getTime()) / 86_400_000) + 1
        : Infinity;
    const pas = dayCount <= 90 ? "jour" : "mois";
    let matchingEnginIds: string[] | undefined;

    if (filters.typeparcId || filters.parcId || filters.enginId) {
        const engins = await prisma.engin.findMany({
            where: {
                tenantId,
                ...(filters.enginId ? { id: filters.enginId } : {}),
                ...(filters.parcId ? { parcId: filters.parcId } : {}),
                ...(filters.siteId ? { siteId: filters.siteId } : {}),
                ...(filters.typeparcId
                    ? {
                        parc: {
                            is: { typeparcId: filters.typeparcId },
                        },
                    }
                    : {}),
            },
            select: { id: true },
        });
        matchingEnginIds = engins.map((engin) => engin.id);
    }

    const backlogScope = {
        tenantId,
        ...(filters.siteId ? { siteId: filters.siteId } : {}),
        ...(matchingEnginIds
            ? { enginId: { in: matchingEnginIds } }
            : {}),
    };
    const detectionWhere = {
        ...backlogScope,
        ...(dateFrom && dateTo
            ? { dateDetection: { gte: dateFrom, lte: dateTo } }
            : {}),
    };
    const executionWhere = {
        ...backlogScope,
        dateExecution: {
            not: null,
            ...(dateFrom && dateTo
                ? { gte: dateFrom, lte: dateTo }
                : {}),
        },
    };

    const [total, detections, executions, statuses, priorities, sources] =
        await Promise.all([
            prisma.backlog.count({ where: detectionWhere }),
            prisma.backlog.groupBy({
                by: ["dateDetection"],
                where: detectionWhere,
                _count: { _all: true },
            }),
            prisma.backlog.groupBy({
                by: ["dateExecution"],
                where: executionWhere,
                _count: { _all: true },
            }),
            prisma.backlog.groupBy({
                by: ["statut"],
                where: detectionWhere,
                _count: { _all: true },
            }),
            prisma.backlog.groupBy({
                by: ["priorite"],
                where: detectionWhere,
                _count: { _all: true },
            }),
            prisma.backlog.groupBy({
                by: ["source"],
                where: detectionWhere,
                _count: { _all: true },
            }),
        ]);

    const allDates = [
        ...detections.map((row) => row.dateDetection),
        ...executions.flatMap((row) =>
            row.dateExecution ? [row.dateExecution] : [],
        ),
    ];
    const firstDate = dateFrom ?? allDates.reduce<Date | null>(
        (earliest, date) => !earliest || date < earliest ? date : earliest,
        null,
    );
    const lastDate = dateTo ?? allDates.reduce<Date | null>(
        (latest, date) => !latest || date > latest ? date : latest,
        null,
    );

    const bucketKey = (date: Date): string => {
        const keyDate = new Date(date);
        if (pas === "mois") keyDate.setUTCDate(1);
        return keyDate.toISOString().slice(0, 10);
    };
    const evolutionByDate = new Map<string, {
        date: string;
        label: string;
        backlogs: number;
        executes: number;
    }>();
    if (firstDate && lastDate) {
        const startBucket = new Date(firstDate);
        const endBucket = new Date(lastDate);
        if (pas === "mois") {
            startBucket.setUTCDate(1);
            endBucket.setUTCDate(1);
        }

        for (let current = new Date(startBucket); current <= endBucket;) {
            const date = current.toISOString().slice(0, 10);
            const label = pas === "mois"
                ? new Intl.DateTimeFormat("fr-FR", {
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                }).format(current)
                : new Intl.DateTimeFormat("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    timeZone: "UTC",
                }).format(current);
            evolutionByDate.set(date, { date, label, backlogs: 0, executes: 0 });

            if (pas === "mois") {
                current.setUTCMonth(current.getUTCMonth() + 1);
            } else {
                current.setUTCDate(current.getUTCDate() + 1);
            }
        }
    }

    for (const row of detections) {
        const bucket = evolutionByDate.get(bucketKey(row.dateDetection));
        if (bucket) bucket.backlogs += row._count._all;
    }

    for (const row of executions) {
        if (!row.dateExecution) continue;
        const bucket = evolutionByDate.get(bucketKey(row.dateExecution));
        if (bucket) bucket.executes += row._count._all;
    }

    const data: BacklogPeriodStats = {
        total,
        global,
        pas,
        evolution: [...evolutionByDate.values()],
        parStatut: STATUS_VALUES.map((label) => ({
            label,
            value: statuses.find((row) => row.statut === label)?._count._all ?? 0,
        })),
        parPriorite: PRIORITY_VALUES.map((label) => ({
            label,
            value: priorities.find((row) => row.priorite === label)?._count._all ?? 0,
        })),
        parSource: SOURCE_VALUES.map((label) => ({
            label,
            value: sources.find((row) => row.source === label)?._count._all ?? 0,
        })),
    };

    return {
        success: true,
        message: "Statistiques de la période récupérées avec succès.",
        data,
    };
}

type ValidatedBacklogInput = {
    numeroBacklog: string;
    dateDetection: Date;
    description: string;
    source: SourceBacklog;
    priorite: PrioriteBacklog;
    equipe: string | null;
    statut: StatutBacklog;
    dateExecution: Date | null;
    observations: string | null;
    enginId: string;
    siteId: string;
};

function validateBacklogInput(
    values: BacklogFormValues,
): { success: true; data: ValidatedBacklogInput } | {
    success: false;
    message: string;
} {
    const numeroBacklog = values.numeroBacklog.trim();
    const description = values.description.trim();
    const dateDetection = parseDate(values.dateDetection);
    const dateExecution = values.dateExecution
        ? parseDate(values.dateExecution)
        : null;

    if (!numeroBacklog) {
        return { success: false, message: "Le numéro de backlog est obligatoire." };
    }

    if (!dateDetection) {
        return { success: false, message: "La date de détection est invalide." };
    }

    if (!description) {
        return { success: false, message: "La description est obligatoire." };
    }

    if (!SOURCE_VALUES.includes(values.source as SourceBacklog)) {
        return { success: false, message: "Sélectionnez une source valide." };
    }

    if (!PRIORITY_VALUES.includes(values.priorite as PrioriteBacklog)) {
        return { success: false, message: "Sélectionnez une priorité valide." };
    }

    if (!STATUS_VALUES.includes(values.statut)) {
        return { success: false, message: "Sélectionnez un statut valide." };
    }

    if (!values.enginId || !values.siteId) {
        return { success: false, message: "L'engin et le site sont obligatoires." };
    }

    if (values.dateExecution && !dateExecution) {
        return { success: false, message: "La date d'exécution est invalide." };
    }

    return {
        success: true,
        data: {
            numeroBacklog,
            dateDetection,
            description,
            source: values.source as SourceBacklog,
            priorite: values.priorite as PrioriteBacklog,
            equipe: nullableText(values.equipe),
            statut: values.statut,
            dateExecution,
            observations: nullableText(values.observations),
            enginId: values.enginId,
            siteId: values.siteId,
        },
    };
}

async function validateBacklogRelations(
    enginId: string,
    siteId: string,
    tenantId: string,
    allowInactive: boolean,
) {
    const [engin, site] = await Promise.all([
        prisma.engin.findFirst({
            where: {
                id: enginId,
                tenantId,
                ...(allowInactive ? {} : { active: true }),
            },
            select: {
                id: true,
                siteId: true,
            },
        }),
        prisma.site.findFirst({
            where: {
                id: siteId,
                tenantId,
                ...(allowInactive ? {} : { active: true }),
            },
            select: { id: true },
        }),
    ]);

    if (!engin) {
        return { success: false as const, message: "L'engin est invalide ou inactif." };
    }

    if (!site) {
        return { success: false as const, message: "Le site est invalide ou inactif." };
    }

    if (engin.siteId !== site.id) {
        return {
            success: false as const,
            message: "Le site sélectionné ne correspond pas au site de l'engin.",
        };
    }

    return { success: true as const };
}

export async function createBacklog(values: BacklogFormValues) {
    const permission = await guard(ACTION.CREATE, RESOURCE.BACKLOG);

    if (!permission.success) {
        return { success: false, message: permission.message };
    }

    const tenantId = await getBacklogTenantId();

    if (!tenantId) {
        return { success: false, message: "Aucun tenant actif." };
    }

    const validated = validateBacklogInput(values);

    if (!validated.success) {
        return { success: false, message: validated.message };
    }

    try {
        const relationCheck = await validateBacklogRelations(
            validated.data.enginId,
            validated.data.siteId,
            tenantId,
            false,
        );

        if (!relationCheck.success) {
            return { success: false, message: relationCheck.message };
        }

        const duplicate = await prisma.backlog.findFirst({
            where: {
                tenantId,
                numeroBacklog: validated.data.numeroBacklog,
            },
            select: { id: true },
        });

        if (duplicate) {
            return {
                success: false,
                message: "Ce numéro de backlog existe déjà dans votre tenant.",
            };
        }

        await prisma.backlog.create({
            data: {
                ...validated.data,
                tenantId,
            },
        });

        return { success: true, message: "Backlog créé avec succès." };
    } catch (error) {
        console.error("createBacklog:", error);
        return {
            success: false,
            message: "Erreur lors de la création du backlog.",
        };
    }
}

export async function updateBacklog(
    id: string,
    values: BacklogFormValues,
) {
    const permission = await guard(ACTION.UPDATE, RESOURCE.BACKLOG);

    if (!permission.success) {
        return { success: false, message: permission.message };
    }

    const tenantId = await getBacklogTenantId();

    if (!tenantId) {
        return { success: false, message: "Aucun tenant actif." };
    }

    const validated = validateBacklogInput(values);

    if (!validated.success) {
        return { success: false, message: validated.message };
    }

    try {
        const existing = await prisma.backlog.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return { success: false, message: "Backlog introuvable." };
        }

        const relationCheck = await validateBacklogRelations(
            validated.data.enginId,
            validated.data.siteId,
            tenantId,
            true,
        );

        if (!relationCheck.success) {
            return { success: false, message: relationCheck.message };
        }

        const duplicate = await prisma.backlog.findFirst({
            where: {
                tenantId,
                numeroBacklog: validated.data.numeroBacklog,
                NOT: { id },
            },
            select: { id: true },
        });

        if (duplicate) {
            return {
                success: false,
                message: "Ce numéro de backlog est déjà utilisé.",
            };
        }

        const commentaire = nullableText(values.commentaireChangementStatut);

        await prisma.$transaction(async (tx) => {
            await tx.backlog.update({
                where: { id },
                data: validated.data,
            });

            if (existing.statut !== validated.data.statut) {
                await tx.historiqueStatutBacklog.create({
                    data: {
                        backlogId: id,
                        ancienStatut: existing.statut,
                        nouveauStatut: validated.data.statut,
                        commentaire,
                    },
                });
            }
        });

        return { success: true, message: "Backlog modifié avec succès." };
    } catch (error) {
        console.error("updateBacklog:", error);
        return {
            success: false,
            message: "Erreur lors de la modification du backlog.",
        };
    }
}

export async function deleteBacklog(id: string) {
    const permission = await guard(ACTION.DELETE, RESOURCE.BACKLOG);

    if (!permission.success) {
        return { success: false, message: permission.message };
    }

    const tenantId = await getBacklogTenantId();

    if (!tenantId) {
        return { success: false, message: "Aucun tenant actif." };
    }

    try {
        const existing = await prisma.backlog.findFirst({
            where: { id, tenantId },
            select: { id: true },
        });

        if (!existing) {
            return { success: false, message: "Backlog introuvable." };
        }

        await prisma.backlog.delete({
            where: { id },
        });

        return { success: true, message: "Backlog supprimé avec succès." };
    } catch (error) {
        console.error("deleteBacklog:", error);
        return {
            success: false,
            message: "Erreur lors de la suppression du backlog.",
        };
    }
}


export async function importBacklogs(data: Record<string, unknown>) {
    const permission = await guard(ACTION.IMPORT, RESOURCE.BACKLOG);

    if (!permission.success) {
        return [{
            success: false,
            data,
            message: permission.message,
        }];
    }

    const tenantId = await getBacklogTenantId();

    if (!tenantId) {
        return [{
            success: false,
            data,
            message: "Aucun tenant actif.",
        }];
    }

    const text = (value: unknown): string =>
        value === null || value === undefined ? "" : String(value).trim();

    const parseImportDate = (value: unknown): Date | null => {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return new Date(Date.UTC(
                value.getFullYear(),
                value.getMonth(),
                value.getDate(),
            ));
        }

        if (typeof value === "number" && Number.isFinite(value)) {
            const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000);
            return Number.isNaN(date.getTime()) ? null : date;
        }

        const raw = text(value);
        if (!raw) return null;

        const isoDate = parseDate(raw);
        if (isoDate) return isoDate;

        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return null;

        return new Date(Date.UTC(
            parsed.getFullYear(),
            parsed.getMonth(),
            parsed.getDate(),
        ));
    };

    const enumValue = (value: unknown): string =>
        text(value)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase()
            .replace(/[\s-]+/g, "_");

    try {
        const numeroBacklog = text(data.numeroBacklog ?? data.numero);
        const description = text(data.description);
        const dateDetection = parseImportDate(data.dateDetection);
        const enginName = text(data.enginName ?? data.engin);
        const siteName = text(data.siteName ?? data.site);

        const source = enumValue(data.source) as SourceBacklog;
        const priorite = enumValue(data.priorite) as PrioriteBacklog;

        let statut = enumValue(data.statut);

        // Compatibilité avec les statuts du projet gmao_nextjs.
        if (statut === "NON_PROGRAMMEE") {
            statut = "ATTENTE_PROGRAMME";
        }

        if (!numeroBacklog || !description || !dateDetection) {
            return [{
                success: false,
                data,
                message: "Le numéro, la description et la date de détection sont obligatoires.",
            }];
        }

        if (!enginName || !siteName) {
            return [{
                success: false,
                data,
                message: "Les colonnes enginName et siteName sont obligatoires.",
            }];
        }

        if (!SOURCE_VALUES.includes(source)) {
            return [{
                success: false,
                data,
                message: `Source invalide : ${text(data.source)}.`,
            }];
        }

        if (!PRIORITY_VALUES.includes(priorite)) {
            return [{
                success: false,
                data,
                message: `Priorité invalide : ${text(data.priorite)}.`,
            }];
        }

        const finalStatut = (
            statut || "ATTENTE_PROGRAMME"
        ) as StatutBacklog;

        if (!STATUS_VALUES.includes(finalStatut)) {
            return [{
                success: false,
                data,
                message: `Statut invalide : ${text(data.statut)}.`,
            }];
        }

        const rawQuantite = text(data.quantite);
        const quantite = rawQuantite ? Number(rawQuantite) : null;

        if (
            quantite !== null &&
            (!Number.isInteger(quantite) || quantite < 0)
        ) {
            return [{
                success: false,
                data,
                message: "La quantité doit être un entier positif ou nul.",
            }];
        }

        const [engin, site] = await Promise.all([
            prisma.engin.findFirst({
                where: {
                    name: enginName,
                    tenantId,
                    active: true,
                },
                select: {
                    id: true,
                    siteId: true,
                },
            }),
            prisma.site.findFirst({
                where: {
                    name: siteName,
                    tenantId,
                    active: true,
                },
                select: {
                    id: true,
                },
            }),
        ]);

        if (!engin || !site) {
            return [{
                success: false,
                data,
                message: "Engin ou site introuvable, inactif ou hors du tenant courant.",
            }];
        }

        if (engin.siteId !== site.id) {
            return [{
                success: false,
                data,
                message: "Le site indiqué ne correspond pas au site de l'engin.",
            }];
        }


        const dateExecution = text(data.dateExecution)
            ? parseImportDate(data.dateExecution)
            : null;

        if (text(data.dateExecution) && !dateExecution) {
            return [{
                success: false,
                data,
                message: "La date d'exécution est invalide.",
            }];
        }

        const values = {
            dateDetection,
            description,
            source,
            priorite,
            equipe: nullableText(text(data.equipe)),
            statut: finalStatut,
            dateExecution,
            observations: nullableText(text(data.observations)),
            enginId: engin.id,
            siteId: site.id,
        };

        await prisma.$transaction(async (tx) => {
            const existing = await tx.backlog.findFirst({
                where: {
                    numeroBacklog,
                    tenantId,
                },
            });

            if (existing) {
                await tx.backlog.update({
                    where: { id: existing.id },
                    data: values,
                });

                if (existing.statut !== finalStatut) {
                    await tx.historiqueStatutBacklog.create({
                        data: {
                            backlogId: existing.id,
                            ancienStatut: existing.statut,
                            nouveauStatut: finalStatut,
                            commentaire: "Changement de statut lors de l'import Excel.",
                        },
                    });
                }
            } else {
                await tx.backlog.create({
                    data: {
                        numeroBacklog,
                        tenantId,
                        ...values,
                    },
                });
            }
        });

        return [{
            success: true,
            data,
            message: `Backlog ${numeroBacklog} importé avec succès.`,
        }];
    } catch (error) {
        console.error("importBacklogs:", error);

        return [{
            success: false,
            data,
            message: "Échec de l'import du backlog. Vérifiez les données de la ligne.",
        }];
    }
}