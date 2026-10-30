
"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import type { ActionResponse } from "@/lib/types/types";
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
  include: {
    tenant: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

function getPrismaErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }

  return undefined;
}

async function getActiveTenantId(): Promise<string | null> {
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

export async function getAllSites(
  filters: searchParams = { itemsPerPage: 0 },
): Promise<ActionResponse<SiteListItem>> {
  const permission = await guard(ACTION.READ, RESOURCE.SITE);

  if (!permission.success) {
    return {
      data: [],
      success: false,
      message: permission.message,
    };
  }

  const tenantId = await getActiveTenantId();

  if (!tenantId) {
    return {
      data: [],
      success: false,
      message: "Sélectionnez un tenant actif avant de consulter les sites.",
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
  const active = filters.active;

  const where: Prisma.SiteWhereInput = {
    tenantId,
  };

  if (name) {
    where.name = {
      contains: name,
      mode: "insensitive",
    };
  }

  // Correction du filtre : les sites inactifs doivent être accessibles
  // lorsque l'utilisateur sélectionne explicitement le statut inactif.
  if (active === ACTIVE.YES) {
    where.active = true;
  } else if (active === ACTIVE.NO) {
    where.active = false;
  } else {
    where.active = true;
  }

  const [sites, totalItems] = await Promise.all([
    prisma.site.findMany({
      where,
      orderBy: {
        name: "asc",
      },
      skip: isUnpaged
        ? 0
        : (currentPage - 1) * itemsPerPage,
      take: isUnpaged ? undefined : itemsPerPage,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),

    prisma.site.count({ where }),
  ]);

  return {
    data: sites,
    success: true,
    message: "Données récupérées avec succès.",
    meta: {
      totalItems,
      totalPages: isUnpaged
        ? 1
        : Math.max(1, Math.ceil(totalItems / itemsPerPage)),
      currentPage,
      itemsPerPage,
    },
  };
}

export async function createSite({
  name,
  active,
}: {
  name: string;
  active: boolean;
}): Promise<ActionResponse> {
  const permission = await guard(ACTION.CREATE, RESOURCE.SITE);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
    };
  }

  const tenantId = await getActiveTenantId();

  if (!tenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
    };
  }

  const trimmedName = name?.trim();

  if (!trimmedName) {
    return {
      success: false,
      message: "Le nom du site est obligatoire.",
    };
  }

  try {
    const existing = await prisma.site.findFirst({
      where: {
        tenantId,
        name: {
          equals: trimmedName,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
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
        tenantId,
      },
    });

    return {
      success: true,
      message: "Site créé avec succès.",
    };
  } catch (error) {
    console.error("createSite error:", error);

    if (getPrismaErrorCode(error) === "P2002") {
      return {
        success: false,
        message: "Ce site existe déjà.",
      };
    }

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
  const permission = await guard(ACTION.UPDATE, RESOURCE.SITE);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
    };
  }

  const { userId } = await getSession();
  const tenantId = await getActiveTenantId();

  if (!userId) {
    return {
      success: false,
      message: "Utilisateur non authentifié.",
    };
  }

  if (!tenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
    };
  }

  const trimmedName = name?.trim();

  if (!trimmedName) {
    return {
      success: false,
      message: "Le nom du site est obligatoire.",
    };
  }

  if (!id) {
    return {
      success: false,
      message: "Identifiant du site manquant.",
    };
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const site = await tx.site.findFirst({
          where: {
            id,
            tenantId,
          },
          select: {
            id: true,
            active: true,
          },
        });

        if (!site) {
          return {
            status: "not-found" as const,
          };
        }

        const duplicate = await tx.site.findFirst({
          where: {
            tenantId,
            name: {
              equals: trimmedName,
              mode: "insensitive",
            },
            NOT: {
              id,
            },
          },
          select: {
            id: true,
          },
        });

        if (duplicate) {
          return {
            status: "duplicate" as const,
          };
        }

        // Une désactivation n'est autorisée que si aucun engin actif
        // ne reste affecté au site.
        if (site.active && !active) {
          const activeEngins = await tx.engin.count({
            where: {
              siteId: id,
              tenantId,
              active: true,
            },
          });

          if (activeEngins > 0) {
            return {
              status: "active-engins" as const,
              activeEngins,
            };
          }
        }

        await tx.site.update({
          where: {
            id,
          },
          data: {
            name: trimmedName,
            active,
          },
        });

        return {
          status: "updated" as const,
        };
      },
      {
        isolationLevel: "Serializable",
      },
    );

    if (result.status === "not-found") {
      return {
        success: false,
        message: "Site introuvable.",
      };
    }

    if (result.status === "duplicate") {
      return {
        success: false,
        message: "Un autre site porte déjà ce nom.",
      };
    }

    if (result.status === "active-engins") {
      return {
        success: false,
        message:
          `Désactivation impossible : ${result.activeEngins} engin(s) actif(s) ` +
          "sont encore affectés à ce site. " +
          "Désactivez ou réaffectez ces engins avant de désactiver le site. " +
          "Aucune donnée historique n'a été modifiée.",
      };
    }

    return {
      success: true,
      message: "Site modifié avec succès.",
    };
  } catch (error) {
    console.error("updateSite error:", error);

    const code = getPrismaErrorCode(error);

    if (code === "P2034") {
      return {
        success: false,
        message:
          "Les données ont été modifiées simultanément. Veuillez réessayer.",
      };
    }

    if (code === "P2002") {
      return {
        success: false,
        message: "Un autre site porte déjà ce nom.",
      };
    }

    return {
      success: false,
      message: "Une erreur est survenue lors de la modification du site.",
    };
  }
}

