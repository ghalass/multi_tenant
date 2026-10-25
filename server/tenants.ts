// server/tenants.ts
"use server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sleep } from "@/lib/utils";
import { cache } from "react";

export async function getAllTenants() {
  const session = await getSession();

  if (!session.userId) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      active: true,
      isSuperAdmin: true,
    },
  });

  if (!user?.active) return [];

  // Super-administrateur : tous les tenants.
  if (user.isSuperAdmin) {
    return prisma.tenant.findMany({
      include: {
        createdBy: {
          omit: { password: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  // Utilisateur ordinaire : uniquement ses appartenances.
  const memberships = await prisma.userTenant.findMany({
    where: { userId: session.userId },
    include: {
      tenant: {
        include: {
          createdBy: {
            omit: { password: true },
          },
        },
      },
    },
  });

  return memberships
    .filter(({ tenant }) => tenant.active)
    .map(({ tenant }) => tenant)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createTenant(name: string) {
  try {
    await sleep();

    const session = await getSession();

    if (!session.userId) {
      return {
        success: false,
        message: "Aucune session n'est trouvée.",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        active: true,
        isSuperAdmin: true,
      },
    });

    if (!user?.active) {
      return {
        success: false,
        message: "Compte désactivé ou utilisateur introuvable.",
      };
    }

    if (!user.isSuperAdmin) {
      return {
        success: false,
        message: "Seul le SuperAdmin peut créer un tenant.",
      };
    }

    const normalizedName = name.trim();

    if (!normalizedName) {
      return {
        success: false,
        message: "Le nom du tenant est obligatoire.",
      };
    }

    const nameUsed = await prisma.tenant.findFirst({
      where: { name: normalizedName },
    });

    if (nameUsed) {
      return {
        success: false,
        message: "Ce nom de tenant est déjà utilisé.",
      };
    }

    await prisma.tenant.create({
      data: {
        name: normalizedName,
        createdById: user.id,
      },
    });

    return {
      success: true,
      message: "Tenant créé avec succès.",
    };
  } catch (error) {
    console.error("Erreur lors de la création du tenant :", error);

    return {
      success: false,
      message: "Impossible de créer le tenant.",
    };
  }
}

export async function getTenantById(tenantId: string) {
  const session = await getSession();

  if (!session.userId || !tenantId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      active: true,
      isSuperAdmin: true,
    },
  });

  if (!user?.active) {
    return null;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return null;
  }

  // Le SuperAdmin actif peut consulter n'importe quel tenant.
  if (user.isSuperAdmin) {
    return tenant;
  }

  // Un utilisateur ordinaire doit appartenir à ce tenant.
  const membership = await prisma.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId: session.userId,
        tenantId,
      },
    },
    select: {
      userId: true,
    },
  });

  if (!membership) {
    return null;
  }

  return tenant;
}

export const getCurrentTenant = cache(async () => {
  const { currentTenantId } = await getSession();
  if (!currentTenantId) return null;
  return getTenantById(currentTenantId);
});