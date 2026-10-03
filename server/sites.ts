// server/sites.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import { Site, Tenant } from "@/lib/generated/prisma/client";
import { sleep } from "@/lib/utils";
import { ACTION } from "@/lib/enums";
import { guard } from "@/lib/rbac/middleware";
import { ActionResponse } from "./types";
import { SiteWithTenant } from "@/lib/types";

export interface SiteSearchParams {
  name?: string;
  active?: string;
  page?: string;
  perPage?: string;
}

interface PaginatedSites {
  data: SiteWithTenant[];
  success?: boolean,
  message?: string,
  meta?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  }
}

const the_resource = "site";

export async function getAllSites(
  tenantId: string,
  filters: SiteSearchParams
): Promise<PaginatedSites | null> {

  // 1. Vérifier la permission
  const g = await guard(ACTION.READ, the_resource);
  if (!g.success) return { data: [], success: false, message: g.message };

  // 2. Continuer la logique métier
  const { user } = await getCurrentUser();
  if (!user?.id) return { data: [], success: false, message: "Utilisateur non authentifié." };

  try {
    await sleep();

    const currentPage = Math.max(1, parseInt(filters?.page || "1", 10));
    const itemsPerPage = Math.max(1, parseInt(filters?.perPage || "10", 10));
    const skip = (currentPage - 1) * itemsPerPage;

    const whereClause: any = {
      tenantId,
      ...(filters?.name && { name: { contains: filters?.name, mode: "insensitive" } }),
      ...(filters?.active && { active: filters?.active === "active" }),
    };

    const [totalItems, sites] = await prisma.$transaction([
      prisma.site.count({ where: whereClause }),
      prisma.site.findMany({
        where: whereClause,
        include: { tenant: true },
        orderBy: { name: "asc" },
        take: itemsPerPage,
        skip,
      }),
    ]);
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    return {
      data: sites,
      success: true, message: "Données récupérées avec succès!",
      meta: { totalItems, totalPages, currentPage, itemsPerPage },
    };
  } catch (error) {
    console.error("getAllSite error:", error);
    return { data: [], success: false, message: error as string };
  }
}

export async function createSite(name: string, active: boolean, tenantId: string): Promise<ActionResponse> {
  const g = await guard(ACTION.CREATE, the_resource);
  if (!g.success) return g;

  try {
    await sleep();
    const { user } = await getCurrentUser();

    if (!user?.id)
      return { success: false, message: "Aucune session n'est trouvée!" };

    const nameUsed = await prisma.site.findFirst({ where: { name, tenantId } });
    if (nameUsed)
      return { success: false, message: "Nom du site est déjà utilisé." };

    await prisma.site.create({ data: { name, active, tenantId } });
    return { success: true, message: "Site crée avec succès!" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erreur!" };
  }
}

export async function updateSite(id: string, name: string, active: boolean, tenantId: string): Promise<ActionResponse> {
  const g = await guard(ACTION.UPDATE, the_resource);
  if (!g.success) return g;

  try {
    await sleep();
    const { user } = await getCurrentUser();
    if (!user?.id)
      return { success: false, message: "Aucune session n'est trouvée!" };

    const nameUsed = await prisma.site.findFirst({
      where: { AND: { name, tenantId }, NOT: { id } },
    });
    if (nameUsed)
      return { success: false, message: "Nom du site est déjà utilisé." };

    await prisma.site.update({
      where: { tenantId, id },
      data: { name, active },
    });
    return { success: true, message: "Site modifié avec succès!" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erreur!" };
  }
}

export async function deleteSite(id: string): Promise<ActionResponse> {
  const g = await guard(ACTION.DELETE, the_resource);
  if (!g.success) return g;

  try {
    await sleep();
    const { user } = await getCurrentUser();
    if (!user?.id)
      return { success: false, message: "Aucune session n'est trouvée!" };

    await prisma.site.delete({ where: { id } });
    return { success: true, message: "Site supprimé avec succès!" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erreur!" };
  }
}