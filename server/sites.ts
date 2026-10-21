"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { ActionResponse } from "@/server/types";
import { getSession } from "@/lib/auth";

export interface SiteSearchParams {
  name?: string;
  active?: string;
  currentPage?: string;
  itemsPerPage?: string;
}

export async function getAllSites(
  filters?: {
    name?: string;
    active?: boolean;
    currentPage?: number;
    itemsPerPage?: number;
  }
) {

  const { userId } = await getSession();

  if (!userId) {
    throw new Error(
      "Utilisateur non authentifié."
    );
  }

  const guardResult = await guard(
    ACTION.READ,
    "site"
  );

  if (!guardResult.success) {
    throw new Error(
      guardResult.message
    );
  }

  const currentPage = Math.max(
    filters?.currentPage ?? 1,
    1
  );

  const itemsPerPage = Math.max(
    filters?.itemsPerPage ?? 10,
    1
  );

  const search =
    filters?.name?.trim();

  const { currentTenantId } = await getSession();

  const where = {
    tenantId: currentTenantId,

    ...(search
      ? {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
        ],
      }
      : {}),

    ...(filters?.active !== undefined
      ? {
        active: filters.active,
      }
      : {}),
  };

  const [sites, totalItems] =
    await Promise.all([
      prisma.site.findMany({
        where,
        orderBy: {
          name: "asc",
        },
        skip:
          (currentPage - 1) *
          itemsPerPage,
        take: itemsPerPage,
        include: {
          tenant: true, // 🔑 inclure le tenant
        },
      }),

      prisma.site.count({
        where,
      }),
    ]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  return {
    data: sites,
    success: true, message: "Données récupérées avec succès!",
    meta: { totalItems, totalPages, currentPage, itemsPerPage },
  };
}

export async function createSite({ name, active }: { name: string; active: boolean }): Promise<ActionResponse> {
  const guardResult = await guard(
    ACTION.CREATE,
    "site"
  );

  if (!guardResult.success) {
    return {
      success: false,
      message:
        guardResult.message,
    };
  }

  const { userId } = await getSession();

  if (!userId) {
    return {
      success: false,
      message:
        "Utilisateur non authentifié.",
    };
  }

  const { currentTenantId } = await getSession();

  if (!currentTenantId) {
    return {
      success: false,
      message:
        "L'utilisateur n'est associé à aucun tenant.",
    };
  }

  const trimmedName = name.trim();

  if (!trimmedName) {
    return {
      success: false,
      message:
        "Le nom du site est obligatoire.",
    };
  }

  try {
    const existing =
      await prisma.site.findFirst({
        where: {
          id: undefined,
          tenantId:
            currentTenantId,
          name: {
            equals: trimmedName,
            mode: "insensitive",
          },
        },
      });

    if (existing) {
      return {
        success: false,
        message:
          "Ce site existe déjà.",
      };
    }

    await prisma.site.create({
      data: {
        name: trimmedName,
        active,
        tenantId:
          currentTenantId,
      },
    });

    return {
      success: true,
      message:
        "Site créé avec succès.",
    };
  } catch (error) {
    console.error(
      "createSite error:",
      error
    );

    return {
      success: false,
      message:
        "Une erreur est survenue lors de la création du site.",
    };
  }
}

export async function updateSite(
  { id, name, active }: { id: string; name: string; active: boolean }): Promise<ActionResponse> {
  const guardResult = await guard(
    ACTION.UPDATE,
    "site"
  );

  if (!guardResult.success) {
    return {
      success: false,
      message:
        guardResult.message,
    };
  }

  const { userId } = await getSession();

  if (!userId) {
    return {
      success: false,
      message:
        "Utilisateur non authentifié.",
    };
  }

  const { currentTenantId } = await getSession();

  if (!currentTenantId) {
    return {
      success: false,
      message:
        "L'utilisateur n'est associé à aucun tenant.",
    };
  }

  if (!name) {
    return {
      success: false,
      message:
        "Le nom du site est obligatoire.",
    };
  }

  try {
    const site =
      await prisma.site.findFirst({
        where: {
          id,
          tenantId:
            currentTenantId,
        },
      });

    if (!site) {
      return {
        success: false,
        message:
          "Site introuvable.",
      };
    }

    const duplicate =
      await prisma.site.findFirst({
        where: {
          tenantId:
            currentTenantId,
          name: {
            equals: name,
            mode: "insensitive",
          },
          NOT: {
            id,
          },
        },
      });

    if (duplicate) {
      return {
        success: false,
        message:
          "Un autre site porte déjà ce nom.",
      };
    }

    await prisma.site.update({
      where: {
        id,
      },
      data: {
        name,
        active,
      },
    });

    return {
      success: true,
      message:
        "Site modifié avec succès.",
    };
  } catch (error) {
    console.error(
      "updateSite error:",
      error
    );

    return {
      success: false,
      message:
        "Une erreur est survenue lors de la modification du site.",
    };
  }
}

export async function deleteSite(
  id: string
): Promise<ActionResponse> {
  const guardResult = await guard(
    ACTION.DELETE,
    "site"
  );

  if (!guardResult.success) {
    return {
      success: false,
      message:
        guardResult.message,
    };
  }

  const { userId } = await getSession();
  if (!userId) {
    return {
      success: false,
      message:
        "Utilisateur non authentifié.",
    };
  }

  const { currentTenantId } = await getSession();

  if (!currentTenantId) {
    return {
      success: false,
      message:
        "L'utilisateur n'est associé à aucun tenant.",
    };
  }

  try {


    const site =
      await prisma.site.findFirst({
        where: {
          id,
          tenantId:
            currentTenantId,
        },
      });

    if (!site) {
      return {
        success: false,
        message:
          "Site introuvable.",
      };
    }

    await prisma.site.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      message:
        "Site supprimé avec succès.",
    };
  } catch (error) {
    console.error(
      "deleteSite error:",
      error
    );

    return {
      success: false,
      message:
        "Une erreur est survenue lors de la suppression du site.",
    };
  }
}