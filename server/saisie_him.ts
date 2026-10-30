"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";
import { convertField } from "@/lib/convertField";
import { dateFormater } from "@/lib/utils";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface SaisieHimSearchParams {
    name?: string;
    dateDu?: string;
    dateAu?: string;
    siteId?: string;
    typeparcId?: string;
    parcId?: string;
    enginId?: string;
    panneId?: string;
    search?: string;
    currentPage?: number | string;
    itemsPerPage?: number | string;
}

export type SaisieHimInput = {
    du: string;
    siteId: string;
    enginId: string;
    panneId: string;
    him: number;
    ni?: number | null;
    obs?: string | null;
};

async function getSaisieHimTenantId(): Promise<string | null> {
    const { currentTenantId } = await getSession();

    if (!currentTenantId) return null;

    const tenant = await prisma.tenant.findFirst({
        where: {
            id: currentTenantId,
            active: true,
        },
        select: { id: true },
    });

    return tenant?.id ?? null;
}

function parseDate(value?: string): Date | null {
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

/* =========================================================
   OPTIONS DES LISTES
========================================================= */

export async function getSaisieHimOptions(): Promise<{ success: boolean; message: string; data: { typeParcs: { id: string; name: string; }[]; typePannes: { id: string; name: string; }[]; parcs: { id: string; name: string; typeparcId: string; }[]; engins: { id: string; name: string; siteId: string; active: boolean; parcId: string; }[]; sites: { id: string; name: string; }[]; pannes: { id: string; name: string; parcs: { description: string | null; parc: { id: string; name: string; }; }[]; typepanneId: string; }[]; }; }> {
    const permission = await guard(
        ACTION.READ,
        RESOURCE.SAISIE_HIM,
    );

    const emptyData = {
        typeParcs: [],
        typePannes: [],
        parcs: [],
        engins: [],
        sites: [],
        pannes: [],
    };

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
            data: emptyData,
        };
    }

    const tenantId = await getSaisieHimTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif.",
            data: emptyData,
        };
    }

    const [typeParcs, typePannes, parcs, engins, sites, pannes] =
        await Promise.all([
            prisma.typeparc.findMany({
                where: { tenantId },
                select: { id: true, name: true },
                orderBy: { name: "asc" },
            }),

            prisma.typepanne.findMany({
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

            // Garder aussi les engins inactifs dans les options :
            // une saisie HIM historique doit rester modifiable.
            prisma.engin.findMany({
                where: { tenantId },
                select: {
                    id: true,
                    name: true,
                    active: true,
                    siteId: true,
                    parcId: true,
                },
                orderBy: { name: "asc" },
            }),

            prisma.site.findMany({
                where: { tenantId, active: true },
                select: { id: true, name: true },
                orderBy: { name: "asc" },
            }),

            prisma.panne.findMany({
                where: { tenantId },
                select: {
                    id: true,
                    name: true,
                    typepanneId: true,
                    parcs: {
                        select: {
                            description: true,
                            parc: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { name: "asc" },
            }),
        ]);

    return {
        success: true,
        message: "",
        data: {
            typeParcs,
            typePannes,
            parcs,
            engins,
            sites,
            pannes,
        },
    };
}

/* =========================================================
   CONSULTATION ET FILTRES
========================================================= */

export async function getAllSaisieHim(
    filters: SaisieHimSearchParams = {},
): Promise<{ success: boolean; message: string; data: never[]; meta?: undefined; } | { success: boolean; message: string; data: ({ panne: { id: string; name: string; }; saisiehrm: { engin: { parc: { typeparc: { id: string; name: string; }; } & { id: string; name: string; tenantId: string; typeparcId: string; }; } & { id: string; name: string; siteId: string; tenantId: string; active: boolean; parcId: string; }; site: { id: string; name: string; }; } & { id: string; hrm: number; enginId: string; siteId: string; tenantId: string; du: Date; nho: number; compteur: number | null; }; } & { id: string; him: number; tenantId: string; panneId: string; ni: number | null; saisiehrmId: string; obs: string | null; })[]; meta: { totalItems: number; totalPages: number; currentPage: number; itemsPerPage: number; }; }> {
    const permission = await guard(
        ACTION.READ,
        RESOURCE.SAISIE_HIM,
    );

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
            data: [],
        };
    }

    const tenantId = await getSaisieHimTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif.",
            data: [],
        };
    }

    const currentPage = Math.max(
        Number(filters.currentPage) || 1,
        1,
    );

    const requestedItems = Number(
        filters.itemsPerPage ?? PAGINATION_SETTINGS.itemsPerPage,
    );

    const isUnpaged = requestedItems === 0;

    const itemsPerPage = isUnpaged
        ? 0
        : Math.max(
            requestedItems || PAGINATION_SETTINGS.itemsPerPage,
            1,
        );

    const name = filters.name?.trim();
    const siteId = filters.siteId?.trim();
    const typeparcId = filters.typeparcId?.trim();
    const parcId = filters.parcId?.trim();
    const enginId = filters.enginId?.trim();
    const panneId = filters.panneId?.trim();

    const dateDu = parseDate(filters.dateDu);
    const dateAu = parseDate(filters.dateAu);

    const enginWhere: Prisma.EnginWhereInput = {};

    if (siteId) {
        enginWhere.siteId = siteId;
    }

    if (enginId) {
        enginWhere.id = enginId;
    }

    if (parcId) {
        enginWhere.parcId = parcId;
    }

    if (typeparcId) {
        enginWhere.parc = {
            is: { typeparcId },
        };
    }

    const hrmWhere: Prisma.SaisiehrmWhereInput = {};

    if (dateDu || dateAu) {
        hrmWhere.du = {
            ...(dateDu ? { gte: dateDu } : {}),
            ...(dateAu ? { lte: dateAu } : {}),
        };
    }

    if (Object.keys(enginWhere).length > 0) {
        hrmWhere.engin = { is: enginWhere };
    }

    const where: Prisma.SaisiehimWhereInput = {
        tenantId,

        ...(panneId ? { panneId } : {}),

        ...(Object.keys(hrmWhere).length > 0
            ? { saisiehrm: { is: hrmWhere } }
            : {}),

        ...(name
            ? {
                OR: [
                    {
                        panne: {
                            is: {
                                name: {
                                    contains: name,
                                    mode: "insensitive",
                                },
                            },
                        },
                    },
                    {
                        saisiehrm: {
                            is: {
                                engin: {
                                    is: {
                                        name: {
                                            contains: name,
                                            mode: "insensitive",
                                        },
                                    },
                                },
                            },
                        },
                    },
                ],
            }
            : {}),
    };

    const [data, totalItems] = await Promise.all([
        prisma.saisiehim.findMany({
            where,
            orderBy: [
                { saisiehrm: { du: "desc" } },
                { panne: { name: "asc" } },
            ],
            skip: isUnpaged
                ? 0
                : (currentPage - 1) * itemsPerPage,
            take: isUnpaged ? undefined : itemsPerPage,
            include: {
                panne: {
                    select: { id: true, name: true },
                },
                saisiehrm: {
                    include: {
                        site: {
                            select: { id: true, name: true },
                        },
                        engin: {
                            include: {
                                parc: {
                                    include: {
                                        typeparc: {
                                            select: { id: true, name: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }),

        prisma.saisiehim.count({ where }),
    ]);

    return {
        success: true,
        message: "Saisies HIM récupérées avec succès.",
        data,
        meta: {
            totalItems,
            totalPages: isUnpaged
                ? 1
                : Math.ceil(totalItems / itemsPerPage),
            currentPage,
            itemsPerPage,
        },
    };
}

/* =========================================================
   VALIDATION COMMUNE AUX CREATIONS ET MODIFICATIONS
========================================================= */

async function validateSaisieHimInput(
    values: SaisieHimInput,
    tenantId: string,
): Promise<{ error: string; du?: undefined; saisiehrmId?: undefined; panneId?: undefined; him?: undefined; ni?: undefined; obs?: undefined; } | { du: Date; saisiehrmId: string; panneId: string; him: number; ni: number | null; obs: string | null; readonly error?: undefined; }> {
    const du = parseDate(values.du);
    const him = Number(values.him);
    const ni = values.ni == null ? null : Number(values.ni);
    const obs = values.obs?.trim() || null;

    if (!du) {
        return { error: "La date de saisie est invalide." };
    }

    if (!values.siteId || !values.enginId) {
        return {
            error: "Sélectionnez un site et un engin.",
        };
    }

    if (!values.panneId) {
        return {
            error: "Sélectionnez une panne.",
        };
    }

    if (!Number.isFinite(him) || him < 0) {
        return {
            error: "La valeur HIM doit être positive ou nulle.",
        };
    }

    if (ni !== null && (!Number.isInteger(ni) || ni < 0)) {
        return {
            error: "NI doit être un entier positif ou nul.",
        };
    }

    if (obs && obs.length > 1000) {
        return {
            error: "L'observation ne doit pas dépasser 1000 caractères.",
        };
    }

    const [engin, site] = await Promise.all([
        prisma.engin.findFirst({
            where: {
                id: values.enginId,
                tenantId,
            },
            select: {
                id: true,
                siteId: true,
                parcId: true,
            },
        }),

        prisma.site.findFirst({
            where: {
                id: values.siteId,
                tenantId,
                active: true,
            },
            select: { id: true },
        }),
    ]);

    if (!engin) {
        return { error: "L'engin sélectionné est introuvable." };
    }

    if (!site) {
        return {
            error: "Le site sélectionné est invalide ou inactif.",
        };
    }

    if (engin.siteId !== site.id) {
        return {
            error: "Le site doit correspondre au site de l'engin.",
        };
    }

    const [hrm, panne] = await Promise.all([
        prisma.saisiehrm.findFirst({
            where: {
                du,
                enginId: engin.id,
                tenantId,
            },
            select: {
                id: true,
                siteId: true,
            },
        }),

        prisma.panne.findFirst({
            where: {
                id: values.panneId,
                tenantId,
                parcs: {
                    some: {
                        parcId: engin.parcId,
                    },
                },
            },
            select: { id: true },
        }),
    ]);

    if (!hrm) {
        return {
            error:
                "Aucune saisie HRM n'existe pour cet engin à cette date. Créez d'abord la saisie HRM.",
        };
    }

    if (hrm.siteId !== site.id) {
        return {
            error:
                "Le site doit correspondre au site de la saisie HRM.",
        };
    }

    if (!panne) {
        return {
            error:
                "La panne sélectionnée n'existe pas ou n'est pas associée au parc de cet engin.",
        };
    }

    return {
        du,
        saisiehrmId: hrm.id,
        panneId: panne.id,
        him,
        ni,
        obs,
    };
}

/* =========================================================
   CREATION
========================================================= */

export async function createSaisieHim(
    values: SaisieHimInput,
): Promise<{ success: boolean; message: string | undefined; }> {
    const permission = await guard(
        ACTION.CREATE,
        RESOURCE.SAISIE_HIM,
    );

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
        };
    }

    const tenantId = await getSaisieHimTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif.",
        };
    }

    try {
        const validated = await validateSaisieHimInput(
            values,
            tenantId,
        );

        if ("error" in validated) {
            return {
                success: false,
                message: validated.error,
            };
        }

        const duplicate = await prisma.saisiehim.findFirst({
            where: {
                panneId: validated.panneId,
                saisiehrmId: validated.saisiehrmId,
                tenantId,
            },
            select: { id: true },
        });

        if (duplicate) {
            return {
                success: false,
                message:
                    "Cette panne possède déjà une saisie HIM pour cet engin à cette date.",
            };
        }

        await prisma.saisiehim.create({
            data: {
                panneId: validated.panneId,
                saisiehrmId: validated.saisiehrmId,
                him: validated.him,
                ni: validated.ni,
                obs: validated.obs,
                tenantId,
            },
        });

        return {
            success: true,
            message: "Saisie HIM créée avec succès.",
        };
    } catch (error) {
        console.error("createSaisieHim error:", error);

        return {
            success: false,
            message: "Erreur lors de la création de la saisie HIM.",
        };
    }
}

/* =========================================================
   MODIFICATION
========================================================= */

export async function updateSaisieHim(
    values: SaisieHimInput & { id: string },
): Promise<{ success: boolean; message: string | undefined; }> {
    const permission = await guard(
        ACTION.UPDATE,
        RESOURCE.SAISIE_HIM,
    );

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
        };
    }

    const tenantId = await getSaisieHimTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif.",
        };
    }

    try {
        const existing = await prisma.saisiehim.findFirst({
            where: {
                id: values.id,
                tenantId,
            },
            select: { id: true },
        });

        if (!existing) {
            return {
                success: false,
                message: "Saisie HIM introuvable.",
            };
        }

        const validated = await validateSaisieHimInput(
            values,
            tenantId,
        );

        if ("error" in validated) {
            return {
                success: false,
                message: validated.error,
            };
        }

        const duplicate = await prisma.saisiehim.findFirst({
            where: {
                panneId: validated.panneId,
                saisiehrmId: validated.saisiehrmId,
                tenantId,
                NOT: { id: values.id },
            },
            select: { id: true },
        });

        if (duplicate) {
            return {
                success: false,
                message:
                    "Une autre saisie HIM existe déjà pour cette panne et cette saisie HRM.",
            };
        }

        await prisma.saisiehim.update({
            where: { id: values.id },
            data: {
                panneId: validated.panneId,
                saisiehrmId: validated.saisiehrmId,
                him: validated.him,
                ni: validated.ni,
                obs: validated.obs,
            },
        });

        return {
            success: true,
            message: "Saisie HIM modifiée avec succès.",
        };
    } catch (error) {
        console.error("updateSaisieHim error:", error);

        return {
            success: false,
            message: "Erreur lors de la modification de la saisie HIM.",
        };
    }
}

/* =========================================================
   SUPPRESSION
========================================================= */

export async function deleteSaisieHim(id: string): Promise<{ success: boolean; message: string; }> {
    const permission = await guard(
        ACTION.DELETE,
        RESOURCE.SAISIE_HIM,
    );

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
        };
    }

    const tenantId = await getSaisieHimTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif.",
        };
    }

    try {
        const existing = await prisma.saisiehim.findFirst({
            where: { id, tenantId },
            select: { id: true },
        });

        if (!existing) {
            return {
                success: false,
                message: "Saisie HIM introuvable.",
            };
        }

        await prisma.saisiehim.delete({
            where: { id },
        });

        return {
            success: true,
            message: "Saisie HIM supprimée avec succès.",
        };
    } catch (error) {
        console.error("deleteSaisieHim error:", error);

        return {
            success: false,
            message: "Erreur lors de la suppression de la saisie HIM.",
        };
    }
}

