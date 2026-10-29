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

type PanneInput = {
  name: string;
  description?: string | null;
  typepanneId: string;
  parcIds: string[];
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

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
      data: {
        typepannes: [],
        typeparcs: [],
        parcs: [],
      },
    };
  }

  const tenantId = await getPanneTenantId();

  if (!tenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
      data: {
        typepannes: [],
        typeparcs: [],
        parcs: [],
      },
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

  const currentPage = Math.max(
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

  const where: any = { tenantId };

  if (name) {
    where.name = {
      contains: name,
      mode: "insensitive",
    };
  }

  if (typeparcId || parcId) {
    const parcFilter: {
      id?: string;
      typeparcId?: string;
    } = {};

    if (typeparcId) {
      parcFilter.typeparcId = typeparcId;
    }

    if (parcId) {
      parcFilter.id = parcId;
    }

    where.parcs = {
      some: parcFilter,
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

      take:
        itemsPerPage === 0
          ? undefined
          : itemsPerPage,

      include: {
        typepanne: {
          select: { id: true, name: true },
        },
        parcs: {
          select: { id: true, name: true },
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

async function validatePanneInput(input: PanneInput, tenantId: string) {
  const name = input.name?.trim();
  const typepanneId = input.typepanneId;
  const parcIds = [...new Set(input.parcIds ?? [])];

  if (!name) return { error: "Le nom de la panne est obligatoire." };
  if (!typepanneId) return { error: "Sélectionnez un type de panne." };
  if (parcIds.length === 0) return { error: "Sélectionnez au moins un parc." };

  const [typepanne, parcs] = await Promise.all([
    prisma.typepanne.findFirst({
      where: { id: typepanneId, tenantId },
      select: { id: true },
    }),
    prisma.parc.findMany({
      where: { id: { in: parcIds }, tenantId },
      select: { id: true },
    }),
  ]);

  if (!typepanne) {
    return { error: "Le type de panne sélectionné est invalide." };
  }

  if (parcs.length !== parcIds.length) {
    return { error: "Un ou plusieurs parcs sont invalides." };
  }

  return { name, typepanneId, parcIds };
}

export async function createPanne(input: PanneInput) {
  const permission = await guard(ACTION.CREATE, RESOURCE.PANNE);
  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const tenantId = await getPanneTenantId();
  if (!tenantId) return { success: false, message: "Aucun tenant actif." };

  try {
    const validated = await validatePanneInput(input, tenantId);
    if ("error" in validated) {
      return { success: false, message: validated.error };
    }

    const duplicate = await prisma.panne.findFirst({
      where: {
        tenantId,
        name: { equals: validated.name, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (duplicate) {
      return { success: false, message: "Cette panne existe déjà." };
    }

    await prisma.panne.create({
      data: {
        name: validated.name,
        description: input.description?.trim() || null,
        typepanneId: validated.typepanneId,
        tenantId,
        parcs: { connect: validated.parcIds.map((id) => ({ id })) },
      },
    });

    return { success: true, message: "Panne créée avec succès." };
  } catch (error) {
    console.error("createPanne error:", error);
    return { success: false, message: "Erreur lors de la création de la panne." };
  }
}

export async function updatePanne(input: PanneInput & { id: string }) {
  const permission = await guard(ACTION.UPDATE, RESOURCE.PANNE);
  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const { userId } = await getSession();
  const tenantId = await getPanneTenantId();

  if (!userId) return { success: false, message: "Utilisateur non authentifié." };
  if (!tenantId) return { success: false, message: "Aucun tenant actif." };

  try {
    const existing = await prisma.panne.findFirst({
      where: { id: input.id, tenantId },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, message: "Panne introuvable." };
    }

    const validated = await validatePanneInput(input, tenantId);
    if ("error" in validated) {
      return { success: false, message: validated.error };
    }

    const duplicate = await prisma.panne.findFirst({
      where: {
        tenantId,
        name: { equals: validated.name, mode: "insensitive" },
        NOT: { id: input.id },
      },
      select: { id: true },
    });

    if (duplicate) {
      return { success: false, message: "Une autre panne porte déjà ce nom." };
    }

    await prisma.panne.update({
      where: { id: input.id },
      data: {
        name: validated.name,
        description: input.description?.trim() || null,
        typepanneId: validated.typepanneId,
        parcs: { set: validated.parcIds.map((id) => ({ id })) },
      },
    });

    return { success: true, message: "Panne modifiée avec succès." };
  } catch (error) {
    console.error("updatePanne error:", error);
    return { success: false, message: "Erreur lors de la modification de la panne." };
  }
}

export async function deletePanne(id: string) {
  const permission = await guard(ACTION.DELETE, RESOURCE.PANNE);
  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const { userId } = await getSession();
  const tenantId = await getPanneTenantId();

  if (!userId) return { success: false, message: "Utilisateur non authentifié." };
  if (!tenantId) return { success: false, message: "Aucun tenant actif." };

  try {
    const existing = await prisma.panne.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, message: "Panne introuvable." };
    }

    const used = await prisma.saisiehim.count({
      where: { panneId: id, tenantId },
    });

    if (used > 0) {
      return {
        success: false,
        message: "Suppression impossible : cette panne est utilisée dans des saisies HIM.",
      };
    }

    await prisma.panne.delete({ where: { id } });
    return { success: true, message: "Panne supprimée avec succès." };
  } catch (error) {
    console.error("deletePanne error:", error);
    return { success: false, message: "Erreur lors de la suppression de la panne." };
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
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Aucun tenant actif pour l'import`,
        },
      ];
    }
    // 
    const name = convertField(data.name, "string");
    const description = convertField(data.description, "string");
    const typepanneName = convertField(data.typepanneName, "string");
    const parcName = convertField(data.parcName, "string");

    if (!name || name.trim() === "") {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'name' est requis`,
        },
      ];
    }
    if (!description || description.trim() === "") {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'description' est requis`,
        },
      ];
    }
    if (!typepanneName) {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'typepanneName' est requis`,
        },
      ];
    }
    if (!parcName) {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'parcName' est requis`,
        },
      ];
    }

    const [typepanne, parc] = await Promise.all([
      prisma.typepanne.findUnique({ where: { name_tenantId: { name: typepanneName, tenantId: currentTenantId } } }),
      prisma.parc.findUnique({ where: { name_tenantId: { name: parcName, tenantId: currentTenantId } } }),
    ]);

    if (!typepanne) {
      return [
        {
          success: false,
          data: data,
          message: `typepanne "${typepanneName}" non trouvé`,
        },
      ];
    }

    if (!parc) {
      return [
        {
          success: false,
          data: data,
          message: `parc "${parcName}" non trouvé`,
        },
      ];
    }

    // Créer ou mettre à jour la panne avec relation implicite
    const panne = await prisma.panne.upsert({
      where: { name_tenantId: { name: name, tenantId: currentTenantId } },
      update: {
        description: description,
        typepanneId: typepanne.id,
        // Mettre à jour la relation avec le parc
        parcs: {
          connect: { id: parc.id },
        },
      },
      create: {
        name: name,
        description: description,
        typepanneId: typepanne.id,
        tenantId: currentTenantId,
        // Créer avec relation au parc
        parcs: {
          connect: { id: parc.id },
        },
      },
      // Inclure les relations pour voir le résultat
      include: {
        typepanne: true,
        parcs: true,
      },
    });

    return [
      {
        success: true,
        data: panne,
        message: `Panne ${name}, ${parcName}, ${typepanneName} importé avec succès`,
      },
    ];
  } catch (error: unknown) {
    console.error("Erreur lors de l'import des pannes :", error);

    return [
      {
        success: false,
        data: data,
        message:
          "Une erreur interne est survenue lors de l'import des pannes. Vérifiez les données et consultez les journaux serveur si le problème persiste.",
      },
    ];
  }
}