export async function deleteSite(
  id: string,
): Promise<ActionResponse> {
  const permission = await guard(ACTION.DELETE, RESOURCE.SITE);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
    };
  }

  const { userId } = await getSession();
  const tenantId = await getActiveTenantId();

  if (!userId) {
    return {
      success: false,
      message: "Utilisateur non authentifié.",
    };
  }

  if (!tenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
    };
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const site = await tx.site.findFirst({
          where: {
            id,
            tenantId,
          },
          select: {
            id: true,
          },
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
            where: {
              siteId: id,
              tenantId,
            },
          }),

          tx.saisiehrm.count({
            where: {
              siteId: id,
              tenantId,
            },
          }),

          tx.saisiehim.count({
            where: {
              tenantId,
              saisiehrm: {
                is: {
                  siteId: id,
                  tenantId,
                },
              },
            },
          }),

          tx.objectif.count({
            where: {
              siteId: id,
              tenantId,
            },
          }),

          tx.backlog.count({
            where: {
              siteId: id,
              tenantId,
            },
          }),

          tx.affectationPlanMaintenance.count({
            where: {
              siteId: id,
              tenantId,
            },
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
          where: {
            id,
          },
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

    const code = getPrismaErrorCode(error);

    if (code === "P2034") {
      return {
        success: false,
        message:
          "Les données ont été modifiées simultanément. Veuillez réessayer.",
      };
    }

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
  | {
    success: boolean;
    data: null;
    message: string;
  }[]
  | {
    success: boolean;
    data: Record<string, unknown>;
    message: string;
  }[]
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
          message: "Erreur : le champ 'name' est requis.",
        },
      ];
    }

    const tenantId = await getActiveTenantId();

    if (!tenantId) {
      return [
        {
          success: false,
          data,
          message: "Aucun tenant actif pour l'import du site.",
        },
      ];
    }

    const trimmedName = name.trim();

    // L'import ne modifie jamais le statut actif/inactif d'un site existant.
    // Il ne fait que créer un site ou mettre à jour son nom.
    const result = await prisma.$transaction(
      async (tx) => {
        const matches = await tx.site.findMany({
          where: {
            tenantId,
            name: {
              equals: trimmedName,
              mode: "insensitive",
            },
          },
          select: {
            id: true,
            name: true,
            active: true,
            tenantId: true,
          },
          take: 2,
        });

        if (matches.length > 1) {
          return {
            status: "ambiguous" as const,
          };
        }

        if (matches.length === 1) {
          const site = await tx.site.update({
            where: {
              id: matches[0].id,
            },
            data: {
              name: trimmedName,
            },
          });

          return {
            status: "saved" as const,
            site,
          };
        }

        const site = await tx.site.create({
          data: {
            name: trimmedName,
            tenantId,
          },
        });

        return {
          status: "saved" as const,
          site,
        };
      },
      {
        isolationLevel: "Serializable",
      },
    );

    if (result.status === "ambiguous") {
      return [
        {
          success: false,
          data,
          message:
            `Import refusé : plusieurs sites correspondent au nom "${trimmedName}". ` +
            "Corrigez les doublons avant de relancer l'import.",
        },
      ];
    }

    return [
      {
        success: true,
        data: result.site,
        message: `Site "${result.site.name}" importé avec succès.`,
      },
    ];
  } catch (error: unknown) {
    console.error("Erreur lors de l'import des sites :", error);

    const code = getPrismaErrorCode(error);

    return [
      {
        success: false,
        data,
        message:
          code === "P2034"
            ? "Import interrompu : les données ont été modifiées simultanément. Veuillez relancer l'import."
            : code === "P2002"
              ? "Import impossible : un site portant déjà ce nom existe."
              : "Une erreur interne est survenue lors de l'import des sites. Vérifiez les données et consultez les journaux serveur si le problème persiste.",
      },
    ];
  }
}
