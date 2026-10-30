"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";

type NamedOption = { id: string; name: string };
type ParcOption = NamedOption & { typeparcId: string };
type EnginOption = NamedOption & {
  parcId: string;
  siteId: string;
  active: boolean;
};
type SiteOption = NamedOption & { active: boolean };

export type SaisieHrmPageOptions = {
  typeParcs: NamedOption[];
  parcs: ParcOption[];
  engins: EnginOption[];
  sites: SiteOption[];
};

const EMPTY_OPTIONS: SaisieHrmPageOptions = {
  typeParcs: [],
  parcs: [],
  engins: [],
  sites: [],
};

export async function getSaisieHrmPageOptions(): Promise<{
  success: boolean;
  message: string;
  data: SaisieHrmPageOptions;
}> {
  const permissions = await Promise.all([
    guard(ACTION.READ, RESOURCE.SAISIE_HRM),
    guard(ACTION.CREATE, RESOURCE.SAISIE_HRM),
    guard(ACTION.UPDATE, RESOURCE.SAISIE_HRM),
  ]);

  const permission = permissions.find((item) => item.success);
  const deniedPermission = permissions.find(
    (item): item is { success: false; message: string } => !item.success,
  );

  if (!permission) {
    return {
      success: false,
      message: deniedPermission?.message ?? "Accès refusé.",
      data: EMPTY_OPTIONS,
    };
  }

  const { currentTenantId } = await getSession();

  if (!currentTenantId) {
    return {
      success: false,
      message: "Aucun tenant actif.",
      data: EMPTY_OPTIONS,
    };
  }

  const tenant = await prisma.tenant.findFirst({
    where: { id: currentTenantId, active: true },
    select: { id: true },
  });

  if (!tenant) {
    return {
      success: false,
      message: "Le tenant sélectionné est absent ou désactivé.",
      data: EMPTY_OPTIONS,
    };
  }

  const [typeParcsRows, parcsRows, enginsRows, sitesRows] = await Promise.all([
    prisma.typeparc.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),

    prisma.parc.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true, typeparcId: true },
      orderBy: { name: "asc" },
    }),

    prisma.engin.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        name: true,
        parcId: true,
        siteId: true,
        active: true,
      },
      orderBy: { name: "asc" },
    }),

    // Les sites inactifs sont nécessaires pour corriger les anciennes saisies.
    prisma.site.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    success: true,
    message: "",
    data: {
      typeParcs: typeParcsRows.map(({ id, name }) => ({ id, name })),
      parcs: parcsRows.map(({ id, name, typeparcId }) => ({
        id,
        name,
        typeparcId,
      })),
      engins: enginsRows.map(({ id, name, parcId, siteId, active }) => ({
        id,
        name,
        parcId,
        siteId,
        active,
      })),
      sites: sitesRows.map(({ id, name, active }) => ({
        id,
        name,
        active,
      })),
    },
  };
}