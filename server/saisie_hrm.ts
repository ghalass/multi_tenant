
"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { convertField } from "@/lib/convertField";
import { dateFormater } from "@/lib/utils";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { PAGINATION_SETTINGS, RESOURCE } from "@/lib/constantes";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface SaisieHrmSearchParams {
  name?: string;
  dateDu?: string;
  dateAu?: string;
  typeparcId?: string;
  parcId?: string;
  enginId?: string;
  siteId?: string;
  search?: string;
  du?: string;
  currentPage?: number | string;
  itemsPerPage?: number | string;
}

type SaisieHrmInput = {
  du: string;
  enginId: string;
  siteId: string;
  hrm: number;
  nho: number;
  compteur: number | null;
};

async function getSaisieHrmTenantId(): Promise<string | null> {
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

/**
 * Refuse toute date HRM postérieure à la date du jour.
 * La comparaison se fait sur YYYY-MM-DD en UTC.
 */
function validateDateHrmNotFuture(date: Date): string | null {
  if (Number.isNaN(date.getTime())) {
    return "La date de saisie est invalide.";
  }

  const dateSaisie = date.toISOString().slice(0, 10);
  const dateAujourdhui = new Date().toISOString().slice(0, 10);

  if (dateSaisie > dateAujourdhui) {
    return "La date de saisie HRM ne peut pas être dans le futur.";
  }

  return null;
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

/**
 * Vérifie que le nouveau relevé respecte la progression
 * chronologique des compteurs de l'engin.
 *
 * Règles :
 * - Le nouveau compteur ne peut pas être inférieur
 *   au dernier relevé précédent.
 * - Il ne peut pas dépasser le premier relevé suivant.
 * - Les saisies sans compteur sont ignorées.
 * - Lors d'une modification, la saisie actuelle est exclue.
 */
async function validateCompteurChronologique(
  tx: Prisma.TransactionClient,
  params: {
    enginId: string;
    tenantId: string;
    du: Date;
    compteur: number | null;
    excludeId?: string;
  },
): Promise<string | null> {
  const { enginId, tenantId, du, compteur, excludeId } = params;

  if (compteur === null) {
    return null;
  }

  const baseWhere: Prisma.SaisiehrmWhereInput = {
    enginId,
    tenantId,
    compteur: { not: null },
    ...(excludeId ? { id: { not: excludeId } } : {}),
  };

  const [previousReading, nextReading] = await Promise.all([
    tx.saisiehrm.findFirst({
      where: {
        ...baseWhere,
        du: { lt: du },
      },
      select: {
        du: true,
        compteur: true,
      },
      orderBy: { du: "desc" },
    }),

    tx.saisiehrm.findFirst({
      where: {
        ...baseWhere,
        du: { gt: du },
      },
      select: {
        du: true,
        compteur: true,
      },
      orderBy: { du: "asc" },
    }),
  ]);

  if (
    previousReading?.compteur !== null &&
    previousReading?.compteur !== undefined &&
    compteur < previousReading.compteur
  ) {
    const previousDate = previousReading.du
      .toISOString()
      .slice(0, 10);

    return (
      `Le compteur saisi (${compteur} h) est inférieur au dernier ` +
      `relevé précédent (${previousReading.compteur} h, du ${previousDate}). ` +
      "Vérifiez la date ou la valeur du compteur."
    );
  }

  if (
    nextReading?.compteur !== null &&
    nextReading?.compteur !== undefined &&
    compteur > nextReading.compteur
  ) {
    const nextDate = nextReading.du
      .toISOString()
      .slice(0, 10);

    return (
      `Le compteur saisi (${compteur} h) dépasse le relevé suivant ` +
      `(${nextReading.compteur} h, du ${nextDate}). ` +
      "Vérifiez la date ou la valeur du compteur."
    );
  }

  return null;
}

/**
 * Vérifie qu'une modification de HRM/NHO ne rend pas incohérent
 * le cumul des HIM déjà enregistrées pour cette journée.
 */
async function validateExistingHimCapacity(
  tx: Prisma.TransactionClient,
  params: {
    saisiehrmId: string;
    tenantId: string;
    hrm: number;
    nho: number;
  },
): Promise<string | null> {
  const { saisiehrmId, tenantId, hrm, nho } = params;

  const aggregate = await tx.saisiehim.aggregate({
    where: { saisiehrmId, tenantId },
    _sum: { him: true },
  });

  const totalHim = aggregate._sum.him ?? 0;
  const totalIndisponibilite = hrm + totalHim;

  if (totalIndisponibilite > nho) {
    return (
      `Modification refusée : HRM + total des HIM (${totalIndisponibilite.toFixed(2)} h) ` +
      `dépasse la nouvelle NHO (${nho} h). ` +
      `Les HIM déjà enregistrées totalisent ${totalHim.toFixed(2)} h.`
    );
  }

  return null;
}

function isSerializationConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}

function getTransactionErrorMessage(error: unknown): string {
  if (isSerializationConflict(error)) {
    return (
      "Une autre opération a modifié les relevés de cet engin " +
      "simultanément. Veuillez relancer l'opération."
    );
  }

  return "Une erreur est survenue lors de l'enregistrement de la saisie HRM.";
}

export async function getSaisieHrmOptions(): Promise<{
  success: boolean;
  message: string;
  data: {
    typeparcs: { id: string; name: string }[];
    parcs: { id: string; name: string; typeparcId: string }[];
    engins: {
      id: string;
      name: string;
      siteId: string;
      parcId: string;
    }[];
    sites: { id: string; name: string }[];
  };
}> {
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
      where: { tenantId, active: true },
      select: {
        id: true,
        name: true,
        parcId: true,
        siteId: true,
      },
      orderBy: { name: "asc" },
    }),

    prisma.site.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    success: true,
    message: "",
    data: { typeparcs, parcs, engins, sites },
  };
}

