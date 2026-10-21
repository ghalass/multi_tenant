// server/tenants.ts
"use server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sleep } from "@/lib/utils";
import { cache } from "react";

export async function getAllTenants() {
  await sleep();
  const session = await getSession();

  // check if session exist
  if (!session.userId) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  // Super-admin : accès à tous les tenants
  if (user?.isSuperAdmin) {
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
  if (!user?.tenantId) {
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
    const session = await getSession();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

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
    console.error(error);
    return {
      success: false,
      message: "Erreur!",
    };
  }
}

export async function getTenantById(tenantId?: string) {
  return prisma.tenant.findUnique({ where: { id: tenantId } });
}

export const getCurrentTenant = cache(async () => {
  const session = await getSession();
  const currentTenantId = session.currentTenantId;
  return getTenantById(currentTenantId);
});