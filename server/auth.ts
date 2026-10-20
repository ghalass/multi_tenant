// server/auth.ts
"use server";
import { getSession, saveSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sleep } from "@/lib/utils";

export async function login(email: string, password: string) {
  try {
    const error_message = "Email ou mot de passe incorrect!";

    // Attend 1500ms (1.5 seconde) avant de continuer
    await sleep();

    // find user by email
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return { success: false, message: error_message };

    // check password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) return { success: false, message: error_message };

    // check if user is active
    if (!user.active)
      return {
        success: false,
        message:
          "Votre compte n'est pas encore activé, veuillez contacter un admin pour l'activation.",
      };

    // SESSION
    // const session = await getSession();
    // session.userId = user?.id || "";
    // await session.save();
    await saveSession({ userId: user?.id });

    return {
      success: true,
      message: "Connexion réussie",
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: e.message || "Une erreur inconnue s'est produite",
    };
  }
}

export async function getCurrentUser() {
  try {
    await sleep();
    const session = await getSession();

    // check if session exist
    if (!session?.userId) {
      return {
        success: false,
        message: "Aucun utilisateur n'est connecté",
        data: [],
      };
    }

    // find user by email
    const user = await prisma.user.findFirst({
      where: { id: session?.userId },
      omit: { password: true, createdAt: true, updatedAt: true },
      include: {
        roles: {
          include: {
            permissions: true,
          },
        },
      },
    });
    if (!user)
      return {
        success: false,
        message: "Aucun utilisateur n'est connecté",
        data: [],
      };

    return {
      success: true,
      message: "OK",
      user: user && session ? { ...user, currentTenantId: session.currentTenantId } : null,
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: e.message || "Une erreur inconnue s'est produite",
    };
  }
}
