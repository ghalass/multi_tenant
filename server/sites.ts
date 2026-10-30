"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { ActionResponse } from "@/lib/types/types";
import { getSession } from "@/lib/auth";
import { ACTIVE, PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";
import { convertField } from "@/lib/convertField";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface searchParams {
  name?: string;
  active?: string;
  currentPage?: number;
  itemsPerPage?: number;
}

type SiteListItem = Prisma.SiteGetPayload<{
  include: { tenant: { select: { id: true; name: true } } };
}>;

export async function getAllSites(
  filters: searchParams = { itemsPerPage: 0 }
): Promise<ActionResponse<SiteListItem>> {
  const g = await guard(ACTION.READ, RESOURCE.SITE);
  if (!g.success) return { data: [], success: false, message: g.message };

  const { currentTenantId } = await getSession();

  if (!currentTenantId) {
    return {
      data: [],
      success: false,
      message: "Sélectionnez un tenant avant de consulter les sites.",
    };
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

  if (!tenant) {
    return {
      data: [],
      success: false,
      message: "Le tenant sélectionné est introuvable ou désactivé.",
    };
  }

  // Pagination
  const currentPage = Math.max(filters?.currentPage ?? 1, 1);
  const isUnpaged = filters?.itemsPerPage === 0;
  const itemsPerPage = isUnpaged
    ? 0
    : Math.max(filters?.itemsPerPage ?? PAGINATION_SETTINGS.itemsPerPage, 1);

  const { name, active } = filters;

  const where: Prisma.SiteWhereInput = { tenantId: currentTenantId };

  if (name) {
    where.name = { contains: name, mode: "insensitive" };
  }

  if (active === ACTIVE.YES) where.active = true;
  if (active === ACTIVE.NO) where.active = false;
  else where.active = true;

  const skip = isUnpaged ? 0 : (currentPage - 1) * itemsPerPage;
  const take = isUnpaged ? undefined : itemsPerPage;

  const [sites, totalItems] = await Promise.all([
    prisma.site.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
      // On ne renvoie que les champs utiles du tenant
      include: {
        tenant: { select: { id: true, name: true } },
      },
    }),
    prisma.site.count({ where }),
  ]);

  const totalPages = isUnpaged ? 1 : Math.ceil(totalItems / itemsPerPage);

  return {
    data: sites,
    success: true,
    message: "Données récupérées avec succès!",
    meta: { totalItems, totalPages, currentPage, itemsPerPage },
  };
}

