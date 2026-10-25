"use server";

import { ACTION } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import {
    Prisma,
    Permission,
    Role,
} from "@/lib/generated/prisma/client";
import { ActionResponse } from "@/lib/types";
import { sleep } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";

type RoleWithPermission = Role & {
    permissions: Permission[];
    _count: {
        permissions: number;
        users: number;
    };
};

export type RoleSearchParams = {
    name?: string;
    page?: string;
    perPage?: string;
};

interface PaginatedRoles {
    data: RoleWithPermission[];
    success?: boolean;
    message?: string;
    meta?: {
        totalItems: number;
        totalPages: number;
        currentPage: number;
        itemsPerPage: number;
    };
}

async function ensureSuperAdmin(): Promise<ActionResponse | null> {
    try {
        const { userId } = await getSession();

        if (!userId) {
            return {
                success: false,
                message: "Utilisateur non authentifié.",
            };
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                active: true,
                isSuperAdmin: true,
            },
        });

        if (!user || !user.active) {
            return {
                success: false,
                message: "Compte désactivé ou utilisateur introuvable.",
            };
        }

        if (!user.isSuperAdmin) {
            return {
                success: false,
                message:
                    "Seul le SuperAdmin peut gérer les définitions globales des rôles.",
            };
        }

        return null;
    } catch (error) {
        console.error("Erreur de vérification du SuperAdmin :", error);

        return {
            success: false,
            message: "Impossible de vérifier les autorisations.",
        };
    }
}

// ============================================================
// GET ALL ROLES
// Les définitions des rôles sont globales.
// Le compteur d'utilisateurs est calculé pour le tenant demandé.
// ============================================================

export async function getAllRoles(
    tenantId: string,
    filters: RoleSearchParams = {}
): Promise<PaginatedRoles> {
    const g = await guard(ACTION.READ, RESOURCE.ROLE);

    if (!g.success) {
        return {
            data: [],
            success: false,
            message: g.message,
        };
    }

    const { userId } = await getSession();

    if (!userId) {
        return {
            data: [],
            success: false,
            message: "Utilisateur non authentifié.",
        };
    }

    try {
        const parsedPage = Number.parseInt(filters.page ?? "1", 10);

        const parsedItemsPerPage = Number.parseInt(
            filters.perPage ?? String(PAGINATION_SETTINGS.itemsPerPage),
            10
        );

        const currentPage =
            Number.isFinite(parsedPage) && parsedPage > 0
                ? parsedPage
                : 1;

        const itemsPerPage =
            Number.isFinite(parsedItemsPerPage) &&
                parsedItemsPerPage > 0
                ? parsedItemsPerPage
                : PAGINATION_SETTINGS.itemsPerPage;

        const skip = (currentPage - 1) * itemsPerPage;

        const name = filters.name?.trim();

        const whereClause: Prisma.RoleWhereInput = {
            ...(name
                ? {
                    OR: [
                        {
                            name: {
                                contains: name,
                                mode: "insensitive",
                            },
                        },
                        {
                            description: {
                                contains: name,
                                mode: "insensitive",
                            },
                        },
                    ],
                }
                : {}),
        };

        const [totalItems, roles] = await prisma.$transaction([
            prisma.role.count({
                where: whereClause,
            }),

            prisma.role.findMany({
                where: whereClause,
                include: {
                    permissions: true,

                    _count: {
                        select: {
                            // Compte seulement les affectations du tenant demandé.
                            userAssignments: {
                                where: {
                                    tenantId,
                                },
                            },

                            permissions: true,
                        },
                    },
                },
                take: itemsPerPage,
                skip,
                orderBy: {
                    name: "desc",
                },
            }),
        ]);

        // Maintenir la propriété _count.users utilisée par le tableau.
        const formattedRoles: RoleWithPermission[] = roles.map(
            (role) => ({
                id: role.id,
                name: role.name,
                description: role.description,
                permissions: role.permissions,
                _count: {
                    users: role._count.userAssignments,
                    permissions: role._count.permissions,
                },
            })
        );

        const totalPages = Math.ceil(totalItems / itemsPerPage);

        return {
            data: formattedRoles,
            success: true,
            message: "Données récupérées avec succès!",
            meta: {
                totalItems,
                totalPages,
                currentPage,
                itemsPerPage,
            },
        };
    } catch (error) {
        console.error("Erreur dans getAllRoles :", error);

        return {
            data: [],
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Impossible de récupérer les rôles.",
        };
    }
}

// ============================================================
// GET ALL PERMISSIONS
// ============================================================

