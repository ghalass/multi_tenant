"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { convertField } from "@/lib/convertField";
import { dateFormater } from "@/lib/utils";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";

export async function importSaisieHrm(data: any) {
  try {
    const permission = await guard(ACTION.IMPORT, RESOURCE.SAISIE_HRM);

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
    const du = convertField(data.du, "date");
    const hrm = convertField(data.hrm, "number") ?? 0;
    const compteur = convertField(data.compteur, "number") ?? 0;

    // Relations
    const enginName = convertField(data.enginName, "string");
    const siteName = convertField(data.siteName, "string");

    if (!du) {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'du' est requis`,
        },
      ];
    }
    if (!enginName || enginName.trim() === "") {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'enginName' est requis`,
        },
      ];
    }
    if (!siteName || siteName.trim() === "") {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'siteName' est requis`,
        },
      ];
    }
    if (hrm === null) {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'hrm' est requis`,
        },
      ];
    }
    if (hrm > 24) {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'hrm' ne doit pas dépasser 24`,
        },
      ];
    }
    if (hrm < 0) {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'hrm' ne doit pas être positif`,
        },
      ];
    }

    if (compteur < 0) {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'compteur' ne doit pas être positif`,
        },
      ];
    }

    const [engin, site] = await Promise.all([
      prisma.engin.findUnique({ where: { name_tenantId: { name: enginName, tenantId: currentTenantId } } }),
      prisma.site.findUnique({ where: { name_tenantId: { name: siteName, tenantId: currentTenantId } } }),
    ]);

    if (!engin) {
      return [
        {
          success: false,
          data: data,
          message: `Engin "${enginName}" non trouvé`,
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

    const saisie = await prisma.saisiehrm.upsert({
      where: {
        du_enginId_tenantId: {
          // Utilisez le nom de la contrainte unique composée
          du: du,
          enginId: engin.id,
          tenantId: currentTenantId
        },
      },
      update: {
        du: du,
        enginId: engin.id,
        siteId: site.id,
        hrm,
        compteur,
      },
      create: {
        du: du,
        enginId: engin.id,
        siteId: site.id,
        hrm,
        compteur,
        tenantId: currentTenantId
      },
    });
    return [
      {
        success: true,
        data: saisie,
        message: `Saisie HRM ${enginName} du ${dateFormater(du)} importé avec succès`,
      },
    ];
  } catch (error: unknown) {
    console.error("Erreur lors de l'import de la saisie HRM :", error);

    return [
      {
        success: false,
        data: data,
        message:
          "Une erreur interne est survenue lors de l'import de la saisie HRM. Vérifiez les données et consultez les journaux serveur si le problème persiste.",
      },
    ];
  }
}