export async function createSite({
  name,
  active,
}: {
  name: string;
  active: boolean;
}): Promise<ActionResponse> {
  const guardResult = await guard(ACTION.CREATE, RESOURCE.SITE);

  if (!guardResult.success) {
    return {
      success: false,
      message: guardResult.message,
    };
  }

  const { currentTenantId } = await getSession();

  if (!currentTenantId) {
    return {
      success: false,
      message: "L'utilisateur n'est associé à aucun tenant.",
    };
  }

  const trimmedName = name.trim();

  if (!trimmedName) {
    return {
      success: false,
      message: "Le nom du site est obligatoire.",
    };
  }

  try {
    const existing = await prisma.site.findFirst({
      where: {
        tenantId: currentTenantId,
        name: {
          equals: trimmedName,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return {
        success: false,
        message: "Ce site existe déjà.",
      };
    }

    await prisma.site.create({
      data: {
        name: trimmedName,
        active,
        tenantId: currentTenantId,
      },
    });

    return {
      success: true,
      message: "Site créé avec succès.",
    };
  } catch (error) {
    console.error("createSite error:", error);

    return {
      success: false,
      message: "Une erreur est survenue lors de la création du site.",
    };
  }
}

export async function updateSite({
  id,
  name,
  active,
}: {
  id: string;
  name: string;
  active: boolean;
}): Promise<ActionResponse> {
  const guardResult = await guard(
    ACTION.UPDATE,
    RESOURCE.SITE,
  );

  if (!guardResult.success) {
    return {
      success: false,
      message: guardResult.message,
    };
  }

  const { userId, currentTenantId } = await getSession();

  if (!userId) {
    return {
      success: false,
      message: "Utilisateur non authentifié.",
    };
  }

  if (!currentTenantId) {
    return {
      success: false,
      message: "L'utilisateur n'est associé à aucun tenant.",
    };
  }

  if (!name) {
    return {
      success: false,
      message: "Le nom du site est obligatoire.",
    };
  }

  try {
    const site = await prisma.site.findFirst({
      where: {
        id,
        tenantId: currentTenantId,
      },
    });

    if (!site) {
      return {
        success: false,
        message: "Site introuvable.",
      };
    }

    const duplicate = await prisma.site.findFirst({
      where: {
        tenantId: currentTenantId,
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
        message: "Un autre site porte déjà ce nom.",
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
      message: "Site modifié avec succès.",
    };
  } catch (error) {
    console.error("updateSite error:", error);

    return {
      success: false,
      message: "Une erreur est survenue lors de la modification du site.",
    };
  }
}

export async function deleteSite(
  id: string,
): Promise<ActionResponse> {
  const guardResult = await guard(
    ACTION.DELETE,
    RESOURCE.SITE,
  );

  if (!guardResult.success) {
    return {
      success: false,
      message: guardResult.message,
    };
  }

  const { userId, currentTenantId } = await getSession();

  if (!userId) {
    return {
      success: false,
      message: "Utilisateur non authentifié.",
    };
  }

  if (!currentTenantId) {
    return {
      success: false,
      message: "L'utilisateur n'est associé à aucun tenant.",
    };
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const site = await tx.site.findFirst({
          where: {
            id,
            tenantId: currentTenantId,
          },
          select: { id: true },
        });

        if (!site) {
          return {
            deleted: false as const,
            message: "Site introuvable.",
          };
        }

        const [
          engins,
          saisiesHrm,
          saisiesHim,
          objectifs,
          backlogs,
          affectationsMaintenance,
        ] = await Promise.all([
          tx.engin.count({
            where: { siteId: id, tenantId: currentTenantId },
          }),
          tx.saisiehrm.count({
            where: { siteId: id, tenantId: currentTenantId },
          }),
          tx.saisiehim.count({
            where: {
              tenantId: currentTenantId,
              saisiehrm: {
                is: {
                  siteId: id,
                  tenantId: currentTenantId,
                },
              },
            },
          }),
          tx.objectif.count({
            where: { siteId: id, tenantId: currentTenantId },
          }),
          tx.backlog.count({
            where: { siteId: id, tenantId: currentTenantId },
          }),
          tx.affectationPlanMaintenance.count({
            where: { siteId: id, tenantId: currentTenantId },
          }),
        ]);

        const dependencies: string[] = [];

        if (engins > 0) {
          dependencies.push(`${engins} engin(s)`);
        }

        if (saisiesHrm > 0) {
          dependencies.push(`${saisiesHrm} saisie(s) HRM`);
        }

        if (saisiesHim > 0) {
          dependencies.push(`${saisiesHim} saisie(s) HIM`);
        }

        if (objectifs > 0) {
          dependencies.push(`${objectifs} objectif(s)`);
        }

        if (backlogs > 0) {
          dependencies.push(`${backlogs} backlog(s)`);
        }

        if (affectationsMaintenance > 0) {
          dependencies.push(
            `${affectationsMaintenance} affectation(s) de maintenance`,
          );
        }

        if (dependencies.length > 0) {
          return {
            deleted: false as const,
            message:
              `Suppression impossible : ce site est encore utilisé par ${dependencies.join(", ")}. ` +
              "Désactivez le site pour le retirer des nouvelles saisies tout en conservant son historique.",
          };
        }

        await tx.site.delete({
          where: { id },
        });

        return {
          deleted: true as const,
          message: "Site supprimé avec succès.",
        };
      },
      {
        isolationLevel: "Serializable",
      },
    );

    return {
      success: result.deleted,
      message: result.message,
    };
  } catch (error) {
    console.error("deleteSite error:", error);

    return {
      success: false,
      message:
        "Suppression impossible : des données sont encore liées à ce site. Aucune donnée historique n'a été supprimée.",
    };
  }
}

export async function importSites(
  data: Record<string, unknown>,
): Promise<
  | { success: boolean; data: null; message: string }[]
  | { success: boolean; data: Record<string, unknown>; message: string }[]
  | {
    success: boolean;
    data: {
      id: string;
      name: string;
      active: boolean;
      tenantId: string;
    };
    message: string;
  }[]
> {
  try {
    const permission = await guard(ACTION.IMPORT, RESOURCE.SITE);

    if (!permission.success) {
      return [{
        success: false,
        data: null,
        message: permission.message,
      }];
    }

    const name = convertField(data.name, "string");

    if (!name || name.trim() === "") {
      return [
        {
          success: false,
          data,
          message: "Erreur: Le champ 'name' est requis",
        },
      ];
    }

    const { currentTenantId } = await getSession();

    if (!currentTenantId) {
      return [
        {
          success: false,
          data,
          message: "Erreur: Aucun tenant actif pour l'import du site",
        },
      ];
    }

    const site = await prisma.site.upsert({
      where: {
        name_tenantId: {
          tenantId: currentTenantId,
          name,
        },
      },
      update: {
        name,
      },
      create: {
        name,
        tenantId: currentTenantId,
      },
    });

    return [
      {
        success: true,
        data: site,
        message: `Site ${name} importé avec succès`,
      },
    ];
  } catch (error: unknown) {
    console.error("Erreur lors de l'import des sites :", error);

    return [
      {
        success: false,
        data,
        message:
          "Une erreur interne est survenue lors de l'import des sites. Vérifiez les données et consultez les journaux serveur si le problème persiste.",
      },
    ];
  }
}