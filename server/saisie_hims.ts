"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { convertField } from "@/lib/convertField";
import { dateFormater } from "@/lib/utils";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";

function hasValue(value: unknown): boolean {
  return (
    value !== null &&
    value !== undefined &&
    !(typeof value === "string" && value.trim() === "")
  );
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = value.trim().replace(",", ".");

  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
    return null;
  }

  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

export async function importSaisieHims(data: any) {
  try {
    const permission = await guard(
      ACTION.IMPORT,
      RESOURCE.SAISIE_HIM
    );

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
        message: "Aucun tenant actif pour l'import.",
      }];
    }

    const du = convertField(data?.du, "date") as Date | null;

    const rawHim = data?.him;
    const him = parseNumber(rawHim);

    const rawNi = data?.ni;
    const ni = parseNumber(rawNi);

    const obs = convertField(data?.obs, "string") ?? "";
    const enginName = convertField(data?.enginName, "string");
    const panneName = convertField(data?.panneName, "string");

    if (!du) {
      return [{
        success: false,
        data,
        message: "Le champ 'du' est obligatoire ou invalide.",
      }];
    }

    if (typeof enginName !== "string" || !enginName.trim()) {
      return [{
        success: false,
        data,
        message: "Le champ 'enginName' est obligatoire.",
      }];
    }

    if (typeof panneName !== "string" || !panneName.trim()) {
      return [{
        success: false,
        data,
        message: "Le champ 'panneName' est obligatoire.",
      }];
    }

    if (!hasValue(rawHim)) {
      return [{
        success: false,
        data,
        message: "Le champ 'him' est obligatoire.",
      }];
    }

    if (him === null) {
      return [{
        success: false,
        data,
        message: "Le champ 'him' doit être un nombre valide.",
      }];
    }

    if (him < 0 || him > 24) {
      return [{
        success: false,
        data,
        message: "Le champ 'him' doit être compris entre 0 et 24.",
      }];
    }

    if (!hasValue(rawNi)) {
      return [{
        success: false,
        data,
        message: "Le champ 'ni' est obligatoire.",
      }];
    }

    if (ni === null || !Number.isInteger(ni)) {
      return [{
        success: false,
        data,
        message: "Le champ 'ni' doit être un nombre entier valide.",
      }];
    }

    if (ni < 0) {
      return [{
        success: false,
        data,
        message: "Le champ 'ni' ne doit pas être négatif.",
      }];
    }

    const engin = await prisma.engin.findUnique({
      where: {
        name_tenantId: {
          name: enginName,
          tenantId: currentTenantId,
        },
      },
      include: {
        parc: true,
      },
    });

    if (!engin) {
      return [{
        success: false,
        data,
        message: `Engin "${enginName}" non trouvé.`,
      }];
    }

    const panne = await prisma.panne.findFirst({
      where: {
        name: panneName,
        tenantId: currentTenantId,
        parcs: {
          some: {
            id: engin.parcId,
            tenantId: currentTenantId,
          },
        },
      },
    });

    if (!panne) {
      return [{
        success: false,
        data,
        message: `Panne "${panneName}" non trouvée pour le parc "${engin.parc.name}".`,
      }];
    }

    const saisiehrm = await prisma.saisiehrm.findFirst({
      where: {
        du,
        enginId: engin.id,
        tenantId: currentTenantId,
      },
    });

    if (!saisiehrm) {
      return [{
        success: false,
        data,
        message: `Saisie HRM de l'engin "${enginName}" du ${dateFormater(du)} introuvable.`,
      }];
    }

    // Saisiehim est reliée à la panne et à la saisie HRM,
    // mais ne possède pas de relation directe avec Engin.
    const saisie = await prisma.saisiehim.upsert({
      where: {
        panneId_saisiehrmId_tenantId: {
          panneId: panne.id,
          saisiehrmId: saisiehrm.id,
          tenantId: currentTenantId,
        },
      },
      update: {
        him,
        ni,
        obs,
      },
      create: {
        him,
        ni,
        obs,
        tenant: {
          connect: { id: currentTenantId },
        },
        panne: {
          connect: { id: panne.id },
        },
        saisiehrm: {
          connect: { id: saisiehrm.id },
        },
      },
    });

    return [{
      success: true,
      data: saisie,
      message: `Saisie HIM ${enginName} du ${dateFormater(du)} importée avec succès.`,
    }];
  } catch (error: unknown) {
    console.error("Erreur lors de l'import HIM :", error);

    return [{
      success: false,
      data,
      message: "Échec de l'import HIM. Vérifiez les données et les journaux serveur.",
    }];
  }
}