export async function getAllSaisieHrm(
  filters: SaisieHrmSearchParams = {},
): Promise<
  | {
    success: boolean;
    message: string;
    data: never[];
    meta?: undefined;
  }
  | {
    success: boolean;
    message: string;
    data: ({
      engin: { id: string; name: string };
      site: { id: string; name: string };
      tenant: { name: string };
    } & {
      id: string;
      hrm: number;
      enginId: string;
      siteId: string;
      tenantId: string;
      du: Date;
      nho: number;
      compteur: number | null;
    })[];
    meta: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      itemsPerPage: number;
    };
  }
> {
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
  const siteId = filters.siteId?.trim();

  const dateDu = filters.dateDu
    ? parseSaisieHrmDate(filters.dateDu)
    : null;

  const dateAu = filters.dateAu
    ? parseSaisieHrmDate(filters.dateAu)
    : null;

  const enginWhere: Prisma.EnginWhereInput = {};

  if (name) {
    enginWhere.name = {
      contains: name,
      mode: "insensitive",
    };
  }

  if (enginId) enginWhere.id = enginId;
  if (parcId) enginWhere.parcId = parcId;
  if (siteId) enginWhere.siteId = siteId;

  if (typeparcId) {
    enginWhere.parc = { typeparcId };
  }

  const where: Prisma.SaisiehrmWhereInput = {
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
): Promise<
  | { error: string }
  | {
    du: Date;
    hrm: number;
    nho: number;
    compteur: number | null;
  }
> {
  const du = parseSaisieHrmDate(values.du);
  const hrm = parseNumber(values.hrm);
  const nho = parseNumber(values.nho);

  const compteur =
    values.compteur === null || values.compteur === undefined
      ? null
      : parseNumber(values.compteur);

  if (!du) {
    return { error: "La date de saisie est invalide." };
  }

  const dateError = validateDateHrmNotFuture(du);

  if (dateError) {
    return { error: dateError };
  }

  if (!values.enginId || !values.siteId) {
    return { error: "L'engin et le site sont obligatoires." };
  }

  if (hrm === null || hrm < 0 || hrm > 24) {
    return {
      error: "La HRM doit être comprise entre 0 et 24.",
    };
  }

  if (nho === null || nho < 0 || nho > 24) {
    return {
      error: "La NHO est obligatoire et doit être comprise entre 0 et 24.",
    };
  }

  if (hrm > nho) {
    return {
      error: "La HRM ne peut pas dépasser la NHO.",
    };
  }

  if (
    values.compteur !== null &&
    values.compteur !== undefined &&
    compteur === null
  ) {
    return {
      error: "Le compteur doit être un nombre valide.",
    };
  }

  if (compteur !== null && compteur < 0) {
    return {
      error: "Le compteur doit être positif ou nul.",
    };
  }

  const [engin, site] = await Promise.all([
    prisma.engin.findFirst({
      where: {
        id: values.enginId,
        tenantId,
        active: true,
      },
      select: { id: true, siteId: true },
    }),

    prisma.site.findFirst({
      where: {
        id: values.siteId,
        tenantId,
        active: true,
      },
      select: { id: true },
    }),
  ]);

  if (!engin) {
    return {
      error: "L'engin sélectionné est invalide ou inactif.",
    };
  }

  if (!site) {
    return {
      error: "Le site sélectionné est invalide ou inactif.",
    };
  }

  if (engin.siteId !== site.id) {
    return {
      error: "Le site sélectionné doit correspondre au site de l'engin.",
    };
  }

  return { du, hrm, nho, compteur };
}

export async function createSaisieHrm(
  values: SaisieHrmInput,
): Promise<{ success: boolean; message: string | undefined }> {
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

    await prisma.$transaction(
      async (tx) => {
        const duplicate = await tx.saisiehrm.findFirst({
          where: {
            du: validated.du,
            enginId: values.enginId,
            tenantId,
          },
          select: { id: true },
        });

        if (duplicate) {
          throw new Error(
            "Une saisie HRM existe déjà pour cet engin à cette date.",
          );
        }

        const compteurError = await validateCompteurChronologique(tx, {
          enginId: values.enginId,
          tenantId,
          du: validated.du,
          compteur: validated.compteur,
        });

        if (compteurError) {
          throw new Error(compteurError);
        }

        await tx.saisiehrm.create({
          data: {
            du: validated.du,
            enginId: values.enginId,
            siteId: values.siteId,
            hrm: validated.hrm,
            nho: validated.nho,
            compteur: validated.compteur,
            tenantId,
          },
        });
      },
      {
        isolationLevel: "Serializable",
      },
    );

    return {
      success: true,
      message: "Saisie HRM créée avec succès.",
    };
  } catch (error) {
    console.error("createSaisieHrm error:", error);

    return {
      success: false,
      message: isSerializationConflict(error)
        ? getTransactionErrorMessage(error)
        : error instanceof Error
          ? error.message
          : "Erreur lors de la création de la saisie HRM.",
    };
  }
}

