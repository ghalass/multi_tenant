"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { ActionResponse } from "@/lib/types/types";
import { getSession } from "@/lib/auth";
import {
  ACTIVE,
  PAGINATION_SETTINGS,
  RESOURCE,
} from "@/lib/constantes";
import { convertField } from "@/lib/convertField";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  MaintenanceSyncError,
  synchroniserSuivisMaintenancePourEngin,
} from "@/lib/maintenance-preventive-sync";

export interface EnginsSearchParams {
  name?: string;
  active?: string;
  siteId?: string;
  typeparcId?: string;
  parcId?: string;
  currentPage?: number | string;
  itemsPerPage?: number | string;
}

export type EnginListItem = Prisma.EnginGetPayload<{
  include: {
    parc: { select: { id: true; name: true } };
    site: { select: { id: true; name: true } };
    tenant: { select: { id: true; name: true } };
  };
}>;

async function getEnginTenantId(): Promise<string | null> {
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

export async function getAllEngins(
  filters: EnginsSearchParams = {},
): Promise<ActionResponse<EnginListItem>> {
  const permission = await guard(ACTION.READ, RESOURCE.ENGIN);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
      data: [],
    };
  }

  const tenantId = await getEnginTenantId();

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

  const isUnpaged = requestedItems === 0;

  const itemsPerPage = isUnpaged
    ? 0
    : Math.max(
      requestedItems || PAGINATION_SETTINGS.itemsPerPage,
      1,
    );

  const where: Prisma.EnginWhereInput = { tenantId };

  const name = filters.name?.trim();

  if (name) {
    where.name = {
      contains: name,
      mode: "insensitive",
    };
  }

  if (filters.active === ACTIVE.YES) {
    where.active = true;
  }

  if (filters.active === ACTIVE.NO) {
    where.active = false;
  }

  if (filters.siteId) {
    where.siteId = filters.siteId;
  }

  if (filters.typeparcId) {
    where.parc = {
      typeparcId: filters.typeparcId,
    };
  }

  if (filters.parcId) {
    where.parcId = filters.parcId;
  }

  const [engins, totalItems] = await Promise.all([
    prisma.engin.findMany({
      where,
      orderBy: {
        name: "asc",
      },
      skip: isUnpaged
        ? 0
        : (currentPage - 1) * itemsPerPage,
      take: isUnpaged ? undefined : itemsPerPage,
      include: {
        parc: {
          select: {
            id: true,
            name: true,
          },
        },
        site: {
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

    prisma.engin.count({ where }),
  ]);

  return {
    success: true,
    message: "Données récupérées avec succès.",
    data: engins,
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

export async function getEnginOptions(): Promise<{ success: boolean; message: string; data: { sites: { id: string; name: string; }[]; typeparcs: { id: string; name: string; }[]; parcs: { id: string; name: string; typeparcId: string; }[]; }; }> {
  const permission = await guard(ACTION.READ, RESOURCE.ENGIN);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
      data: {
        sites: [],
        typeparcs: [],
        parcs: [],
      },
    };
  }

  const tenantId = await getEnginTenantId();

  if (!tenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
      data: {
        sites: [],
        typeparcs: [],
        parcs: [],
      },
    };
  }

  const [sites, typeparcs, parcs] = await Promise.all([
    prisma.site.findMany({
      where: {
        tenantId,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.typeparc.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.parc.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        typeparcId: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return {
    success: true,
    message: "",
    data: {
      sites,
      typeparcs,
      parcs,
    },
  };
}

type EnginInput = {
  name: string;
  active: boolean;
  parcId: string;
  siteId: string;
};

async function validateEnginRelations(
  tenantId: string,
  parcId: string,
  siteId: string,
): Promise<boolean> {
  const [parc, site] = await Promise.all([
    prisma.parc.findFirst({
      where: {
        id: parcId,
        tenantId,
      },
      select: {
        id: true,
      },
    }),

    prisma.site.findFirst({
      where: {
        id: siteId,
        tenantId,
        active: true,
      },
      select: {
        id: true,
      },
    }),
  ]);

  return Boolean(parc && site);
}

export async function createEngin(
  values: EnginInput,
): Promise<ActionResponse> {
  const permission = await guard(ACTION.CREATE, RESOURCE.ENGIN);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
    };
  }

  const tenantId = await getEnginTenantId();

  if (!tenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
    };
  }

  const name = values.name?.trim();

  if (
    !name ||
    !values.parcId ||
    !values.siteId
  ) {
    return {
      success: false,
      message: "Vérifiez les champs obligatoires.",
    };
  }

  try {
    if (
      !(await validateEnginRelations(
        tenantId,
        values.parcId,
        values.siteId,
      ))
    ) {
      return {
        success: false,
        message: "Le parc ou le site sélectionné est invalide.",
      };
    }

    const duplicate = await prisma.engin.findFirst({
      where: {
        tenantId,
        name: {
          equals: name,
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
        message: "Cet engin existe déjà.",
      };
    }

    await prisma.$transaction(
      async (tx) => {
        const engin = await tx.engin.create({
          data: {
            name,
            active: values.active,
            parcId: values.parcId,
            siteId: values.siteId,
            tenantId,
          },
        });

        await synchroniserSuivisMaintenancePourEngin(
          tx,
          tenantId,
          engin.id,
        );
      },
      {
        isolationLevel: "Serializable",
      },
    );

    return {
      success: true,
      message: "Engin créé avec succès.",
    };
  } catch (error) {
    if (error instanceof MaintenanceSyncError) {
      return {
        success: false,
        message: error.message,
      };
    }

    console.error("createEngin error:", error);

    return {
      success: false,
      message: "Erreur lors de la création de l'engin.",
    };
  }
}

export async function updateEngin(
  values: EnginInput & { id: string },
): Promise<ActionResponse> {
  const permission = await guard(ACTION.UPDATE, RESOURCE.ENGIN);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
    };
  }

  const tenantId = await getEnginTenantId();

  if (!tenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
    };
  }

  const name = values.name?.trim();

  if (
    !values.id ||
    !name ||
    !values.parcId ||
    !values.siteId
  ) {
    return {
      success: false,
      message: "Vérifiez les champs saisis.",
    };
  }

  try {
    const existing = await prisma.engin.findFirst({
      where: {
        id: values.id,
        tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        message: "Engin introuvable.",
      };
    }

    if (
      !(await validateEnginRelations(
        tenantId,
        values.parcId,
        values.siteId,
      ))
    ) {
      return {
        success: false,
        message: "Le parc ou le site sélectionné est invalide.",
      };
    }

    const duplicate = await prisma.engin.findFirst({
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
        message: "Un autre engin porte déjà ce nom.",
      };
    }

    await prisma.$transaction(
      async (tx) => {
        const engin = await tx.engin.update({
          where: {
            id: values.id,
          },
          data: {
            name,
            active: values.active,
            parcId: values.parcId,
            siteId: values.siteId,
          },
        });

        await synchroniserSuivisMaintenancePourEngin(
          tx,
          tenantId,
          engin.id,
        );
      },
      {
        isolationLevel: "Serializable",
      },
    );

    return {
      success: true,
      message: "Engin modifié avec succès.",
    };
  } catch (error) {
    console.error("updateEngin error:", error);

    return {
      success: false,
      message: "Erreur lors de la modification de l'engin.",
    };
  }
}

export async function deleteEngin(
  id: string,
): Promise<ActionResponse> {
  const permission = await guard(ACTION.DELETE, RESOURCE.ENGIN);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
    };
  }

  const tenantId = await getEnginTenantId();

  if (!tenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
    };
  }

  try {
    const engin = await prisma.engin.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!engin) {
      return {
        success: false,
        message: "Engin introuvable.",
      };
    }

    await prisma.engin.delete({
      where: { id },
    });

    return {
      success: true,
      message: "Engin supprimé avec succès.",
    };
  } catch (error) {
    console.error("deleteEngin error:", error);

    return {
      success: false,
      message:
        "Suppression impossible : cet engin est peut-être lié à des saisies HRM.",
    };
  }
}

