"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { convertField } from "@/lib/convertField";

export async function importSaisieHims(data: any) {
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
    const du = convertField(data.du, "date");
    const him = convertField(data.him, "number") ?? 0;
    const ni = convertField(data.ni, "number") ?? 0;
    const obs = convertField(data.obs, "string") ?? "";

    const enginName = convertField(data.enginName, "string");
    const panneName = convertField(data.panneName, "string");

    const originData = {
      du,
      enginName,
      panneName,
      him,
      ni,
      obs,
    };
    // console.log("###################################################");
    // console.log(originData);

    // VALIDATIONS
    if (!du)
      return [{ success: false, data, message: `Le champ 'du' est requis` }];
    if (!enginName?.trim())
      return [
        { success: false, data, message: `Le champ 'enginName' est requis` },
      ];
    if (!panneName?.trim())
      return [
        { success: false, data, message: `Le champ 'panneName' est requis` },
      ];
    if (him < 0 || him > 24)
      return [
        {
          success: false,
          data,
          message: `Le champ 'him' doit être entre 0 et 24`,
        },
      ];
    if (ni < 0)
      return [
        {
          success: false,
          data,
          message: `Le champ 'ni' ne doit pas être négatif`,
        },
      ];

    // FETCH ENGINS & PANNE
    const engin = await prisma.engin.findUnique({
      where: { name_tenantId: { name: enginName, tenantId: currentTenantId } },
      include: { parc: true },
    });
    if (!engin) {
      return [
        { success: false, data, message: `Engin "${enginName}" non trouvé` },
      ];
    }
    const panne = await prisma.panne.findFirst({
      where: {
        name: panneName,
        parcs: {
          some: { name: engin.parc.name },
        },
      },
    });
    if (!panne) {
      return [
        {
          success: false,
          data,
          message: `La panne "${panneName}" pour "${engin.parc.name}" non trouvé`,
        },
      ];
    }
    let saisiehrm = await prisma.saisiehrm.findFirst({
      where: { du: du, enginId: engin.id },
    });
    if (!saisiehrm) {
      return [
        {
          success: false,
          data,
          message: `La saisiehrm 'saisiehrm' non trouvé`,
        },
      ];
    }

    const upsertData = {
      him,
      ni,
      obs,
      tenant: { connect: { id: currentTenantId } },
      panne: { connect: { id: panne.id } },
      saisiehrm: { connect: { id: saisiehrm.id } },
      engin: { connect: { id: engin.id } },
    };

    const saisie = await prisma.saisiehim.upsert({
      where: {
        panneId_saisiehrmId_tenantId: {
          panneId: panne.id,
          saisiehrmId: saisiehrm.id,
          tenantId: currentTenantId
        },
      },
      update: upsertData, // Même structure
      create: upsertData, // Même structure
    });

    return [
      {
        success: true,
        // data: saisie,
        message: `SaisieHim importé avec succès`,
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