"use server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { ActionResponse } from "@/lib/types"; import { getSession } from "@/lib/auth";
import { ACTIVE, PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";
import { convertField } from "@/lib/convertField";

export interface searchParams {
  name?: string;
  active?: string;
  currentPage?: number;
  itemsPerPage?: number;
}

export async function importEngins(data: any) {
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
    const initialHeureChassis =
      convertField(data.initialHeureChassis, "number") ?? 0;
    const parcName = convertField(data.parcName, "string");
    const siteName = convertField(data.siteName, "string");

    if (!name || name.trim() === "") {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'name' est requis`,
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
    if (!siteName) {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'siteName' est requis`,
        },
      ];
    }

    const { currentTenantId } = await getSession();

    if (!currentTenantId) {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Aucun tenant actif pour l'import du typeparc`,
        },
      ];
    }

    const [parc, site] = await Promise.all([
      prisma.parc.findUnique({ where: { name_tenantId: { name: parcName, tenantId: currentTenantId } } }),
      prisma.site.findUnique({ where: { name_tenantId: { name: siteName, tenantId: currentTenantId } } }),
    ]);

    if (!parc) {
      return [
        {
          success: false,
          data: data,
          message: `Parc "${parcName}" non trouvé`,
        },
      ];
    }
    if (!site) {
      return [
        {
          success: false,
          data: data,
          message: `Site "${siteName}" non trouvé`,
        },
      ];
    }

    const engin = await prisma.engin.upsert({
      where: { name_tenantId: { name, tenantId: currentTenantId } },
      update: {
        name: name,
        active: active,
        parcId: parc.id,
        siteId: site.id,
        initialHeureChassis: initialHeureChassis,
      },
      create: {
        name: name,
        active: active,
        parcId: parc.id,
        siteId: site.id,
        initialHeureChassis: initialHeureChassis,
        tenantId: currentTenantId
      },
    });

    return [
      {
        success: true,
        data: engin,
        message: `Engin ${name} importé avec succès`,
      },
    ];
  } catch (error: any) {
    return [
      {
        success: false,
        data: data,
        message: `Erreur: ${error.message}`,
      },
    ];
  }
}