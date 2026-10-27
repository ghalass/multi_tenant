"use server";

import { getSession } from "@/lib/auth";
import { ACTION } from "@/lib/enums";
import { PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { Prisma } from "@/lib/generated/prisma/client";
import { convertField } from "@/lib/convertField";

export interface ObjectifsSearchParams {
    annee?: string;
    siteId?: string;
    parcId?: string;
    currentPage?: number | string;
    itemsPerPage?: number | string;
}

export type ObjectifInput = {
    annee: number;
    siteId: string;
    parcId: string;
    dispo: number | null;
    mtbf: number | null;
    tdm: number | null;
    spe_huile: number | null;
    spe_go: number | null;
    spe_graisse: number | null;
};

type ObjectifResponse = {
    success: boolean;
    message: string;
    data: Prisma.ObjectifGetPayload<{
        include: {
            site: { select: { id: true; name: true } };
            parc: { select: { id: true; name: true } };
        };
    }>[];
    meta?: {
        totalItems: number;
        totalPages: number;
        currentPage: number;
        itemsPerPage: number;
    };
};

type ObjectifActionResponse = { success: boolean; message: string };
type ObjectifTypeParcOption = { id: string; name: string };
type ObjectifParcOption = ObjectifTypeParcOption & { typeparcId: string };
type ObjectifOptionResponse =
    | {
        success: true;
        message: string;
        data: {
            sites: { id: string; name: string }[];
            typeparcs: ObjectifTypeParcOption[];
            parcs: ObjectifParcOption[];
        };
    }
    | { success: false; message: string; data: null };

async function getObjectifTenantId(): Promise<string | null> {
    const { currentTenantId } = await getSession();

    if (!currentTenantId) return null;

    const tenant = await prisma.tenant.findFirst({
        where: { id: currentTenantId, active: true },
        select: { id: true },
    });

    return tenant?.id ?? null;
}

export async function getAllObjectifs(
    filters: ObjectifsSearchParams = {},
): Promise<ObjectifResponse> {
    const permission = await guard(ACTION.READ, RESOURCE.OBJECTIF);

    if (!permission.success) {
        return { success: false, message: permission.message, data: [] };
    }

    const tenantId = await getObjectifTenantId();
    if (!tenantId) {
        return { success: false, message: "Aucun tenant actif.", data: [] };
    }

    const currentPage = Math.max(Number(filters.currentPage) || 1, 1);
    const requestedItems = Number(
        filters.itemsPerPage ?? PAGINATION_SETTINGS.itemsPerPage,
    );
    const isUnpaged = requestedItems === 0;
    const itemsPerPage = isUnpaged
        ? 0
        : Math.max(requestedItems || PAGINATION_SETTINGS.itemsPerPage, 1);
    const where: Prisma.ObjectifWhereInput = {
        tenantId,
        ...(filters.annee && Number.isInteger(Number(filters.annee))
            ? { annee: Number(filters.annee) }
            : {}),
        ...(filters.siteId ? { siteId: filters.siteId } : {}),
        ...(filters.parcId ? { parcId: filters.parcId } : {}),
    };

    try {
        const [objectifs, totalItems] = await Promise.all([
            prisma.objectif.findMany({
                where,
                orderBy: [{ annee: "desc" }, { site: { name: "asc" } }, { parc: { name: "asc" } }],
                skip: isUnpaged ? 0 : (currentPage - 1) * itemsPerPage,
                take: isUnpaged ? undefined : itemsPerPage,
                include: {
                    site: { select: { id: true, name: true } },
                    parc: { select: { id: true, name: true } },
                },
            }),
            prisma.objectif.count({ where }),
        ]);

        return {
            success: true,
            message: "Objectifs récupérés avec succès.",
            data: objectifs,
            meta: {
                totalItems,
                totalPages: isUnpaged ? 1 : Math.ceil(totalItems / itemsPerPage),
                currentPage,
                itemsPerPage,
            },
        };
    } catch (error) {
        console.error("getAllObjectifs error:", error);
        return {
            success: false,
            message: "Impossible de récupérer les objectifs.",
            data: [],
        };
    }
}

export async function getObjectifOptions(): Promise<ObjectifOptionResponse> {
    const permission = await guard(ACTION.READ, RESOURCE.OBJECTIF);

    if (!permission.success) {
        return { success: false, message: permission.message, data: null };
    }

    const tenantId = await getObjectifTenantId();
    if (!tenantId) {
        return { success: false, message: "Aucun tenant actif.", data: null };
    }

    try {
        const [sites, typeparcs, parcs] = await Promise.all([
            prisma.site.findMany({
                where: { tenantId },
                select: { id: true, name: true },
                orderBy: { name: "asc" },
            }),
            prisma.typeparc.findMany({
                where: { tenantId },
                select: { id: true, name: true },
                orderBy: { name: "asc" },
            }),
            prisma.parc.findMany({
                where: { tenantId },
                select: { id: true, name: true, typeparcId: true },
                orderBy: { name: "asc" },
            }),
        ]);

        return { success: true, message: "", data: { sites, typeparcs, parcs } };
    } catch (error) {
        console.error("getObjectifOptions error:", error);
        return {
            success: false,
            message: "Impossible de récupérer les sites et les parcs.",
            data: null,
        };
    }
}

function validateObjectif(values: ObjectifInput): string | null {
    if (!Number.isInteger(values.annee) || values.annee < 1900 || values.annee > 9999) {
        return "L'année doit être un nombre entier valide.";
    }

    if (!values.siteId || !values.parcId) {
        return "Sélectionnez un site et un parc.";
    }

    const metrics = [
        values.dispo,
        values.mtbf,
        values.tdm,
        values.spe_huile,
        values.spe_go,
        values.spe_graisse,
    ];
    if (metrics.some((value) => value !== null && (!Number.isFinite(value) || value < 0))) {
        return "Les indicateurs doivent être des nombres positifs ou nuls.";
    }

    return null;
}

async function validateObjectifRelations(
    tenantId: string,
    siteId: string,
    parcId: string,
): Promise<boolean> {
    const [site, parc] = await Promise.all([
        prisma.site.findFirst({ where: { id: siteId, tenantId }, select: { id: true } }),
        prisma.parc.findFirst({ where: { id: parcId, tenantId }, select: { id: true } }),
    ]);

    return Boolean(site && parc);
}

export async function createObjectif(
    values: ObjectifInput,
): Promise<ObjectifActionResponse> {
    const permission = await guard(ACTION.CREATE, RESOURCE.OBJECTIF);
    if (!permission.success) return permission;

    const tenantId = await getObjectifTenantId();
    if (!tenantId) return { success: false, message: "Aucun tenant actif." };

    const validationError = validateObjectif(values);
    if (validationError) return { success: false, message: validationError };

    try {
        if (!(await validateObjectifRelations(tenantId, values.siteId, values.parcId))) {
            return { success: false, message: "Le site ou le parc sélectionné est invalide." };
        }

        const duplicate = await prisma.objectif.findUnique({
            where: {
                annee_parcId_siteId: {
                    annee: values.annee,
                    parcId: values.parcId,
                    siteId: values.siteId,
                },
            },
            select: { id: true, tenantId: true },
        });
        if (duplicate?.tenantId === tenantId) {
            return {
                success: false,
                message: "Un objectif existe déjà pour cette année, ce site et ce parc.",
            };
        }

        await prisma.objectif.create({ data: { ...values, tenantId } });
        return { success: true, message: "Objectif créé avec succès." };
    } catch (error) {
        console.error("createObjectif error:", error);
        return { success: false, message: "Erreur lors de la création de l'objectif." };
    }
}

export async function updateObjectif(
    values: ObjectifInput & { id: string },
): Promise<ObjectifActionResponse> {
    const permission = await guard(ACTION.UPDATE, RESOURCE.OBJECTIF);
    if (!permission.success) return permission;

    const tenantId = await getObjectifTenantId();
    if (!tenantId) return { success: false, message: "Aucun tenant actif." };

    const validationError = validateObjectif(values);
    if (!values.id || validationError) {
        return { success: false, message: validationError ?? "Objectif invalide." };
    }

    try {
        const existing = await prisma.objectif.findFirst({
            where: { id: values.id, tenantId },
            select: { id: true },
        });
        if (!existing) return { success: false, message: "Objectif introuvable." };

        if (!(await validateObjectifRelations(tenantId, values.siteId, values.parcId))) {
            return { success: false, message: "Le site ou le parc sélectionné est invalide." };
        }

        const duplicate = await prisma.objectif.findFirst({
            where: {
                annee: values.annee,
                parcId: values.parcId,
                siteId: values.siteId,
                tenantId,
                NOT: { id: values.id },
            },
            select: { id: true },
        });
        if (duplicate) {
            return {
                success: false,
                message: "Un objectif existe déjà pour cette année, ce site et ce parc.",
            };
        }

        await prisma.objectif.update({
            where: { id: values.id },
            data: {
                annee: values.annee,
                siteId: values.siteId,
                parcId: values.parcId,
                dispo: values.dispo,
                mtbf: values.mtbf,
                tdm: values.tdm,
                spe_huile: values.spe_huile,
                spe_go: values.spe_go,
                spe_graisse: values.spe_graisse,
            },
        });
        return { success: true, message: "Objectif modifié avec succès." };
    } catch (error) {
        console.error("updateObjectif error:", error);
        return { success: false, message: "Erreur lors de la modification de l'objectif." };
    }
}

export async function deleteObjectif(id: string): Promise<ObjectifActionResponse> {
    const permission = await guard(ACTION.DELETE, RESOURCE.OBJECTIF);
    if (!permission.success) return permission;

    const tenantId = await getObjectifTenantId();
    if (!tenantId) return { success: false, message: "Aucun tenant actif." };
    if (!id) return { success: false, message: "Objectif invalide." };

    try {
        const deleted = await prisma.objectif.deleteMany({ where: { id, tenantId } });
        if (!deleted.count) return { success: false, message: "Objectif introuvable." };

        return { success: true, message: "Objectif supprimé avec succès." };
    } catch (error) {
        console.error("deleteObjectif error:", error);
        return { success: false, message: "Erreur lors de la suppression de l'objectif." };
    }
}

function parseImportMetric(value: unknown): { value: number | null; valid: boolean } {
    if (value === null || value === undefined || (typeof value === "string" && !value.trim())) {
        return { value: null, valid: true };
    }

    const number = typeof value === "number"
        ? value
        : typeof value === "string"
            ? Number(value.trim().replace(",", "."))
            : Number.NaN;

    if (!Number.isFinite(number) || number < 0) {
        return { value: null, valid: false };
    }

    return { value: number, valid: true };
}

export async function importObjectifs(
    data: Record<string, unknown>,
): Promise<Array<{ success: boolean; data: unknown; message: string }>> {
    try {
        const permission = await guard(ACTION.IMPORT, RESOURCE.OBJECTIF);
        if (!permission.success) {
            return [{ success: false, data: null, message: permission.message }];
        }

        const tenantId = await getObjectifTenantId();
        if (!tenantId) {
            return [{ success: false, data, message: "Aucun tenant actif pour l'import." }];
        }

        const rawAnnee = data?.annee;
        const anneeValue = typeof rawAnnee === "number"
            ? rawAnnee
            : typeof rawAnnee === "string" && rawAnnee.trim()
                ? Number(rawAnnee.trim())
                : Number.NaN;
        const siteName = convertField(data?.siteName ?? data?.site, "string");
        const parcName = convertField(data?.parcName ?? data?.parc, "string");

        if (
            typeof anneeValue !== "number" ||
            !Number.isInteger(anneeValue) ||
            anneeValue < 1900 ||
            anneeValue > 9999
        ) {
            return [{
                success: false,
                data,
                message: "Le champ 'annee' doit être une année entière valide.",
            }];
        }

        if (typeof siteName !== "string" || !siteName.trim()) {
            return [{ success: false, data, message: "Le champ 'siteName' est obligatoire." }];
        }
        if (typeof parcName !== "string" || !parcName.trim()) {
            return [{ success: false, data, message: "Le champ 'parcName' est obligatoire." }];
        }

        const metrics = {
            dispo: parseImportMetric(data?.dispo),
            mtbf: parseImportMetric(data?.mtbf),
            tdm: parseImportMetric(data?.tdm),
            spe_huile: parseImportMetric(data?.spe_huile),
            spe_go: parseImportMetric(data?.spe_go),
            spe_graisse: parseImportMetric(data?.spe_graisse),
        };
        const invalidMetric = Object.entries(metrics).find(([, metric]) => !metric.valid);
        if (invalidMetric) {
            return [{
                success: false,
                data,
                message: `Le champ '${invalidMetric[0]}' doit être un nombre positif ou nul.`,
            }];
        }

        const [site, parc] = await Promise.all([
            prisma.site.findFirst({
                where: { name: siteName.trim(), tenantId },
                select: { id: true },
            }),
            prisma.parc.findFirst({
                where: { name: parcName.trim(), tenantId },
                select: { id: true },
            }),
        ]);
        if (!site) {
            return [{ success: false, data, message: `Site "${siteName}" introuvable.` }];
        }
        if (!parc) {
            return [{ success: false, data, message: `Parc "${parcName}" introuvable.` }];
        }

        const objectif = await prisma.objectif.upsert({
            where: {
                annee_parcId_siteId: {
                    annee: anneeValue,
                    parcId: parc.id,
                    siteId: site.id,
                },
            },
            update: {
                dispo: metrics.dispo.value,
                mtbf: metrics.mtbf.value,
                tdm: metrics.tdm.value,
                spe_huile: metrics.spe_huile.value,
                spe_go: metrics.spe_go.value,
                spe_graisse: metrics.spe_graisse.value,
            },
            create: {
                annee: anneeValue,
                siteId: site.id,
                parcId: parc.id,
                tenantId,
                dispo: metrics.dispo.value,
                mtbf: metrics.mtbf.value,
                tdm: metrics.tdm.value,
                spe_huile: metrics.spe_huile.value,
                spe_go: metrics.spe_go.value,
                spe_graisse: metrics.spe_graisse.value,
            },
        });

        return [{
            success: true,
            data: objectif,
            message: `Objectif ${anneeValue} ${siteName} / ${parcName} importé avec succès.`,
        }];
    } catch (error) {
        console.error("Erreur lors de l'import des objectifs :", error);
        return [{
            success: false,
            data,
            message: "Échec de l'import de l'objectif. Vérifiez les données et les journaux serveur.",
        }];
    }
}
