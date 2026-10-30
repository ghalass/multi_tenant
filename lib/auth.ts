// lib/auth.ts
"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { sleep } from "@/lib/utils";
import { getIronSession, type IronSession } from "iron-session";

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  const passwordMatches = await bcrypt.compare(password, hashedPassword);
  return passwordMatches;
}

export type SessionData = {
  userId?: string;
  currentTenantId?: string;
};

const sessionOptions = {
  password: process.env.SESSION_PASSWORD as string,
  cookieName: "auth_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const, // 'lax' | 'strict' | 'none'
    maxAge: process.env.SESSION_MAX_AGE
      ? parseInt(process.env.SESSION_MAX_AGE, 10)
      : 24 * 60 * 60, // 24 heure en secondes
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  await sleep()
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions,
  );

  /*  if (!session.isLoggedIn) {
    session.isLoggedIn = false;
  } */

  return session;
}

export async function saveSession({
  userId,
  currentTenantId,
}: {
  userId?: string;
  currentTenantId?: string;
}): Promise<void> {
  const session = await getSession();
  session.userId = userId;
  session.currentTenantId = currentTenantId;
  await session.save();
}

export async function switchCurrentTenant({
  currentTenantId,
}: {
  currentTenantId?: string;
}): Promise<void> {
  const session = await getSession();

  if (!session.userId) {
    throw new Error("Utilisateur non authentifié.");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isSuperAdmin: true },
  });

  if (!user) {
    throw new Error("Utilisateur introuvable.");
  }

  // Permet de retirer le tenant actif de la session.
  if (!currentTenantId) {
    session.currentTenantId = undefined;
    await session.save();
    return;
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      id: currentTenantId,
      active: true,
    },
    select: { id: true },
  });

  if (!tenant) {
    throw new Error("Tenant invalide ou inactif.");
  }

  // Le super-administrateur peut choisir n'importe quel tenant actif.
  // Un utilisateur ordinaire doit en être membre.
  if (!user.isSuperAdmin) {
    const membership = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: session.userId,
          tenantId: currentTenantId,
        },
      },
    });

    if (!membership) {
      throw new Error("Accès interdit à ce tenant.");
    }
  }

  session.currentTenantId = currentTenantId;
  await session.save();
}

export async function login(
  email: string,
  password: string,
): Promise<{ success: boolean; message: string }> {
  try {
    await sleep();

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !(await verifyPassword(password, user.password))) {
      return {
        success: false,
        message: "Email ou mot de passe incorrect.",
      };
    }

    if (!user.active) {
      return {
        success: false,
        message: "Votre compte est désactivé.",
      };
    }

    let currentTenantId: string | undefined;

    if (!user.isSuperAdmin) {
      const memberships = await prisma.userTenant.findMany({
        where: { userId: user.id },
        include: {
          tenant: {
            select: { active: true },
          },
        },
      });

      const activeTenantIds = memberships
        .filter((membership) => membership.tenant.active)
        .map((membership) => membership.tenantId);

      if (activeTenantIds.length === 0) {
        return {
          success: false,
          message: "Aucun tenant actif n'est associé à ce compte.",
        };
      }

      // Sélection automatique si l'utilisateur n'a qu'un seul tenant.
      // Sinon, il choisira sur la page d'accueil.
      if (activeTenantIds.length === 1) {
        currentTenantId = activeTenantIds[0];
      }
    }

    await saveSession({
      userId: user.id,
      currentTenantId,
    });

    return {
      success: true,
      message: "Connexion réussie.",
    };
  } catch {
    console.error("Erreur lors de la connexion.");

    return {
      success: false,
      message: "Une erreur est survenue lors de la connexion.",
    };
  }
}

export async function logout(): Promise<never> {
  const session = await getSession();

  session.destroy();

  // Optionnel : redirige immédiatement l'utilisateur après déconnexion
  redirect("/");
}