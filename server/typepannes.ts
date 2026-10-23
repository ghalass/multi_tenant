"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { convertField } from "@/lib/convertField";


export async function importTypePannes(data: any) {
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
    const description = convertField(data.description, "string") ?? "";

    if (!name || name.trim() === "") {
      return [
        {
          success: false,
          data: data,
          message: `Erreur: Le champ 'name' est requis`,
        },
      ];
    }

    const newData = {
      name,
      description,
      tenantId: currentTenantId
    };

    const typepanne = await prisma.typepanne.upsert({
      where: { name_tenantId: { name, tenantId: currentTenantId } },
      update: newData,
      create: newData,
    });

    return [
      {
        success: true,
        data: typepanne,
        message: `typepanne ${name} importé avec succès`,
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