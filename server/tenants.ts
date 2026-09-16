// server/tenants.ts
"use server";
import { prisma } from "@/lib/prisma";
import { sleep } from "@/lib/utils";
import { getCurrentUser } from "./auth";
import { headers } from "next/headers";
import { cache } from "react";

export async function getAllTenants() {
  await sleep();
  const { user } = await getCurrentUser();

  // check if session exist
  if (!user?.id) return [];

  // Super-admin : accès à tous les tenants
  if (user.isSuperAdmin) {
    return prisma.tenant.findMany({
      include: {
        createdBy: {
          omit: {
            password: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  // Utilisateur normal : uniquement son tenant
  if (!user.tenantId) {
    return [];
  }

  return prisma.tenant.findMany({
    where: {
      id: user.tenantId,
    },
    include: {
      createdBy: {
        omit: {
          password: true,
        },
      },
    },
  });
}

export async function createTenant(name: string) {
  try {
    await sleep();
    const { user } = await getCurrentUser();

    // check if session exist
    if (!user?.id)
      return {
        success: false,
        message: "Aucune session n'est trouvée!",
      };

    // Super-admin : seul qui peut créer un nouveau tenant
    if (!user.isSuperAdmin) {
      return {
        success: false,
        message: "Vous n'êtes pas authorisé pour créer un tenant.",
      };
    }

    // vérifier si le nom est déjà utilisé
    const nameUsed = await prisma.tenant.findFirst({
      where: { name },
    });
    if (nameUsed) {
      return {
        success: false,
        message: "Nom du tenant est déjà utilisé, veuillez choisir un autre.",
      };
    }

    // créer le tenant
    await prisma.tenant.create({
      data: {
        name,
        createdById: user?.id,
      },
    });
    return {
      success: true,
      message: "Tenant crée avec succès!",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Erreur!",
    };
  }
}

export async function getTenantById(tenantId: string) {
  return prisma.tenant.findUnique({ where: { id: tenantId } });
}

async function getTenantIdFromUrl(): Promise<string | null> {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  return pathname.split("/").filter(Boolean)[0] ?? null;
}

/**
 * Récupère le tenant courant depuis l'URL.
 * Mémoïsé avec React.cache → un seul appel DB par requête.
 */
export const getCurrentTenant = cache(async () => {
  const tenantId = await getTenantIdFromUrl();
  if (!tenantId) return null;
  return getTenantById(tenantId);
});