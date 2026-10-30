"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { convertField } from "@/lib/convertField";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ActionResponse } from "@/lib/types/types";

export interface PannesSearchParams {
  name?: string;
  typeparcId?: string;
  parcId?: string;
  typepanneId?: string;
  currentPage?: number | string;
  itemsPerPage?: number | string;
}

export type PanneParcInput = {
  parcId: string;
  description?: string | null;
};

export type PanneInput = {
  name: string;
  typepanneId: string;
  parcs: PanneParcInput[];
};

export type PanneParcListItem = Prisma.PanneParcGetPayload<{
  include: {
    parc: { select: { id: true; name: true; typeparcId: true } };
    panne: {
      include: {
        typepanne: { select: { id: true; name: true } };
        parcs: {
          include: {
            parc: { select: { id: true; name: true; typeparcId: true } };
          };
        };
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

async function getPanneTenantId(): Promise<string | null> {
  const { currentTenantId } = await getSession();

  if (!currentTenantId) return null;

  const tenant = await prisma.tenant.findFirst({
    where: { id: currentTenantId, active: true },
    select: { id: true },
  });

  return tenant?.id ?? null;
}

export async function getPanneOptions(): Promise<{
  success: boolean;
  message: string;
  data: {
    typepannes: { id: string; name: string }[];
    typeparcs: { id: string; name: string }[];
    parcs: { id: string; name: string; typeparcId: string }[];
  };
}> {
  const permission = await guard(ACTION.READ, RESOURCE.PANNE);

  const emptyData = {
    typepannes: [],
    typeparcs: [],
    parcs: [],
  };

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
      data: emptyData,
    };
  }

  const tenantId = await getPanneTenantId();

  if (!tenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
      data: emptyData,
    };
  }

  const [typepannes, typeparcs, parcs] = await Promise.all([
    prisma.typepanne.findMany({
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
      select: {
        id: true,
        name: true,
        typeparcId: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    success: true,
    message: "",
    data: {
      typepannes,
      typeparcs,
      parcs,
    },
  };
}

export async function getAllPannes(
  filters: PannesSearchParams = {},
): Promise<ActionResponse<PanneParcListItem>> {
  const permission = await guard(ACTION.READ, RESOURCE.PANNE);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
      data: [],
    };
  }

  const tenantId = await getPanneTenantId();

  if (!tenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
      data: [],
    };
  }

  const requestedPage = Math.max(
    Number(filters.currentPage) || 1,
    1,
  );

  const requestedItems = Number(
    filters.itemsPerPage ?? PAGINATION_SETTINGS.itemsPerPage,
  );

  const itemsPerPage =
    requestedItems === 0
      ? 0
      : Math.max(
        requestedItems || PAGINATION_SETTINGS.itemsPerPage,
        1,
      );

  const name = filters.name?.trim();
  const typeparcId = filters.typeparcId?.trim();
  const parcId = filters.parcId?.trim();
  const typepanneId = filters.typepanneId?.trim();

  // Filtres appliqués à la panne.
  const panneWhere: Prisma.PanneWhereInput = { tenantId };

  if (name) {
    panneWhere.name = {
      contains: name,
      mode: "insensitive",
    };
  }

  if (typepanneId) {
    panneWhere.typepanneId = typepanneId;
  }

  // Filtres appliqués au parc de chaque association.
  const parcWhere: Prisma.ParcWhereInput = { tenantId };

  if (typeparcId) {
    parcWhere.typeparcId = typeparcId;
  }

  if (parcId) {
    parcWhere.id = parcId;
  }

  const where: Prisma.PanneParcWhereInput = {
    panne: {
      is: panneWhere,
    },
    parc: {
      is: parcWhere,
    },
  };

  if (typeparcId || parcId) {
    where.parc = {
      is: parcWhere,
    };
  }

  // La pagination compte les associations, pas les pannes distinctes.
  const totalItems = await prisma.panneParc.count({ where });

  const totalPages =
    itemsPerPage === 0
      ? 1
      : Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Évite une page vide si les filtres ou le nombre de lignes changent.
  const currentPage = Math.min(requestedPage, totalPages);

  const data = await prisma.panneParc.findMany({
    where,

    orderBy: [
      { panne: { name: "asc" } },
      { parc: { name: "asc" } },
    ],

    skip:
      itemsPerPage === 0
        ? 0
        : (currentPage - 1) * itemsPerPage,

    take: itemsPerPage === 0 ? undefined : itemsPerPage,

    include: {
      parc: {
        select: {
          id: true,
          name: true,
          typeparcId: true,
        },
      },

      panne: {
        include: {
          typepanne: {
            select: {
              id: true,
              name: true,
            },
          },

          // Conserve tous les parcs de la panne pour le formulaire d'édition.
          parcs: {
            include: {
              parc: {
                select: {
                  id: true,
                  name: true,
                  typeparcId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return {
    success: true,
    message: "Pannes récupérées avec succès.",
    data,
    meta: {
      totalItems,
      totalPages,
      currentPage,
      itemsPerPage,
    },
  };
}

async function validatePanneInput(
  input: PanneInput,
  tenantId: string,
): Promise<
  | {
    error: string;
    name?: undefined;
    typepanneId?: undefined;
    parcs?: undefined;
  }
  | {
    name: string;
    typepanneId: string;
    parcs: {
      parcId: string;
      description: string | null;
    }[];
    readonly error?: undefined;
  }
> {
  const name = input.name?.trim();
  const typepanneId = input.typepanneId;

  const parcs = (input.parcs ?? [])
    .map((item) => ({
      parcId: item.parcId,
      description: item.description?.trim() || null,
    }))
    .filter((item) => Boolean(item.parcId));

  const uniqueParcIds = new Set(parcs.map((item) => item.parcId));

  if (!name) {
    return { error: "Le nom de la panne est obligatoire." };
  }

  if (!typepanneId) {
    return { error: "Sélectionnez un type de panne." };
  }

  if (parcs.length === 0) {
    return { error: "Sélectionnez au moins un parc." };
  }

  if (uniqueParcIds.size !== parcs.length) {
    return {
      error: "Un parc ne peut être sélectionné qu'une seule fois.",
    };
  }

  const [typepanne, existingParcs] = await Promise.all([
    prisma.typepanne.findFirst({
      where: { id: typepanneId, tenantId },
      select: { id: true },
    }),

    prisma.parc.findMany({
      where: {
        id: { in: [...uniqueParcIds] },
        tenantId,
      },
      select: { id: true },
    }),
  ]);

  if (!typepanne) {
    return {
      error: "Le type de panne sélectionné est invalide.",
    };
  }

  if (existingParcs.length !== uniqueParcIds.size) {
    return {
      error: "Un ou plusieurs parcs sont invalides.",
    };
  }

  return { name, typepanneId, parcs };
}

export async function createPanne(
  input: PanneInput,
): Promise<{ success: boolean; message: string | undefined }> {
  const permission = await guard(ACTION.CREATE, RESOURCE.PANNE);

  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const tenantId = await getPanneTenantId();

  if (!tenantId) {
    return { success: false, message: "Aucun tenant actif." };
  }

  try {
    const validated = await validatePanneInput(input, tenantId);

    if ("error" in validated) {
      return { success: false, message: validated.error };
    }

    const duplicate = await prisma.panne.findFirst({
      where: {
        tenantId,
        name: {
          equals: validated.name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (duplicate) {
      return {
        success: false,
        message: "Cette panne existe déjà.",
      };
    }

    await prisma.panne.create({
      data: {
        name: validated.name,
        typepanneId: validated.typepanneId,
        tenantId,
        parcs: {
          create: validated.parcs.map((item) => ({
            description: item.description,
            parc: {
              connect: { id: item.parcId },
            },
          })),
        },
      },
    });

    return {
      success: true,
      message: "Panne créée avec succès.",
    };
  } catch (error) {
    console.error("createPanne error:", error);

    return {
      success: false,
      message: "Erreur lors de la création de la panne.",
    };
  }
}

export async function updatePanne(
  input: PanneInput & { id: string },
): Promise<{ success: boolean; message: string | undefined }> {
  const permission = await guard(ACTION.UPDATE, RESOURCE.PANNE);

  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const { userId } = await getSession();
  const tenantId = await getPanneTenantId();

  if (!userId) {
    return {
      success: false,
      message: "Utilisateur non authentifié.",
    };
  }

  if (!tenantId) {
    return { success: false, message: "Aucun tenant actif." };
  }

  try {
    const existing = await prisma.panne.findFirst({
      where: {
        id: input.id,
        tenantId,
      },
      select: { id: true },
    });

    if (!existing) {
      return {
        success: false,
        message: "Panne introuvable.",
      };
    }

    const validated = await validatePanneInput(input, tenantId);

    if ("error" in validated) {
      return { success: false, message: validated.error };
    }

    const duplicate = await prisma.panne.findFirst({
      where: {
        tenantId,
        name: {
          equals: validated.name,
          mode: "insensitive",
        },
        NOT: { id: input.id },
      },
      select: { id: true },
    });

    if (duplicate) {
      return {
        success: false,
        message: "Une autre panne porte déjà ce nom.",
      };
    }

    const updateResult = await prisma.$transaction(
      async (tx) => {
        // Relecture dans la transaction pour vérifier le type actuel.
        const currentPanne = await tx.panne.findFirst({
          where: {
            id: input.id,
            tenantId,
          },
          select: {
            id: true,
            typepanneId: true,
          },
        });

        if (!currentPanne) {
          return {
            success: false as const,
            message: "Panne introuvable.",
          };
        }

        // Une panne déjà utilisée dans HIM ne peut pas changer de catégorie.
        if (currentPanne.typepanneId !== validated.typepanneId) {
          const usedCount = await tx.saisiehim.count({
            where: {
              panneId: input.id,
              tenantId,
            },
          });

          if (usedCount > 0) {
            return {
              success: false as const,
              message:
                `Modification du type impossible : cette panne est utilisée dans ${usedCount} saisie(s) HIM. ` +
                "Pour préserver l'historique, conservez son type actuel.",
            };
          }
        }

        await tx.panne.update({
          where: { id: input.id },
          data: {
            name: validated.name,
            typepanneId: validated.typepanneId,
          },
        });

        await tx.panneParc.deleteMany({
          where: { panneId: input.id },
        });

        await tx.panneParc.createMany({
          data: validated.parcs.map((item) => ({
            panneId: input.id,
            parcId: item.parcId,
            description: item.description,
          })),
        });

        return {
          success: true as const,
        };
      },
      {
        isolationLevel: "Serializable",
      },
    );

    if (!updateResult.success) {
      return {
        success: false,
        message: updateResult.message,
      };
    }

    return {
      success: true,
      message: "Panne modifiée avec succès.",
    };
  } catch (error) {
    console.error("updatePanne error:", error);

    if (getPrismaErrorCode(error) === "P2034") {
      return {
        success: false,
        message:
          "Les données ont été modifiées simultanément. Veuillez réessayer.",
      };
    }

    return {
      success: false,
      message: "Erreur lors de la modification de la panne.",
    };
  }
}

export async function deletePanne(
  id: string,
): Promise<{ success: boolean; message: string }> {
  const permission = await guard(ACTION.DELETE, RESOURCE.PANNE);

  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const { userId } = await getSession();
  const tenantId = await getPanneTenantId();

  if (!userId) {
    return {
      success: false,
      message: "Utilisateur non authentifié.",
    };
  }

  if (!tenantId) {
    return { success: false, message: "Aucun tenant actif." };
  }

  try {
    const deleteResult = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.panne.findFirst({
          where: { id, tenantId },
          select: { id: true },
        });

        if (!existing) {
          return {
            status: "not-found" as const,
          };
        }

        const usedCount = await tx.saisiehim.count({
          where: {
            panneId: id,
            tenantId,
          },
        });

        if (usedCount > 0) {
          return {
            status: "used" as const,
            usedCount,
          };
        }

        await tx.panne.delete({
          where: { id },
        });

        return {
          status: "deleted" as const,
        };
      },
      {
        isolationLevel: "Serializable",
      },
    );

    if (deleteResult.status === "not-found") {
      return {
        success: false,
        message: "Panne introuvable.",
      };
    }

    if (deleteResult.status === "used") {
      return {
        success: false,
        message:
          `Suppression impossible : cette panne est utilisée dans ${deleteResult.usedCount} saisie(s) HIM. ` +
          "Son historique doit être conservé.",
      };
    }

    return {
      success: true,
      message: "Panne supprimée avec succès.",
    };
  } catch (error) {
    console.error("deletePanne error:", error);

    const code = getPrismaErrorCode(error);

    if (code === "P2034") {
      return {
        success: false,
        message:
          "Les données ont été modifiées simultanément. Veuillez réessayer.",
      };
    }

    if (code === "P2003") {
      return {
        success: false,
        message:
          "Suppression impossible : cette panne est encore référencée par des données historiques.",
      };
    }

    return {
      success: false,
      message: "Erreur lors de la suppression de la panne.",
    };
  }
}

export async function importPannes(
  data: Record<string, unknown>,
): Promise<
  | { success: boolean; data: null; message: string }[]
  | { success: boolean; data: Record<string, unknown>; message: string }[]
> {
  let importStage = "préparation des données";

  try {
    const permission = await guard(ACTION.IMPORT, RESOURCE.PANNE);

    if (!permission.success) {
      return [
        {
          success: false,
          data: null,
          message: permission.message,
        },
      ];
    }

    const { currentTenantId } = await getSession();

    if (!currentTenantId) {
      return [
        {
          success: false,
          data,
          message: "Erreur : aucun tenant actif pour l'import.",
        },
      ];
    }

    const name = convertField(data?.name, "string");
    const description = convertField(data?.description, "string");
    const typepanneName = convertField(data?.typepanneName, "string");
    const parcName = convertField(data?.parcName, "string");

    if (!name?.trim()) {
      return [
        {
          success: false,
          data,
          message: "Erreur : le champ 'name' est requis.",
        },
      ];
    }

    if (!description?.trim()) {
      return [
        {
          success: false,
          data,
          message: "Erreur : le champ 'description' est requis.",
        },
      ];
    }

    if (!typepanneName?.trim()) {
      return [
        {
          success: false,
          data,
          message: "Erreur : le champ 'typepanneName' est requis.",
        },
      ];
    }

    if (!parcName?.trim()) {
      return [
        {
          success: false,
          data,
          message: "Erreur : le champ 'parcName' est requis.",
        },
      ];
    }

    importStage = "recherche du type de panne et du parc";

    const [typepanne, parc] = await Promise.all([
      prisma.typepanne.findUnique({
        where: {
          name_tenantId: {
            name: typepanneName.trim(),
            tenantId: currentTenantId,
          },
        },
      }),

      prisma.parc.findUnique({
        where: {
          name_tenantId: {
            name: parcName.trim(),
            tenantId: currentTenantId,
          },
        },
      }),
    ]);

    if (!typepanne) {
      return [
        {
          success: false,
          data,
          message: `Type de panne "${typepanneName}" non trouvé.`,
        },
      ];
    }

    if (!parc) {
      return [
        {
          success: false,
          data,
          message: `Parc "${parcName}" non trouvé.`,
        },
      ];
    }

    importStage = "création ou mise à jour de la panne";

    const importResult = await prisma.$transaction(
      async (tx) => {
        const existingPanne = await tx.panne.findUnique({
          where: {
            name_tenantId: {
              name: name.trim(),
              tenantId: currentTenantId,
            },
          },
          select: {
            id: true,
            name: true,
            typepanneId: true,
          },
        });

        // L'import ne doit pas reclasser une panne déjà utilisée dans HIM.
        if (
          existingPanne &&
          existingPanne.typepanneId !== typepanne.id
        ) {
          const usedCount = await tx.saisiehim.count({
            where: {
              panneId: existingPanne.id,
              tenantId: currentTenantId,
            },
          });

          if (usedCount > 0) {
            return {
              blocked: true as const,
              usedCount,
            };
          }
        }

        const panne = await tx.panne.upsert({
          where: {
            name_tenantId: {
              name: name.trim(),
              tenantId: currentTenantId,
            },
          },

          update: {
            typepanneId: typepanne.id,
          },

          create: {
            name: name.trim(),
            typepanneId: typepanne.id,
            tenantId: currentTenantId,
          },
        });

        importStage = "enregistrement de la description par parc";

        await tx.panneParc.upsert({
          where: {
            panneId_parcId: {
              panneId: panne.id,
              parcId: parc.id,
            },
          },

          update: {
            description: description.trim(),
          },

          create: {
            panneId: panne.id,
            parcId: parc.id,
            description: description.trim(),
          },
        });

        return {
          blocked: false as const,
          panne,
        };
      },
      {
        isolationLevel: "Serializable",
      },
    );

    if (importResult.blocked) {
      return [
        {
          success: false,
          data,
          message:
            `Import refusé : cette panne est déjà utilisée dans ${importResult.usedCount} saisie(s) HIM. ` +
            "Son type ne peut pas être modifié afin de préserver l'historique.",
        },
      ];
    }

    return [
      {
        success: true,
        data: {
          id: importResult.panne.id,
          name: importResult.panne.name,
          parcName: parc.name,
          description: description.trim(),
        },
        message:
          `Panne ${name.trim()} importée pour le parc ${parc.name}.`,
      },
    ];
  } catch (error: unknown) {
    const detail =
      error instanceof Error ? error.message : String(error);

    console.error("Erreur lors de l'import des pannes :", {
      etape: importStage,
      data,
      error,
    });

    return [
      {
        success: false,
        data,
        message:
          process.env.NODE_ENV === "development"
            ? `Échec de l'import à l'étape « ${importStage} » : ${detail}`
            : "Une erreur interne est survenue lors de l'import des pannes. Vérifiez les données et consultez les journaux serveur si le problème persiste.",
      },
    ];
  }
}