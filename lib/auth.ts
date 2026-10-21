// lib/auth.ts
"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { sleep } from "@/lib/utils";

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string) {
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

export async function getSession() {
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

export async function logoutAction() {
  const session = await getSession();

  session.destroy();

  // Optionnel : redirige immédiatement l'utilisateur après déconnexion
  redirect("/");
}

export async function saveSession({ userId, currentTenantId }: { userId?: string, currentTenantId?: string }) {
  const session = await getSession();
  session.userId = userId;
  session.currentTenantId = currentTenantId;
  await session.save();
}

export async function switchCurrentTenant({ currentTenantId }: { currentTenantId?: string }) {
  const session = await getSession();
  session.currentTenantId = currentTenantId;
  await session.save();
}

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

// export async function getCurrentUser() {
//   try {
//     await sleep();
//     const session = await getSession();

//     // check if session exist
//     if (!session?.userId) {
//       return {
//         success: false,
//         message: "Aucun utilisateur n'est connecté",
//         data: [],
//       };
//     }

//     // find user by email
//     const user = await prisma.user.findFirst({
//       where: { id: session?.userId },
//       omit: { password: true, createdAt: true, updatedAt: true },
//       include: {
//         roles: {
//           include: {
//             permissions: true,
//           },
//         },
//       },
//     });
//     if (!user)
//       return {
//         success: false,
//         message: "Aucun utilisateur n'est connecté",
//         data: [],
//       };

//     const res = {
//       success: true,
//       message: "OK",
//       user
//       // user: user && session ? { ...user, currentTenantId: session.currentTenantId } : null,
//     };
//     console.log(res);

//     return res
//   } catch (error) {
//     const e = error as Error;
//     return {
//       success: false,
//       message: e.message || "Une erreur inconnue s'est produite",
//     };
//   }
// }
