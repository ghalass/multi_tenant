
"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import type { ActionResponse } from "@/lib/types/types";
import { getSession } from "@/lib/auth";
import { PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";
import { convertField } from "@/lib/convertField";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface searchParams {
  name?: string;
  currentPage?: number;
  itemsPerPage?: number;
}

type TypeParcListItem = Prisma.TypeparcGetPayload<
  Prisma.TypeparcDefaultArgs
>;

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

async function getTenantId(): Promise<string | undefined> {
  const { currentTenantId } = await getSession();

  if (!currentTenantId) {
    return undefined;
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

  return tenant?.id;
}

export async function getAllTypeParcs(
  filters: searchParams = {},
): Promise<ActionResponse<TypeParcListItem>> {
  const permission = await guard(ACTION.READ, RESOURCE.TYPEPARC);

  if (!permission.success) {
    return {
      data: [],
      success: false,
      message: permission.message,
    };
  }

  const tenantId = await getTenantId();

  if (!tenantId) {
    return {
      data: [],
      success: false,
      message:
        "Sélectionnez un tenant actif avant de consulter les types de parcs.",
    };
  }

  const currentPage = Math.max(
    Number(filters.currentPage) || 1,
    1,
  );

  const itemsPerPage =
    Number(filters.itemsPerPage) === 0
      ? 0
      : Math.max(
        Number(filters.itemsPerPage) ||
        PAGINATION_SETTINGS.itemsPerPage,
        1,
      );

  const name = filters.name?.trim();

  const where = {
    tenantId,
    ...(name
      ? {
        name: {
          contains: name,
          mode: "insensitive" as const,
        },
      }
      : {}),
  };

  const [typeparcs, totalItems] = await Promise.all([
    prisma.typeparc.findMany({
      where,
      orderBy: {
        name: "asc",
      },
      skip:
        itemsPerPage === 0
          ? 0
          : (currentPage - 1) * itemsPerPage,
      take:
        itemsPerPage === 0
          ? undefined
          : itemsPerPage,
    }),

    prisma.typeparc.count({ where }),
  ]);

  return {
    data: typeparcs,
    success: true,
    message: "Types de parcs récupérés avec succès.",
    meta: {
      totalItems,
      totalPages:
        itemsPerPage === 0
          ? 1
          : Math.ceil(totalItems / itemsPerPage),
      currentPage,
      itemsPerPage,
    },
  };
}

export async function createTypeParc({
  name,
}: {
  name: string;
}): Promise<ActionResponse> {
  const permission = await guard(ACTION.CREATE, RESOURCE.TYPEPARC);

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

  const trimmedName = name?.trim();

  if (!trimmedName) {
    return {
      success: false,
      message: "Le nom du type de parc est obligatoire.",
    };
  }

  try {
    const duplicate = await prisma.typeparc.findFirst({
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

    if (duplicate) {
      return {
        success: false,
        message: "Ce type de parc existe déjà.",
      };
    }

    await prisma.typeparc.create({
      data: {
        name: trimmedName,
        tenantId,
      },
    });

    return {
      success: true,
      message: "Type de parc créé avec succès.",
    };
  } catch (error) {
    console.error("createTypeParc error:", error);

    if (getPrismaErrorCode(error) === "P2002") {
      return {
        success: false,
        message: "Ce type de parc existe déjà.",
      };
    }

    return {
      success: false,
      message: "Erreur lors de la création du type de parc.",
    };
  }
}

export async function updateTypeParc({
  id,
  name,
}: {
  id: string;
  name: string;
}): Promise<ActionResponse> {
  const permission = await guard(ACTION.UPDATE, RESOURCE.TYPEPARC);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
    };
  }

  const { userId } = await getSession();
  const tenantId = await getTenantId();

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
      message: "Le nom du type de parc est obligatoire.",
    };
  }

  try {
    const existing = await prisma.typeparc.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        message: "Type de parc introuvable.",
      };
    }

    const duplicate = await prisma.typeparc.findFirst({
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
        success: false,
        message:
          "Un autre type de parc porte déjà ce nom.",
      };
    }

    // Le renommage conserve le même identifiant :
    // les parcs et affectations restent rattachés à ce type.
    await prisma.typeparc.update({
      where: {
        id,
      },
      data: {
        name: trimmedName,
      },
    });

    return {
      success: true,
      message: "Type de parc modifié avec succès.",
    };
  } catch (error) {
    console.error("updateTypeParc error:", error);

    if (getPrismaErrorCode(error) === "P2002") {
      return {
        success: false,
        message:
          "Un autre type de parc porte déjà ce nom.",
      };
    }

    return {
      success: false,
      message:
        "Erreur lors de la modification du type de parc.",
    };
  }
}

