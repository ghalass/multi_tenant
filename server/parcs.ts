
"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import type { ActionResponse } from "@/lib/types/types";
import { getSession } from "@/lib/auth";
import { PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";
import { convertField } from "@/lib/convertField";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  MaintenanceSyncError,
  synchroniserSuivisMaintenancePourEngin,
} from "@/lib/maintenance-preventive-sync";

export interface SearchParamsParcs {
  name?: string;
  currentPage?: number | string;
  itemsPerPage?: number | string;
}

export type ParcListItem = Prisma.ParcGetPayload<{
  include: {
    typeparc: { select: { id: true; name: true } };
    tenant: { select: { id: true; name: true } };
  };
}>;

type ParcTypeChangeHistoryCounts = {
  saisiesHrm: number;
  saisiesHim: number;
  backlogs: number;
  historiquesMaintenance: number;
  objectifs: number;
};

async function getTenantId(): Promise<string | null> {
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

/**
 * Vérifie les données historiques qui seraient reclassées
 * si le type du parc était modifié.
 */
async function getParcTypeChangeHistoryCounts(
  tx: Prisma.TransactionClient,
  tenantId: string,
  parcId: string,
): Promise<ParcTypeChangeHistoryCounts> {
  const enginFilter = {
    is: {
      parcId,
      tenantId,
    },
  };

  const [
    saisiesHrm,
    saisiesHim,
    backlogs,
    historiquesMaintenance,
    objectifs,
  ] = await Promise.all([
    tx.saisiehrm.count({
      where: {
        tenantId,
        engin: enginFilter,
      },
    }),

    tx.saisiehim.count({
      where: {
        tenantId,
        saisiehrm: {
          is: {
            tenantId,
            engin: enginFilter,
          },
        },
      },
    }),

    tx.backlog.count({
      where: {
        tenantId,
        engin: enginFilter,
      },
    }),

    tx.historiqueMaintenancePreventive.count({
      where: {
        tenantId,
        engin: enginFilter,
      },
    }),

    tx.objectif.count({
      where: {
        tenantId,
        parcId,
      },
    }),
  ]);

  return {
    saisiesHrm,
    saisiesHim,
    backlogs,
    historiquesMaintenance,
    objectifs,
  };
}

function getParcTypeChangeBlockMessage(
  counts: ParcTypeChangeHistoryCounts,
): string | null {
  const dependencies: string[] = [];

  if (counts.saisiesHrm > 0) {
    dependencies.push(`${counts.saisiesHrm} saisie(s) HRM`);
  }

  if (counts.saisiesHim > 0) {
    dependencies.push(`${counts.saisiesHim} saisie(s) HIM`);
  }

  if (counts.backlogs > 0) {
    dependencies.push(`${counts.backlogs} backlog(s)`);
  }

  if (counts.historiquesMaintenance > 0) {
    dependencies.push(
      `${counts.historiquesMaintenance} historique(s) de maintenance préventive`,
    );
  }

  if (counts.objectifs > 0) {
    dependencies.push(`${counts.objectifs} objectif(s)`);
  }

  if (dependencies.length === 0) {
    return null;
  }

  return (
    "Changement de type impossible : ce parc possède des données historiques liées à " +
    `${dependencies.join(", ")}. ` +
    "Le changement reclasserait ces données dans les rapports. " +
    "Conservez le type actuel pour préserver l'historique."
  );
}

/**
 * Après un changement de type de parc, les engins du parc
 * doivent être resynchronisés avec les affectations de maintenance.
 */
async function synchroniserMaintenanceEnginsDuParc(
  tx: Prisma.TransactionClient,
  tenantId: string,
  parcId: string,
): Promise<void> {
  const engins = await tx.engin.findMany({
    where: {
      parcId,
      tenantId,
    },
    select: {
      id: true,
    },
  });

  for (const engin of engins) {
    await synchroniserSuivisMaintenancePourEngin(
      tx,
      tenantId,
      engin.id,
    );
  }
}

export async function getAllParcs(
  filters: SearchParamsParcs = {},
): Promise<ActionResponse<ParcListItem>> {
  const permission = await guard(ACTION.READ, RESOURCE.PARC);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
      data: [],
    };
  }

  const tenantId = await getTenantId();

  if (!tenantId) {
    return {
      success: false,
      message: "Sélectionnez un tenant actif.",
      data: [],
    };
  }

  const currentPage = Math.max(
    Number(filters.currentPage) || 1,
    1,
  );

  const requestedItems =
    filters.itemsPerPage === 0 ||
      filters.itemsPerPage === "0"
      ? 0
      : Math.max(
        Number(filters.itemsPerPage) ||
        PAGINATION_SETTINGS.itemsPerPage,
        1,
      );

  const isUnpaged = requestedItems === 0;
  const itemsPerPage = requestedItems;

  const where: Prisma.ParcWhereInput = { tenantId };

  const name = filters.name?.trim();

  if (name) {
    where.name = {
      contains: name,
      mode: "insensitive",
    };
  }

  const [parcs, totalItems] = await Promise.all([
    prisma.parc.findMany({
      where,
      orderBy: {
        name: "asc",
      },
      skip: isUnpaged
        ? 0
        : (currentPage - 1) * itemsPerPage,
      take: isUnpaged ? undefined : itemsPerPage,
      include: {
        typeparc: {
          select: {
            id: true,
            name: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),

    prisma.parc.count({ where }),
  ]);

  return {
    success: true,
    message: "Données récupérées avec succès.",
    data: parcs,
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

export async function getParcTypeOptions(): Promise<{
  success: boolean;
  message: string;
  data: { id: string; name: string }[];
}> {
  const permission = await guard(ACTION.READ, RESOURCE.PARC);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
      data: [],
    };
  }

  const tenantId = await getTenantId();

  if (!tenantId) {
    return {
      success: false,
      message: "Sélectionnez un tenant actif.",
      data: [],
    };
  }

  const data = await prisma.typeparc.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return {
    success: true,
    message: "",
    data,
  };
}

export async function createParc(values: {
  name: string;
  typeparcId: string;
}): Promise<ActionResponse> {
  const permission = await guard(ACTION.CREATE, RESOURCE.PARC);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
    };
  }

  const tenantId = await getTenantId();

  if (!tenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
    };
  }

  const name = values.name.trim();
  const typeparcId = values.typeparcId;

  if (!name || !typeparcId) {
    return {
      success: false,
      message: "Le nom et le type de parc sont obligatoires.",
    };
  }

  try {
    const typeparc = await prisma.typeparc.findFirst({
      where: {
        id: typeparcId,
        tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!typeparc) {
      return {
        success: false,
        message: "Le type de parc sélectionné est invalide.",
      };
    }

    const duplicate = await prisma.parc.findFirst({
      where: {
        tenantId,
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (duplicate) {
      return {
        success: false,
        message: "Ce parc existe déjà.",
      };
    }

    await prisma.parc.create({
      data: {
        name,
        typeparcId,
        tenantId,
      },
    });

    return {
      success: true,
      message: "Parc créé avec succès.",
    };
  } catch (error) {
    console.error("createParc error:", error);

    if (getPrismaErrorCode(error) === "P2002") {
      return {
        success: false,
        message: "Ce parc existe déjà.",
      };
    }

    return {
      success: false,
      message: "Erreur lors de la création du parc.",
    };
  }
}

export async function updateParc(values: {
  id: string;
  name: string;
  typeparcId: string;
}): Promise<ActionResponse> {
  const permission = await guard(ACTION.UPDATE, RESOURCE.PARC);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
    };
  }

  const tenantId = await getTenantId();

  if (!tenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
    };
  }

  const name = values.name.trim();

  if (!values.id || !name || !values.typeparcId) {
    return {
      success: false,
      message: "Tous les champs sont obligatoires.",
    };
  }

  try {
    const parc = await prisma.parc.findFirst({
      where: {
        id: values.id,
        tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!parc) {
      return {
        success: false,
        message: "Parc introuvable.",
      };
    }

    const typeparc = await prisma.typeparc.findFirst({
      where: {
        id: values.typeparcId,
        tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!typeparc) {
      return {
        success: false,
        message: "Le type de parc sélectionné est invalide.",
      };
    }

    const duplicate = await prisma.parc.findFirst({
      where: {
        tenantId,
        name: {
          equals: name,
          mode: "insensitive",
        },
        NOT: {
          id: values.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      return {
        success: false,
        message: "Un autre parc porte déjà ce nom.",
      };
    }

    const updateResult = await prisma.$transaction(
      async (tx) => {
        const currentParc = await tx.parc.findFirst({
          where: {
            id: values.id,
            tenantId,
          },
          select: {
            id: true,
            typeparcId: true,
          },
        });

        if (!currentParc) {
          return {
            status: "not-found" as const,
          };
        }

        const typeHasChanged =
          currentParc.typeparcId !== values.typeparcId;

        if (typeHasChanged) {
          const counts = await getParcTypeChangeHistoryCounts(
            tx,
            tenantId,
            values.id,
          );

          const blockMessage =
            getParcTypeChangeBlockMessage(counts);

          if (blockMessage) {
            return {
              status: "history-blocked" as const,
              message: blockMessage,
            };
          }
        }

        await tx.parc.update({
          where: {
            id: values.id,
          },
          data: {
            name,
            typeparcId: values.typeparcId,
          },
        });

        if (typeHasChanged) {
          await synchroniserMaintenanceEnginsDuParc(
            tx,
            tenantId,
            values.id,
          );
        }

        return {
          status: "updated" as const,
        };
      },
      {
        isolationLevel: "Serializable",
      },
    );

    if (updateResult.status === "not-found") {
      return {
        success: false,
        message: "Parc introuvable.",
      };
    }

    if (updateResult.status === "history-blocked") {
      return {
        success: false,
        message: updateResult.message,
      };
    }

    return {
      success: true,
      message: "Parc modifié avec succès.",
    };
  } catch (error) {
    if (error instanceof MaintenanceSyncError) {
      return {
        success: false,
        message: error.message,
      };
    }

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
        message: "Un autre parc porte déjà ce nom.",
      };
    }

    console.error("updateParc error:", error);

    return {
      success: false,
      message: "Erreur lors de la modification du parc.",
    };
  }
}

export async function deleteParc(
  id: string,
): Promise<ActionResponse> {
  const permission = await guard(ACTION.DELETE, RESOURCE.PARC);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
    };
  }

  const tenantId = await getTenantId();

  if (!tenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
    };
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const parc = await tx.parc.findFirst({
          where: {
            id,
            tenantId,
          },
          select: {
            id: true,
          },
        });

        if (!parc) {
          return {
            deleted: false as const,
            message: "Parc introuvable.",
          };
        }

        const [
          engins,
          associationsPannes,
          objectifs,
          affectationsMaintenance,
        ] = await Promise.all([
          tx.engin.count({
            where: {
              parcId: id,
              tenantId,
            },
          }),

          tx.panneParc.count({
            where: {
              parcId: id,
            },
          }),

          tx.objectif.count({
            where: {
              parcId: id,
              tenantId,
            },
          }),

          tx.affectationPlanMaintenance.count({
            where: {
              parcId: id,
              tenantId,
            },
          }),
        ]);

        const dependencies: string[] = [];

        if (engins > 0) {
          dependencies.push(`${engins} engin(s)`);
        }

        if (associationsPannes > 0) {
          dependencies.push(
            `${associationsPannes} association(s) avec des pannes`,
          );
        }

        if (objectifs > 0) {
          dependencies.push(`${objectifs} objectif(s)`);
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
              `Suppression impossible : ce parc est encore utilisé par ${dependencies.join(", ")}. ` +
              "Supprimez ou réaffectez d'abord ces dépendances. Les données liées sont conservées.",
          };
        }

        await tx.parc.delete({
          where: { id },
        });

        return {
          deleted: true as const,
          message: "Parc supprimé avec succès.",
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
    console.error("deleteParc error:", error);

    return {
      success: false,
      message:
        "Suppression impossible : des données sont encore liées à ce parc. Aucune donnée liée n'a été supprimée.",
    };
  }
}

export async function importParcs(
  data: Record<string, unknown>,
): Promise<
  | { success: boolean; data: null; message: string }[]
  | { success: boolean; data: Record<string, unknown>; message: string }[]
  | {
    success: boolean;
    data: {
      id: string;
      name: string;
      tenantId: string;
      typeparcId: string;
    };
    message: string;
  }[]
> {
  try {
    const permission = await guard(ACTION.IMPORT, RESOURCE.PARC);

    if (!permission.success) {
      return [{
        success: false,
        data: null,
        message: permission.message,
      }];
    }

    const name = convertField(data.name, "string");
    const typeparcName = convertField(
      data.typeparcName,
      "string",
    );
    const tenantId = await getTenantId();

    if (!name?.trim() || !typeparcName?.trim() || !tenantId) {
      return [{
        success: false,
        data,
        message:
          "Nom, type de parc et tenant actif obligatoires.",
      }];
    }

    const trimmedName = name.trim();
    const trimmedTypeParcName = typeparcName.trim();

    const importResult = await prisma.$transaction(
      async (tx) => {
        // Recherche du type sans distinction de casse.
        const matchingTypes = await tx.typeparc.findMany({
          where: {
            tenantId,
            name: {
              equals: trimmedTypeParcName,
              mode: "insensitive",
            },
          },
          select: {
            id: true,
            name: true,
          },
          take: 2,
        });

        if (matchingTypes.length === 0) {
          return {
            status: "type-not-found" as const,
          };
        }

        if (matchingTypes.length > 1) {
          return {
            status: "type-ambiguous" as const,
          };
        }

        const typeparc = matchingTypes[0];

        // Recherche du parc sans distinction de casse.
        const matchingParcs = await tx.parc.findMany({
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
            tenantId: true,
            typeparcId: true,
          },
          take: 2,
        });

        if (matchingParcs.length > 1) {
          return {
            status: "parc-ambiguous" as const,
          };
        }

        const existingParc = matchingParcs[0];

        if (!existingParc) {
          const parc = await tx.parc.create({
            data: {
              name: trimmedName,
              typeparcId: typeparc.id,
              tenantId,
            },
            select: {
              id: true,
              name: true,
              tenantId: true,
              typeparcId: true,
            },
          });

          return {
            status: "saved" as const,
            parc,
          };
        }

        const typeHasChanged =
          existingParc.typeparcId !== typeparc.id;

        if (typeHasChanged) {
          const counts = await getParcTypeChangeHistoryCounts(
            tx,
            tenantId,
            existingParc.id,
          );

          const blockMessage =
            getParcTypeChangeBlockMessage(counts);

          if (blockMessage) {
            return {
              status: "history-blocked" as const,
              message: blockMessage,
            };
          }
        }

        const parc = await tx.parc.update({
          where: {
            id: existingParc.id,
          },
          data: {
            name: trimmedName,
            typeparcId: typeparc.id,
          },
          select: {
            id: true,
            name: true,
            tenantId: true,
            typeparcId: true,
          },
        });

        if (typeHasChanged) {
          await synchroniserMaintenanceEnginsDuParc(
            tx,
            tenantId,
            existingParc.id,
          );
        }

        return {
          status: "saved" as const,
          parc,
        };
      },
      {
        isolationLevel: "Serializable",
      },
    );

    if (importResult.status === "type-not-found") {
      return [{
        success: false,
        data,
        message:
          `Type de parc "${trimmedTypeParcName}" introuvable.`,
      }];
    }

    if (importResult.status === "type-ambiguous") {
      return [{
        success: false,
        data,
        message:
          `Plusieurs types de parc correspondent au nom "${trimmedTypeParcName}". Corrigez les doublons avant de relancer l'import.`,
      }];
    }

    if (importResult.status === "parc-ambiguous") {
      return [{
        success: false,
        data,
        message:
          `Plusieurs parcs correspondent au nom "${trimmedName}". Corrigez les doublons avant de relancer l'import.`,
      }];
    }

    if (importResult.status === "history-blocked") {
      return [{
        success: false,
        data,
        message: importResult.message,
      }];
    }

    return [{
      success: true,
      data: importResult.parc,
      message:
        `Parc "${importResult.parc.name}" importé avec succès.`,
    }];
  } catch (error) {
    if (error instanceof MaintenanceSyncError) {
      return [{
        success: false,
        data,
        message: error.message,
      }];
    }

    const code = getPrismaErrorCode(error);

    if (code === "P2034") {
      return [{
        success: false,
        data,
        message:
          "Import interrompu : les données ont été modifiées simultanément. Veuillez relancer l'import.",
      }];
    }

    if (code === "P2002") {
      return [{
        success: false,
        data,
        message:
          "Import impossible : un parc portant déjà ce nom existe.",
      }];
    }

    console.error("importParcs error:", error);

    return [{
      success: false,
      data,
      message: "Erreur lors de l'importation du parc.",
    }];
  }
}
