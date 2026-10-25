// lib/rbac/middleware.ts
import { NextResponse } from "next/server";
import { hasPermission } from "./core";
import { getSession } from "../auth";
import { prisma } from "../prisma";
import { getCurrentTenant } from "@/server/tenants";
import { ACTION } from "../enums";

const checkTenant = async (): Promise<NextResponse | null> => {
  const currentTenant = await getCurrentTenant();

  if (!currentTenant?.id) {
    return NextResponse.json(
      { message: "Aucun tenant actif n'est sélectionné." },
      { status: 404 },
    );
  }

  if (!currentTenant.active) {
    return NextResponse.json(
      { message: "Ce tenant est désactivé." },
      { status: 403 },
    );
  }

  return null;
};

export async function protectRoute(
  action: ACTION,
  resource: string,
): Promise<NextResponse | null> {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Utilisateur non authentifié.",
        },
        { status: 401 },
      );
    }

    // Vérifier que le compte existe et qu'il est actif.
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        active: true,
        isSuperAdmin: true,
      },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: !user
            ? "Utilisateur introuvable."
            : "Votre compte est désactivé.",
        },
        { status: 401 },
      );
    }

    // Le SuperAdmin conserve ses droits globaux
    // uniquement si son compte est actif.
    if (user.isSuperAdmin) {
      return null;
    }

    // Pour les autres utilisateurs, le tenant doit être actif.
    const tenantError = await checkTenant();

    if (tenantError) {
      return tenantError;
    }

    // Vérifier les permissions de l'utilisateur dans ce tenant.
    const hasAccess = await hasPermission(action, resource);

    if (!hasAccess) {
      return NextResponse.json(
        {
          message: `Vous n'êtes pas autorisé ${humanizeAction(action)}`,
        },
        { status: 403 },
      );
    }

    return null;
  } catch {
    console.error("Erreur de vérification des permissions.");

    return NextResponse.json(
      {
        message: "Erreur lors de la vérification des permissions.",
      },
      { status: 500 },
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
  export: "pour exportation",
  import: "pour importation",
};

function humanizeAction(action: string): string {
  return ACTION_LABELS[action.toLowerCase()] ?? action;
}