export async function deleteTypeParc(
  id: string,
): Promise<ActionResponse> {
  const permission = await guard(ACTION.DELETE, RESOURCE.TYPEPARC);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
    };
  }

  const { userId } = await getSession();
  const tenantId = await getTenantId();

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
    const deleteResult = await prisma.$transaction(
      async (tx) => {
        const typeParc = await tx.typeparc.findFirst({
          where: {
            id,
            tenantId,
          },
          select: {
            id: true,
          },
        });

        if (!typeParc) {
          return {
            status: "not-found" as const,
          };
        }

        const [parcCount, affectationCount] = await Promise.all([
          tx.parc.count({
            where: {
              typeparcId: id,
              tenantId,
            },
          }),

          tx.affectationPlanMaintenance.count({
            where: {
              typeparcId: id,
              tenantId,
            },
          }),
        ]);

        if (parcCount > 0 || affectationCount > 0) {
          return {
            status: "used" as const,
            parcCount,
            affectationCount,
          };
        }

        await tx.typeparc.delete({
          where: {
            id,
          },
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
        message: "Type de parc introuvable.",
      };
    }

    if (deleteResult.status === "used") {
      return {
        success: false,
        message:
          `Suppression impossible : ce type de parc est utilisé par ` +
          `${deleteResult.parcCount} parc(s) et ` +
          `${deleteResult.affectationCount} affectation(s) de maintenance. ` +
          "Ces rattachements doivent être conservés.",
      };
    }

    return {
      success: true,
      message: "Type de parc supprimé avec succès.",
    };
  } catch (error) {
    console.error("deleteTypeParc error:", error);

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
          "Suppression impossible : ce type de parc est encore utilisé par des données existantes.",
      };
    }

    return {
      success: false,
      message:
        "Erreur lors de la suppression du type de parc.",
    };
  }
}

export async function importTypeParcs(
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
      tenantId: string;
    };
    message: string;
  }[]
> {
  try {
    const permission = await guard(
      ACTION.IMPORT,
      RESOURCE.TYPEPARC,
    );

    if (!permission.success) {
      return [
        {
          success: false,
          data: null,
          message: permission.message,
        },
      ];
    }

    const name = convertField(data?.name, "string");

    if (typeof name !== "string" || !name.trim()) {
      return [
        {
          success: false,
          data,
          message:
            "Le champ 'name' est obligatoire.",
        },
      ];
    }

    const tenantId = await getTenantId();

    if (!tenantId) {
      return [
        {
          success: false,
          data,
          message:
            "Aucun tenant actif pour l'import.",
        },
      ];
    }

    const trimmedName = name.trim();

    const importResult = await prisma.$transaction(
      async (tx) => {
        // Recherche insensible à la casse pour éviter les doublons logiques.
        const matches = await tx.typeparc.findMany({
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
          },
        });

        if (matches.length > 1) {
          return {
            status: "ambiguous" as const,
            count: matches.length,
          };
        }

        if (matches.length === 1) {
          // Mise à jour du nom sans changer l'identifiant.
          const typeParc = await tx.typeparc.update({
            where: {
              id: matches[0].id,
            },
            data: {
              name: trimmedName,
            },
            select: {
              id: true,
              name: true,
              tenantId: true,
            },
          });

          return {
            status: "saved" as const,
            typeParc,
          };
        }

        // Création uniquement lorsqu'aucun type correspondant n'existe.
        const typeParc = await tx.typeparc.create({
          data: {
            name: trimmedName,
            tenantId,
          },
          select: {
            id: true,
            name: true,
            tenantId: true,
          },
        });

        return {
          status: "saved" as const,
          typeParc,
        };
      },
      {
        isolationLevel: "Serializable",
      },
    );

    if (importResult.status === "ambiguous") {
      return [
        {
          success: false,
          data,
          message:
            `Import refusé : ${importResult.count} types de parcs ` +
            `correspondent au nom "${trimmedName}" sans distinction de casse. ` +
            "Veuillez corriger les doublons existants avant de relancer l'import.",
        },
      ];
    }

    return [
      {
        success: true,
        data: importResult.typeParc,
        message:
          `Type de parc "${importResult.typeParc.name}" importé avec succès.`,
      },
    ];
  } catch (error) {
    console.error(
      "Erreur lors de l'import des types de parcs :",
      error,
    );

    const code = getPrismaErrorCode(error);

    return [
      {
        success: false,
        data,
        message:
          code === "P2034"
            ? "Import interrompu : les données ont été modifiées simultanément. Veuillez relancer l'import."
            : code === "P2002"
              ? "Import impossible : un type de parc portant déjà ce nom existe."
              : "Erreur interne lors de l'import des types de parcs.",
      },
    ];
  }
}
