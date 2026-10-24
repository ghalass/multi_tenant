"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { convertField } from "@/lib/convertField";

export async function importPannes(data: any) {
  try {
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