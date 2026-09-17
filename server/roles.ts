// server/roles.ts
"use server";

import { ACTION } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { getCurrentUser } from "./auth";
import { Permission, Role } from "@/lib/generated/prisma/client";
import { ActionResponse } from "./types";
import { sleep } from "@/lib/utils";

type RoleWithPermission =
    Role & {
        permissions?: Permission[]
    } & {
        _count?: {
            permissions?: number;
            users?: number;
        };
    };


export type RoleSearchParams = {
    s?: string;
    page?: string;
    perPage?: string;
};

interface PaginatedRoles {
    data: RoleWithPermission[];
    success?: boolean,
    message?: string,
    meta?: {
        totalItems: number;
        totalPages: number;
        currentPage: number;
        itemsPerPage: number;
    }
}

const the_resource = "role";

export async function getAllRoles(filters: RoleSearchParams = {}): Promise<PaginatedRoles> {
    // 1. Vérifier la permission
    const g = await guard(ACTION.READ, the_resource);
    if (!g.success) return { data: [], success: false, message: g.message };

    // 2. Continuer la logique métier
    const { user } = await getCurrentUser();
    if (!user?.id) return { data: [], success: false, message: "Utilisateur non authentifié." };


    try {
        const currentPage = Math.max(1, parseInt(filters?.page || "1", 10));
        const itemsPerPage = Math.max(1, parseInt(filters?.perPage || "10", 10));
        const skip = (currentPage - 1) * itemsPerPage;


        const whereClause: any = {
            ...(filters?.s && { name: { contains: filters?.s, mode: "insensitive" } }),
            ...(filters?.s && { description: { contains: filters?.s, mode: "insensitive" } }),
        };

        const [totalItems, roles] = await prisma.$transaction([
            prisma.role.count({ where: whereClause }),
            prisma.role.findMany({
                where: whereClause,
                include: {
                    permissions: true,
                    _count: { select: { users: true, permissions: true } },
                },
                take: itemsPerPage,
                skip,
                orderBy: { createdAt: "desc" },
            }),
        ]);
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        return {
            data: roles,
            success: true, message: "Données récupérées avec succès!",
            meta: { totalItems, totalPages, currentPage, itemsPerPage },
        };
    } catch (error) {
        console.error("getAllRoles error:", error);
        return { data: [], success: false, message: error as string };
    }
}

export async function getAllPermissions() {
    return prisma.permission.findMany({
        orderBy: [{ resource: "asc" }, { action: "asc" }],
    });
}

export async function createRole(name: string, description: string, permissionIds: string[]): Promise<ActionResponse> {
    const g = await guard(ACTION.CREATE, the_resource);
    if (!g.success) return g;

    try {
        await sleep();
        const { user } = await getCurrentUser();

        if (!user?.id)
            return { success: false, message: "Aucune session n'est trouvée!" };

        const existing = await prisma.role.findUnique({ where: { name } });
        if (existing) { return { success: false, message: "Un rôle avec ce nom existe déjà." }; }

        await prisma.role.create({
            data: {
                name,
                description: description || null,
                permissions: {
                    connect: permissionIds.map((id) => ({ id })),
                },
            },
        });
        return { success: true, message: "Rôle créé avec succès." };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Erreur lors de la création du rôle." };
    }
}

export async function updateRole(id: string, name: string, description: string, permissionIds: string[]): Promise<ActionResponse> {
    const g = await guard(ACTION.UPDATE, the_resource);
    if (!g.success) return g;

    try {
        await sleep();
        const { user } = await getCurrentUser();

        if (!user?.id)
            return { success: false, message: "Aucune session n'est trouvée!" };

        const existing = await prisma.role.findFirst({
            where: { name, NOT: { id } },
        });
        if (existing) {
            return { success: false, message: "Un rôle avec ce nom existe déjà." };
        }

        await prisma.role.update({
            where: { id },
            data: {
                name,
                description: description || null,
                permissions: {
                    set: permissionIds.map((id) => ({ id })),
                },
            },
        });

        return { success: true, message: "Rôle modifié avec succès." };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Erreur lors de la modification du rôle." };
    }
}

export async function deleteRole(id: string): Promise<ActionResponse> {
    const g = await guard(ACTION.DELETE, the_resource);
    if (!g.success) return g;

    try {
        await sleep();
        const { user } = await getCurrentUser();
        if (!user?.id)
            return { success: false, message: "Aucune session n'est trouvée!" };

        await prisma.role.delete({ where: { id } });
        return { success: true, message: "Rôle supprimé avec succès." };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Erreur lors de la suppression du rôle." };
    }
}