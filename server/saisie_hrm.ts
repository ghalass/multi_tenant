"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { convertField } from "@/lib/convertField";
import { dateFormater } from "@/lib/utils";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";

export interface SaisieHrmSearchParams {
  name?: string;
  dateDu?: string;
  dateAu?: string;

  // Filtres en cascade
  typeparcId?: string;
  parcId?: string;
  enginId?: string;

  // Déclenchement explicite de la recherche
  search?: string;

  // Date utilisée sur la page de saisie journalière
  du?: string;

  currentPage?: number | string;
  itemsPerPage?: number | string;
}

type SaisieHrmInput = {
  du: string;
  enginId: string;
  siteId: string;
  hrm: number;
  compteur: number | null;
};

async function getSaisieHrmTenantId() {
  const { currentTenantId } = await getSession();

  if (!currentTenantId) return null;

  const tenant = await prisma.tenant.findFirst({
    where: { id: currentTenantId, active: true },
    select: { id: true },
  });

  return tenant?.id ?? null;
}

function parseSaisieHrmDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

export async function getSaisieHrmOptions() {
  const permission = await guard(ACTION.READ, RESOURCE.SAISIE_HRM);

  const emptyData = {
    typeparcs: [],
    parcs: [],
    engins: [],
    sites: [],
  };

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
      data: emptyData,
    };
  }

  const tenantId = await getSaisieHrmTenantId();

  if (!tenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
      data: emptyData,
    };
  }

  const [typeparcs, parcs, engins, sites] = await Promise.all([
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

    prisma.engin.findMany({
      where: {
        tenantId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        parcId: true,
        siteId: true,
      },
      orderBy: { name: "asc" },
    }),

    prisma.site.findMany({
      where: {
        tenantId,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    success: true,
    message: "",
    data: {
      typeparcs,
      parcs,
      engins,
      sites,
    },
  };
}

export async function getAllSaisieHrm(
  filters: SaisieHrmSearchParams = {},
) {
  const permission = await guard(ACTION.READ, RESOURCE.SAISIE_HRM);

  if (!permission.success) {
    return {
      success: false,
      message: permission.message,
      data: [],
    };
  }

  const tenantId = await getSaisieHrmTenantId();

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
  const isUnpaged = requestedItems === 0;
  const itemsPerPage = isUnpaged
    ? 0
    : Math.max(
      requestedItems || PAGINATION_SETTINGS.itemsPerPage,
      1,
    );

  const name = filters.name?.trim();
  const typeparcId = filters.typeparcId?.trim();
  const parcId = filters.parcId?.trim();
  const enginId = filters.enginId?.trim();

  const dateDu = filters.dateDu
    ? parseSaisieHrmDate(filters.dateDu)
    : null;

  const dateAu = filters.dateAu
    ? parseSaisieHrmDate(filters.dateAu)
    : null;

  // Construire les filtres de l'engin sans imposer
  // de sélectionner obligatoirement un type de parc.
  const enginWhere: any = {};

  if (name) {
    enginWhere.name = {
      contains: name,
      mode: "insensitive",
    };
  }

  if (enginId) {
    enginWhere.id = enginId;
  }

  if (parcId) {
    enginWhere.parcId = parcId;
  }

  if (typeparcId) {
    enginWhere.parc = {
      typeparcId,
    };
  }

  const where: any = {
    tenantId,

    ...(Object.keys(enginWhere).length > 0
      ? { engin: enginWhere }
      : {}),

    ...(dateDu || dateAu
      ? {
        du: {
          ...(dateDu ? { gte: dateDu } : {}),
          ...(dateAu ? { lte: dateAu } : {}),
        },
      }
      : {}),
  };

  const [data, totalItems] = await Promise.all([
    prisma.saisiehrm.findMany({
      where,
      orderBy: [{ du: "desc" }, { engin: { name: "asc" } }],
      skip: isUnpaged ? 0 : (currentPage - 1) * itemsPerPage,
      take: isUnpaged ? undefined : itemsPerPage,
      include: {
        engin: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
        tenant: { select: { name: true } },
      },
    }),
    prisma.saisiehrm.count({ where }),
  ]);

  return {
    success: true,
    message: "Saisies HRM récupérées avec succès.",
    data,
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

async function validateSaisieHrmInput(
  values: SaisieHrmInput,
  tenantId: string,
) {
  const du = parseSaisieHrmDate(values.du);
  const hrm = Number(values.hrm);
  const compteur =
    values.compteur === null || values.compteur === undefined
      ? null
      : Number(values.compteur);

  if (!du) {
    return { error: "La date de saisie est invalide." };
  }

  if (!values.enginId || !values.siteId) {
    return { error: "L'engin et le site sont obligatoires." };
  }

  if (!Number.isFinite(hrm) || hrm < 0 || hrm > 24) {
    return { error: "La HRM doit être comprise entre 0 et 24." };
  }

  if (
    compteur !== null &&
    (!Number.isFinite(compteur) || compteur < 0)
  ) {
    return { error: "Le compteur doit être un nombre positif ou nul." };
  }

  const [engin, site] = await Promise.all([
    prisma.engin.findFirst({
      where: { id: values.enginId, tenantId, active: true },
      select: { id: true },
    }),
    prisma.site.findFirst({
      where: { id: values.siteId, tenantId, active: true },
      select: { id: true },
    }),
  ]);

  if (!engin) {
    return { error: "L'engin sélectionné est invalide ou inactif." };
  }

  if (!site) {
    return { error: "Le site sélectionné est invalide ou inactif." };
  }

  return { du, hrm, compteur };
}

export async function createSaisieHrm(values: SaisieHrmInput) {
  const permission = await guard(ACTION.CREATE, RESOURCE.SAISIE_HRM);

  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const tenantId = await getSaisieHrmTenantId();

  if (!tenantId) {
    return { success: false, message: "Aucun tenant actif." };
  }

  try {
    const validated = await validateSaisieHrmInput(values, tenantId);

    if ("error" in validated) {
      return { success: false, message: validated.error };
    }

    const duplicate = await prisma.saisiehrm.findFirst({
      where: {
        du: validated.du,
        enginId: values.enginId,
        tenantId,
      },
      select: { id: true },
    });

    if (duplicate) {
      return {
        success: false,
        message: "Une saisie HRM existe déjà pour cet engin à cette date.",
      };
    }

    await prisma.saisiehrm.create({
      data: {
        du: validated.du,
        enginId: values.enginId,
        siteId: values.siteId,
        hrm: validated.hrm,
        compteur: validated.compteur,
        tenantId,
      },
    });

    return { success: true, message: "Saisie HRM créée avec succès." };
  } catch (error) {
    console.error("createSaisieHrm error:", error);
    return {
      success: false,
      message: "Erreur lors de la création de la saisie HRM.",
    };
  }
}

export async function updateSaisieHrm(
  values: SaisieHrmInput & { id: string },
) {
  const permission = await guard(ACTION.UPDATE, RESOURCE.SAISIE_HRM);

  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const tenantId = await getSaisieHrmTenantId();

  if (!tenantId) {
    return { success: false, message: "Aucun tenant actif." };
  }

  try {
    const existing = await prisma.saisiehrm.findFirst({
      where: { id: values.id, tenantId },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, message: "Saisie HRM introuvable." };
    }

    const validated = await validateSaisieHrmInput(values, tenantId);

    if ("error" in validated) {
      return { success: false, message: validated.error };
    }

    const duplicate = await prisma.saisiehrm.findFirst({
      where: {
        du: validated.du,
        enginId: values.enginId,
        tenantId,
        NOT: { id: values.id },
      },
      select: { id: true },
    });

    if (duplicate) {
      return {
        success: false,
        message: "Une autre saisie HRM existe pour cet engin à cette date.",
      };
    }

    await prisma.saisiehrm.update({
      where: { id: values.id },
      data: {
        du: validated.du,
        enginId: values.enginId,
        siteId: values.siteId,
        hrm: validated.hrm,
        compteur: validated.compteur,
      },
    });

    return { success: true, message: "Saisie HRM modifiée avec succès." };
  } catch (error) {
    console.error("updateSaisieHrm error:", error);
    return {
      success: false,
      message: "Erreur lors de la modification de la saisie HRM.",
    };
  }
}

export async function deleteSaisieHrm(id: string) {
  const permission = await guard(ACTION.DELETE, RESOURCE.SAISIE_HRM);

  if (!permission.success) {
    return { success: false, message: permission.message };
  }

  const tenantId = await getSaisieHrmTenantId();

  if (!tenantId) {
    return { success: false, message: "Aucun tenant actif." };
  }

  try {
    const existing = await prisma.saisiehrm.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, message: "Saisie HRM introuvable." };
    }

    const linkedHim = await prisma.saisiehim.count({
      where: { saisiehrmId: id, tenantId },
    });

    if (linkedHim > 0) {
      return {
        success: false,
        message:
          "Suppression impossible : cette saisie HRM est liée à une ou plusieurs saisies HIM.",
      };
    }

    await prisma.saisiehrm.delete({ where: { id } });

    return { success: true, message: "Saisie HRM supprimée avec succès." };
  } catch (error) {
    console.error("deleteSaisieHrm error:", error);
    return {
      success: false,
      message: "Erreur lors de la suppression de la saisie HRM.",
    };
  }
}

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

export async function importSaisieHrm(data: any) {
  try {
    const permission = await guard(
      ACTION.IMPORT,
      RESOURCE.SAISIE_HRM
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

    const rawHrm = data?.hrm;
    const hrm = parseNumber(rawHrm);

    const rawCompteur = data?.compteur;
    const hasCompteur = hasValue(rawCompteur);
    const compteur = hasCompteur
      ? parseNumber(rawCompteur)
      : null;

    const enginName = convertField(data?.enginName, "string");
    const siteName = convertField(data?.siteName, "string");

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

    if (typeof siteName !== "string" || !siteName.trim()) {
      return [{
        success: false,
        data,
        message: "Le champ 'siteName' est obligatoire.",
      }];
    }

    if (!hasValue(rawHrm)) {
      return [{
        success: false,
        data,
        message: "Le champ 'hrm' est obligatoire.",
      }];
    }

    if (hrm === null) {
      return [{
        success: false,
        data,
        message: "Le champ 'hrm' doit être un nombre valide.",
      }];
    }

    if (hrm < 0 || hrm > 24) {
      return [{
        success: false,
        data,
        message: "Le champ 'hrm' doit être compris entre 0 et 24.",
      }];
    }

    if (hasCompteur && compteur === null) {
      return [{
        success: false,
        data,
        message: "Le champ 'compteur' doit être un nombre valide.",
      }];
    }

    if (compteur !== null && compteur < 0) {
      return [{
        success: false,
        data,
        message: "Le champ 'compteur' ne doit pas être négatif.",
      }];
    }

    const [engin, site] = await Promise.all([
      prisma.engin.findUnique({
        where: {
          name_tenantId: {
            name: enginName,
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

    if (!engin) {
      return [{
        success: false,
        data,
        message: `Engin "${enginName}" non trouvé.`,
      }];
    }

    if (!site) {
      return [{
        success: false,
        data,
        message: `Site "${siteName}" non trouvé.`,
      }];
    }

    // Une valeur compteur absente ne remplace pas
    // une valeur existante lors d'une mise à jour.
    const compteurData =
      hasCompteur && compteur !== null ? { compteur } : {};

    const saisie = await prisma.saisiehrm.upsert({
      where: {
        du_enginId_tenantId: {
          du,
          enginId: engin.id,
          tenantId: currentTenantId,
        },
      },
      update: {
        siteId: site.id,
        hrm,
        ...compteurData,
      },
      create: {
        du,
        enginId: engin.id,
        siteId: site.id,
        hrm,
        tenantId: currentTenantId,
        ...compteurData,
      },
    });

    return [{
      success: true,
      data: saisie,
      message: `Saisie HRM ${enginName} du ${dateFormater(du)} importée avec succès.`,
    }];
  } catch (error: unknown) {
    console.error("Erreur lors de l'import HRM :", error);

    return [{
      success: false,
      data,
      message: "Échec de l'import HRM. Vérifiez les données et les journaux serveur.",
    }];
  }
}