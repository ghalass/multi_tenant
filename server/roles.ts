"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type SearchParams = {
    s?: string;
    page?: string;
    limit?: string;
};

const ITEMS_PER_PAGE = 10;

export async function getAllRole(filters: SearchParams = {}) {
    const { s, page = "1", limit = String(ITEMS_PER_PAGE) } = filters;

    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const itemsPerPage = Math.max(1, parseInt(limit, 10) || ITEMS_PER_PAGE);
    const skip = (currentPage - 1) * itemsPerPage;

    const where = s
        ? {
            OR: [
                { name: { contains: s, mode: "insensitive" as const } },
                { description: { contains: s, mode: "insensitive" as const } },
            ],
        }
        : {};

    const [data, totalItems] = await Promise.all([
        prisma.role.findMany({
            where,
            skip,
            take: itemsPerPage,
            orderBy: { createdAt: "desc" },
            include: {
                permissions: true,
                _count: { select: { users: true, permissions: true } },
            },
        }),
        prisma.role.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
        data,
        meta: { currentPage, itemsPerPage, totalItems, totalPages },
    };
}

export async function getAllPermissions() {
    return prisma.permission.findMany({
        orderBy: [{ resource: "asc" }, { action: "asc" }],
    });
}

export async function createRole(
    name: string,
    description: string,
    permissionIds: string[]
) {
    try {
        const existing = await prisma.role.findUnique({ where: { name } });
        if (existing) {
            return { success: false, message: "Un rôle avec ce nom existe déjà." };
        }

        await prisma.role.create({
            data: {
                name,
                description: description || null,
                permissions: {
                    connect: permissionIds.map((id) => ({ id })),
                },
            },
        });

        revalidatePath("/[tenantId]/roles", "page");
        return { success: true, message: "Rôle créé avec succès." };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Erreur lors de la création du rôle." };
    }
}

export async function updateRole(
    id: string,
    name: string,
    description: string,
    permissionIds: string[]
) {
    try {
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

        revalidatePath("/[tenantId]/roles", "page");
        return { success: true, message: "Rôle modifié avec succès." };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Erreur lors de la modification du rôle." };
    }
}

export async function deleteRole(id: string) {
    try {
        await prisma.role.delete({ where: { id } });
        revalidatePath("/[tenantId]/roles", "page");
        return { success: true, message: "Rôle supprimé avec succès." };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Erreur lors de la suppression du rôle." };
    }
}