export async function importEngins(data: Record<string, unknown>): Promise<{ success: boolean; data: null; message: string; }[] | { success: boolean; data: Record<string, unknown>; message: string; }[] | { success: boolean; data: { id: string; name: string; active: boolean; parcId: string; siteId: string; tenantId: string; }; message: string; }[]> {
  try {
    const permission = await guard(ACTION.IMPORT, RESOURCE.ENGIN);

    if (!permission.success) {
      return [{
        success: false,
        data: null,
        message: permission.message,
      }];
    }

    const name = convertField(data.name, "string");
    const active = convertField(data.active, "boolean") ?? true;
    const parcName = convertField(data.parcName, "string");
    const siteName = convertField(data.siteName, "string");

    if (!name || name.trim() === "") {
      return [{
        success: false,
        data,
        message: "Erreur : le champ 'name' est requis.",
      }];
    }

    if (!parcName) {
      return [{
        success: false,
        data,
        message: "Erreur : le champ 'parcName' est requis.",
      }];
    }

    if (!siteName) {
      return [{
        success: false,
        data,
        message: "Erreur : le champ 'siteName' est requis.",
      }];
    }

    const { currentTenantId } = await getSession();

    if (!currentTenantId) {
      return [{
        success: false,
        data,
        message: "Aucun tenant actif pour l'import des engins.",
      }];
    }

    const [parc, site] = await Promise.all([
      prisma.parc.findUnique({
        where: {
          name_tenantId: {
            name: parcName,
            tenantId: currentTenantId,
          },
        },
      }),

      prisma.site.findUnique({
        where: {
          name_tenantId: {
            name: siteName,
            tenantId: currentTenantId,
          },
        },
      }),
    ]);

    if (!parc) {
      return [{
        success: false,
        data,
        message: `Parc "${parcName}" non trouvé.`,
      }];
    }

    if (!site) {
      return [{
        success: false,
        data,
        message: `Site "${siteName}" non trouvé.`,
      }];
    }

    const engin = await prisma.$transaction(
      async (tx) => {
        const result = await tx.engin.upsert({
          where: {
            name_tenantId: {
              name,
              tenantId: currentTenantId,
            },
          },

          update: {
            name,
            active,
            parcId: parc.id,
            siteId: site.id,
          },

          create: {
            name,
            active,
            parcId: parc.id,
            siteId: site.id,
            tenantId: currentTenantId,
          },
        });

        await synchroniserSuivisMaintenancePourEngin(
          tx,
          currentTenantId,
          result.id,
        );

        return result;
      },
      {
        isolationLevel: "Serializable",
      },
    );

    return [{
      success: true,
      data: engin,
      message: `Engin ${name} importé avec succès.`,
    }];
  } catch (error: unknown) {
    if (error instanceof MaintenanceSyncError) {
      return [{
        success: false,
        data,
        message: error.message,
      }];
    }

    console.error("Erreur lors de l'import des engins :", error);

    return [{
      success: false,
      data,
      message:
        "Une erreur interne est survenue lors de l'import des engins. Vérifiez les données et consultez les journaux serveur si le problème persiste.",
    }];
  }
}