export async function getAllPermissions(): Promise<Permission[]> {
    const g = await guard(ACTION.READ, RESOURCE.ROLE);

    if (!g.success) {
        return [];
    }

    return prisma.permission.findMany({
        orderBy: [
            {
                resource: "asc",
            },
            {
                action: "asc",
            },
        ],
    });
}

// ============================================================
// CREATE ROLE
// La définition du rôle et ses permissions sont globales.
// ============================================================

export async function createRole(
    name: string,
    description: string,
    permissionIds: string[]
): Promise<ActionResponse> {
    const authorization = await ensureSuperAdmin();

    if (authorization) {
        return authorization;
    }

    const g = await guard(ACTION.CREATE, RESOURCE.ROLE);

    if (!g.success) {
        return {
            success: false,
            message: g.message,
        };
    }

    try {
        await sleep();

        const { userId } = await getSession();

        if (!userId) {
            return {
                success: false,
                message: "Aucune session n'est trouvée!",
            };
        }

        const normalizedName = name.trim();

        if (!normalizedName) {
            return {
                success: false,
                message: "Le nom du rôle est obligatoire.",
            };
        }

        const existing = await prisma.role.findUnique({
            where: {
                name: normalizedName,
            },
        });

        if (existing) {
            return {
                success: false,
                message: "Un rôle avec ce nom existe déjà.",
            };
        }

        const uniquePermissionIds = [...new Set(permissionIds)];

        await prisma.role.create({
            data: {
                name: normalizedName,
                description: description.trim() || null,
                permissions: {
                    connect: uniquePermissionIds.map((id) => ({
                        id,
                    })),
                },
            },
        });

        return {
            success: true,
            message: "Rôle créé avec succès.",
        };
    } catch (error) {
        console.error("Erreur lors de la création du rôle :", error);

        return {
            success: false,
            message:
                "Erreur lors de la création du rôle. Vérifiez le nom et les permissions sélectionnées.",
        };
    }
}

// ============================================================
// UPDATE ROLE
// ============================================================

export async function updateRole(
    id: string,
    name: string,
    description: string,
    permissionIds: string[]
): Promise<ActionResponse> {
    const authorization = await ensureSuperAdmin();

    if (authorization) {
        return authorization;
    }

    const g = await guard(ACTION.UPDATE, RESOURCE.ROLE);

    if (!g.success) {
        return {
            success: false,
            message: g.message,
        };
    }

    try {
        await sleep();

        const { userId } = await getSession();

        if (!userId) {
            return {
                success: false,
                message: "Aucune session n'est trouvée!",
            };
        }

        const normalizedName = name.trim();

        if (!normalizedName) {
            return {
                success: false,
                message: "Le nom du rôle est obligatoire.",
            };
        }

        const existing = await prisma.role.findFirst({
            where: {
                name: normalizedName,
                NOT: {
                    id,
                },
            },
        });

        if (existing) {
            return {
                success: false,
                message: "Un rôle avec ce nom existe déjà.",
            };
        }

        const uniquePermissionIds = [...new Set(permissionIds)];

        await prisma.role.update({
            where: {
                id,
            },
            data: {
                name: normalizedName,
                description: description.trim() || null,
                permissions: {
                    set: uniquePermissionIds.map((permissionId) => ({
                        id: permissionId,
                    })),
                },
            },
        });

        return {
            success: true,
            message: "Rôle modifié avec succès.",
        };
    } catch (error) {
        console.error("Erreur lors de la modification du rôle :", error);

        return {
            success: false,
            message:
                "Erreur lors de la modification du rôle. Vérifiez le nom et les permissions sélectionnées.",
        };
    }
}

// ============================================================
// DELETE ROLE
// Les affectations associées sont supprimées par la clé étrangère
// user_tenant_role_roleId_fkey avec ON DELETE CASCADE.
// ============================================================

export async function deleteRole(
    id: string
): Promise<ActionResponse> {
    const authorization = await ensureSuperAdmin();

    if (authorization) {
        return authorization;
    }

    const g = await guard(ACTION.DELETE, RESOURCE.ROLE);

    if (!g.success) {
        return {
            success: false,
            message: g.message,
        };
    }

    try {
        await sleep();

        const { userId } = await getSession();

        if (!userId) {
            return {
                success: false,
                message: "Aucune session n'est trouvée!",
            };
        }

        await prisma.role.delete({
            where: {
                id,
            },
        });

        return {
            success: true,
            message: "Rôle supprimé avec succès.",
        };
    } catch (error) {
        console.error("Erreur lors de la suppression du rôle :", error);

        return {
            success: false,
            message:
                "Erreur lors de la suppression du rôle.",
        };
    }
}