export async function updateSaisieHrm(
  values: SaisieHrmInput & { id: string },
): Promise<{ success: boolean; message: string | undefined }> {
  const permission = await guard(ACTION.UPDATE, RESOURCE.SAISIE_HRM);

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

    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.saisiehrm.findFirst({
          where: {
            id: values.id,
            tenantId,
          },
          select: { id: true },
        });

        if (!existing) {
          throw new Error("Saisie HRM introuvable.");
        }

        const duplicate = await tx.saisiehrm.findFirst({
          where: {
            du: validated.du,
            enginId: values.enginId,
            tenantId,
            NOT: { id: values.id },
          },
          select: { id: true },
        });

        if (duplicate) {
          throw new Error(
            "Une autre saisie HRM existe pour cet engin à cette date.",
          );
        }

        const compteurError = await validateCompteurChronologique(tx, {
          enginId: values.enginId,
          tenantId,
          du: validated.du,
          compteur: validated.compteur,
          excludeId: values.id,
        });

        if (compteurError) {
          throw new Error(compteurError);
        }

        const himCapacityError = await validateExistingHimCapacity(tx, {
          saisiehrmId: values.id,
          tenantId,
          hrm: validated.hrm,
          nho: validated.nho,
        });

        if (himCapacityError) {
          throw new Error(himCapacityError);
        }

        await tx.saisiehrm.update({
          where: { id: values.id },
          data: {
            du: validated.du,
            enginId: values.enginId,
            siteId: values.siteId,
            hrm: validated.hrm,
            nho: validated.nho,
            compteur: validated.compteur,
          },
        });
      },
      {
        isolationLevel: "Serializable",
      },
    );

    return {
      success: true,
      message: "Saisie HRM modifiée avec succès.",
    };
  } catch (error) {
    console.error("updateSaisieHrm error:", error);

    return {
      success: false,
      message: isSerializationConflict(error)
        ? getTransactionErrorMessage(error)
        : error instanceof Error
          ? error.message
          : "Erreur lors de la modification de la saisie HRM.",
    };
  }
}

