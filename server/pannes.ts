"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { convertField } from "@/lib/convertField";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";

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

async function getPanneTenantId() {
  const { currentTenantId } = await getSession();

  if (!currentTenantId) return null;

  const tenant = await prisma.tenant.findFirst({
    where: { id: currentTenantId, active: true },
    select: { id: true },
  });

  return tenant?.id ?? null;
}

export async function getPanneOptions() {
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
) {
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

  const currentPage = Math.max(Number(filters.currentPage) || 1, 1);

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

  const where: any = { tenantId };

  if (name) {
    where.name = {
      contains: name,
      mode: "insensitive",
    };
  }

  if (typeparcId || parcId) {
    const parcFilter: Record<string, string> = {};

    if (typeparcId) parcFilter.typeparcId = typeparcId;
    if (parcId) parcFilter.id = parcId;

    where.parcs = {
      some: {
        parc: {
          is: parcFilter,
        },
      },
    };
  }

  if (typepanneId) {
    where.typepanneId = typepanneId;
  }

  const [data, totalItems] = await Promise.all([
    prisma.panne.findMany({
      where,
      orderBy: { name: "asc" },

      skip:
        itemsPerPage === 0
          ? 0
          : (currentPage - 1) * itemsPerPage,

      take: itemsPerPage === 0 ? undefined : itemsPerPage,

      include: {
        typepanne: {
          select: { id: true, name: true },
        },
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
        tenant: {
          select: { name: true },
        },
      },
    }),

    prisma.panne.count({ where }),
  ]);

  return {
    success: true,
    message: "Pannes récupérées avec succès.",
    data,
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

async function validatePanneInput(
  input: PanneInput,
  tenantId: string,
) {
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

export async function createPanne(input: PanneInput) {
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
) {
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

    await prisma.$transaction(async (tx) => {
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
    });

    return {
      success: true,
      message: "Panne modifiée avec succès.",
    };
  } catch (error) {
    console.error("updatePanne error:", error);

    return {
      success: false,
      message: "Erreur lors de la modification de la panne.",
    };
  }
}

export async function deletePanne(id: string) {
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
    const existing = await prisma.panne.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!existing) {
      return {
        success: false,
        message: "Panne introuvable.",
      };
    }

    const used = await prisma.saisiehim.count({
      where: { panneId: id, tenantId },
    });

    if (used > 0) {
      return {
        success: false,
        message:
          "Suppression impossible : cette panne est utilisée dans des saisies HIM.",
      };
    }

    await prisma.panne.delete({ where: { id } });

    return {
      success: true,
      message: "Panne supprimée avec succès.",
    };
  } catch (error) {
    console.error("deletePanne error:", error);

    return {
      success: false,
      message: "Erreur lors de la suppression de la panne.",
    };
  }
}

export async function importPannes(data: any) {
  try {
    const permission = await guard(ACTION.IMPORT, RESOURCE.PANNE);

    if (!permission.success) {
      return [{
        success: false,
        data: null,
        message: permission.message,
      }];
    }

    const { currentTenantId } = await getSession();

    if (!currentTenantId) {
      return [{
        success: false,
        data,
        message: "Erreur : aucun tenant actif pour l'import.",
      }];
    }

    const name = convertField(data?.name, "string");
    const description = convertField(data?.description, "string");
    const typepanneName = convertField(data?.typepanneName, "string");
    const parcName = convertField(data?.parcName, "string");

    if (!name?.trim()) {
      return [{
        success: false,
        data,
        message: "Erreur : le champ 'name' est requis.",
      }];
    }

    if (!description?.trim()) {
      return [{
        success: false,
        data,
        message: "Erreur : le champ 'description' est requis.",
      }];
    }

    if (!typepanneName?.trim()) {
      return [{
        success: false,
        data,
        message: "Erreur : le champ 'typepanneName' est requis.",
      }];
    }

    if (!parcName?.trim()) {
      return [{
        success: false,
        data,
        message: "Erreur : le champ 'parcName' est requis.",
      }];
    }

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
      return [{
        success: false,
        data,
        message: `Type de panne "${typepanneName}" non trouvé.`,
      }];
    }

    if (!parc) {
      return [{
        success: false,
        data,
        message: `Parc "${parcName}" non trouvé.`,
      }];
    }

    const panne = await prisma.panne.upsert({
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

    await prisma.panneParc.upsert({
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

    return [{
      success: true,
      data: {
        id: panne.id,
        name: panne.name,
        parcName: parc.name,
        description: description.trim(),
      },
      message:
        `Panne ${name.trim()} importée pour le parc ${parc.name}.`,
    }];
  } catch (error: unknown) {
    console.error("Erreur lors de l'import des pannes :", error);

    return [{
      success: false,
      data,
      message:
        "Une erreur interne est survenue lors de l'import des pannes. Vérifiez les données et consultez les journaux serveur si le problème persiste.",
    }];
  }
}