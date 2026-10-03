// lib/rbac/middleware.ts
import { NextResponse } from "next/server";
import { hasPermission, isSuperAdmin } from "./core";
import { getSession } from "../auth";
import { prisma } from "../prisma";
import { getCurrentTenant } from "@/server/tenants";
import { ACTION } from "../enums";

const checkTenant = async () => {
  const currentTenant = await getCurrentTenant()
  if (!currentTenant?.id) {
    return NextResponse.json(
      { message: "Aucune tenant ID n'est trouvé" },
      { status: 404 }
    );
  }
  // Vérifier si le tenant existe déjà
  const tenant = await prisma.tenant.findUnique({
    where: { id: currentTenant?.id },
  });
  if (!tenant) {
    return NextResponse.json(
      { message: "Ce nom d'organisation n'existe pas" },
      { status: 404 }
    );
  }
};

export async function protectRoute(
  action: ACTION,
  resource: string
): Promise<NextResponse | null> {
  try {
    // Vérifier si l'utilisateur est admin ou super-admin
    const session = await getSession();

    // check if tenantId is provided, if not throw Error
    await checkTenant();

    if (!session.userId)
      return NextResponse.json(
        { error: "Unauthorized", message: "Utilisateur non authentifié" },
        { status: 401 }
      );

    // Vérifier l'authentification de l'utilisateur, si ce n'est pas super-admin
    const userId = session?.userId;
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Utilisateur non authentifié" },
        { status: 401 }
      );
    }

    // Accès automatique pour les super-administrateurs
    const checkIsSuperAdmin = await isSuperAdmin(userId);
    if (checkIsSuperAdmin) {
      return null; // Accès autorisé pour les administrateurs, super-admin et l'owner
    }

    // Vérifier les permissions spécifiques, si ce n'est pas super-admin
    const hasAccess = await hasPermission(action, resource);

    if (!hasAccess) {
      return NextResponse.json(
        { message: `Vous n'êtes pas autorisé ${humanizeAction(action)}` },
        { status: 403 }
      );
    }

    return null;
  } catch (error) {
    console.error("Error in protectRoute:", error);
    return NextResponse.json(
      {
        message: `Erreur de vérification des permissions ${action}-${resource}`,
      },
      { status: 500 }
    );
  }
}

// ============================================================
// HELPERS POUR SERVER ACTIONS
// ============================================================

type GuardResult =
  | { success: true }
  | { success: false; message: string };

export async function guard(
  action: ACTION,
  resource: string
): Promise<GuardResult> {
  const res = await protectRoute(action, resource);
  if (!res) return { success: true };

  let message = "Non autorisé";
  try {
    const body = await res.json();
    message = body.message ?? body.error ?? message;
  } catch {
    // garde le message par défaut
  }
  return { success: false, message }
  // return { allowed: false, message };
}


// ============================================================
// HELPERS POUR LES MESSAGES DE LA FONCTION protectRoute
// ============================================================

const ACTION_LABELS: Record<string, string> = {
  read: "pour la consultation",
  create: "pour la création",
  update: "pour la modification",
  delete: "pour la suppression",
};

function humanizeAction(action: string): string {
  return ACTION_LABELS[action.toLowerCase()] ?? action;
}