export async function deleteSaisieHrm(
  id: string,
): Promise<{ success: boolean; message: string }> {
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

    return {
      success: true,
      message: "Saisie HRM supprimée avec succès.",
    };
  } catch (error) {
    console.error("deleteSaisieHrm error:", error);

    return {
      success: false,
      message: "Erreur lors de la suppression de la saisie HRM.",
    };
  }
}

export async function importSaisieHrm(
  data: Record<string, unknown>,
): Promise<
  | { success: boolean; data: null; message: string }[]
  | { success: boolean; data: Record<string, unknown>; message: string }[]
  | {
    success: boolean;
    data: {
      id: string;
      siteId: string;
      tenantId: string;
      du: Date;
      enginId: string;
      hrm: number;
      nho: number;
      compteur: number | null;
    };
    message: string;
  }[]
> {
  try {
    const permission = await guard(
      ACTION.IMPORT,
      RESOURCE.SAISIE_HRM,
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

    const rawNho = data?.nho;
    const nho = parseNumber(rawNho);

    const rawCompteur = data?.compteur;
    const hasCompteur = hasValue(rawCompteur);
    const compteur = hasCompteur
      ? parseNumber(rawCompteur)
      : null;

    const enginName = convertField(data?.enginName, "string");
    const siteName = convertField(data?.siteName, "string");

    if (!du || Number.isNaN(du.getTime())) {
      return [{
        success: false,
        data,
        message: "Le champ 'du' est obligatoire ou invalide.",
      }];
    }

    const dateError = validateDateHrmNotFuture(du);

    if (dateError) {
      return [{
        success: false,
        data,
        message: dateError,
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

    if (!hasValue(rawHrm) || hrm === null) {
      return [{
        success: false,
        data,
        message: "Le champ 'hrm' est obligatoire et doit être numérique.",
      }];
    }

    if (hrm < 0 || hrm > 24) {
      return [{
        success: false,
        data,
        message: "Le champ 'hrm' doit être compris entre 0 et 24.",
      }];
    }

    if (!hasValue(rawNho) || nho === null) {
      return [{
        success: false,
        data,
        message: "Le champ 'nho' est obligatoire et doit être numérique.",
      }];
    }

    if (nho < 0 || nho > 24) {
      return [{
        success: false,
        data,
        message: "Le champ 'nho' doit être compris entre 0 et 24.",
      }];
    }

    if (hrm > nho) {
      return [{
        success: false,
        data,
        message: "La HRM ne peut pas dépasser la NHO.",
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

    // L'absence du compteur ne remplace pas sa valeur existante.
    const compteurData =
      hasCompteur && compteur !== null ? { compteur } : {};

    const saisie = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.saisiehrm.findUnique({
          where: {
            du_enginId_tenantId: {
              du,
              enginId: engin.id,
              tenantId: currentTenantId,
            },
          },
          select: {
            id: true,
            compteur: true,
          },
        });

        const compteurFinal = hasCompteur
          ? compteur
          : existing?.compteur ?? null;

        const compteurError = await validateCompteurChronologique(tx, {
          enginId: engin.id,
          tenantId: currentTenantId,
          du,
          compteur: compteurFinal,
          excludeId: existing?.id,
        });

        if (compteurError) {
          throw new Error(compteurError);
        }

        if (existing) {
          const himCapacityError = await validateExistingHimCapacity(tx, {
            saisiehrmId: existing.id,
            tenantId: currentTenantId,
            hrm,
            nho,
          });

          if (himCapacityError) {
            throw new Error(himCapacityError);
          }
        }

        return tx.saisiehrm.upsert({
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
            nho,
            ...compteurData,
          },

          create: {
            du,
            enginId: engin.id,
            siteId: site.id,
            hrm,
            nho,
            tenantId: currentTenantId,
            ...compteurData,
          },
        });
      },
      {
        isolationLevel: "Serializable",
      },
    );

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
      message: error instanceof Error
        ? error.message
        : "Échec de l'import HRM. Vérifiez les données et les journaux serveur.",
    }];
  }
}