/* =========================================================
   IMPORT
========================================================= */

function hasValue(value: unknown): boolean {
    return (
        value !== null &&
        value !== undefined &&
        !(typeof value === "string" && value.trim() === "")
    );
}

function parseNumber(value: unknown): number | null {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    const normalized = value.trim().replace(",", ".");

    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
        return null;
    }

    const result = Number(normalized);
    return Number.isFinite(result) ? result : null;
}

export async function importSaisieHim(data: Record<string, unknown>): Promise<{ success: boolean; data: null; message: string; }[] | { success: boolean; data: Record<string, unknown>; message: string; }[] | { success: boolean; data: { id: string; tenantId: string; panneId: string; him: number; ni: number | null; saisiehrmId: string; obs: string | null; }; message: string; }[]> {
    try {
        const permission = await guard(
            ACTION.IMPORT,
            RESOURCE.SAISIE_HIM
        );

        if (!permission.success) {
            return [{
                success: false,
                data: null,
                message: permission.message,
            }];
        }

        const { currentTenantId } = await getSession();

        if (!currentTenantId) {
            return [{
                success: false,
                data,
                message: "Aucun tenant actif pour l'import.",
            }];
        }

        const du = convertField(data?.du, "date") as Date | null;

        const rawHim = data?.him;
        const him = parseNumber(rawHim);

        const rawNi = data?.ni;
        const ni = parseNumber(rawNi);

        const obs = convertField(data?.obs, "string") ?? "";
        const enginName = convertField(data?.enginName, "string");
        const panneName = convertField(data?.panneName, "string");

        if (!du) {
            return [{
                success: false,
                data,
                message: "Le champ 'du' est obligatoire ou invalide.",
            }];
        }

        if (typeof enginName !== "string" || !enginName.trim()) {
            return [{
                success: false,
                data,
                message: "Le champ 'enginName' est obligatoire.",
            }];
        }

        if (typeof panneName !== "string" || !panneName.trim()) {
            return [{
                success: false,
                data,
                message: "Le champ 'panneName' est obligatoire.",
            }];
        }

        if (!hasValue(rawHim)) {
            return [{
                success: false,
                data,
                message: "Le champ 'him' est obligatoire.",
            }];
        }

        if (him === null) {
            return [{
                success: false,
                data,
                message: "Le champ 'him' doit être un nombre valide.",
            }];
        }

        if (him < 0 || him > 24) {
            return [{
                success: false,
                data,
                message: "Le champ 'him' doit être compris entre 0 et 24.",
            }];
        }

        const hasNi = hasValue(rawNi);

        if (hasNi && (ni === null || !Number.isInteger(ni))) {
            return [{
                success: false,
                data,
                message: "Le champ 'ni' doit être un nombre entier valide.",
            }];
        }

        if (hasNi && ni !== null && ni < 0) {
            return [{
                success: false,
                data,
                message: "Le champ 'ni' ne doit pas être négatif.",
            }];
        }

        const engin = await prisma.engin.findUnique({
            where: {
                name_tenantId: {
                    name: enginName,
                    tenantId: currentTenantId,
                },
            },
            include: {
                parc: true,
            },
        });

        if (!engin) {
            return [{
                success: false,
                data,
                message: `Engin "${enginName}" non trouvé.`,
            }];
        }

        const panne = await prisma.panne.findFirst({
            where: {
                name: panneName,
                tenantId: currentTenantId,
                parcs: {
                    some: {
                        parcId: engin.parcId,
                    },
                },
            },
        });

        if (!panne) {
            return [{
                success: false,
                data,
                message: `Panne "${panneName}" non trouvée pour le parc "${engin.parc.name}".`,
            }];
        }

        const saisiehrm = await prisma.saisiehrm.findFirst({
            where: {
                du,
                enginId: engin.id,
                tenantId: currentTenantId,
            },
        });

        if (!saisiehrm) {
            return [{
                success: false,
                data,
                message: `Saisie HRM de l'engin "${enginName}" du ${dateFormater(du)} introuvable.`,
            }];
        }

        const existingSaisie = await prisma.saisiehim.findUnique({
            where: {
                panneId_saisiehrmId_tenantId: {
                    panneId: panne.id,
                    saisiehrmId: saisiehrm.id,
                    tenantId: currentTenantId,
                },
            },
            select: { ni: true },
        });

        const niValue = ni ?? existingSaisie?.ni ?? null;

        // Saisiehim est reliée à la panne et à la saisie HRM,
        // mais ne possède pas de relation directe avec Engin.
        const saisie = await prisma.saisiehim.upsert({
            where: {
                panneId_saisiehrmId_tenantId: {
                    panneId: panne.id,
                    saisiehrmId: saisiehrm.id,
                    tenantId: currentTenantId,
                },
            },
            update: {
                him,
                ni: niValue,
                obs,
            },
            create: {
                him,
                ni: niValue,
                obs,
                tenant: {
                    connect: { id: currentTenantId },
                },
                panne: {
                    connect: { id: panne.id },
                },
                saisiehrm: {
                    connect: { id: saisiehrm.id },
                },
            },
        });

        return [{
            success: true,
            data: saisie,
            message: `Saisie HIM ${enginName} du ${dateFormater(du)} importée avec succès.`,
        }];
    } catch (error: unknown) {
        console.error("Erreur lors de l'import HIM :", error);

        return [{
            success: false,
            data,
            message: "Échec de l'import HIM. Vérifiez les données et les journaux serveur.",
        }];
    }
}