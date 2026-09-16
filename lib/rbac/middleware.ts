// lib/rbac/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { hasPermission, isAdmin } from "./core";
import { getSession } from "../auth";
import { ACTION } from "../enums";
import { prisma } from "../prisma";

const checkTenant = async () => {
  const session = await getSession();
  if (!session?.tenant.id) {
    return NextResponse.json(
      { message: "Aucune tenant ID n'est trouvé" },
      { status: 404 }
    );
  }
  // Vérifier si le tenant existe déjà
  const tenant = await prisma.tenant.findUnique({
    where: { id: session?.tenant.id },
  });
  if (!tenant) {
    return NextResponse.json(
      { message: "Ce nom d'entreprise n'existe pas" },
      { status: 404 }
    );
  }
};

export async function protectRoute(
  request: NextRequest,
  action: string,
  resource: string
): Promise<NextResponse | null> {
  try {
    // Vérifier si l'utilisateur est admin ou super-admin
    const session = await getSession();

    // check if tenantId is provided, if not throw Error
    await checkTenant();

    if (!session.isLoggedIn)
      return NextResponse.json(
        { error: "Unauthorized", message: "Utilisateur non authentifié" },
        { status: 401 }
      );

    const userId = session?.userId;
    const is_Admin = await isAdmin(userId);

    // Accès automatique pour les administrateurs et super-administrateurs
    if (is_Admin || session?.isSuperAdmin || session?.isOwner) {
      return null; // Accès autorisé pour les administrateurs, super-admin et l'owner
    }

    // Vérifier l'authentification de l'utilisateur, si ce n'est pas un admin ou super-admin
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Utilisateur non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier les permissions spécifiques, si ce n'est pas un admin ou super-admin
    const hasAccess = await hasPermission(userId, action, resource);

    if (!hasAccess) {
      return NextResponse.json(
        { message: `Opération non autorisée ${action}-${resource}` },
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

export async function protectReadRoute(
  request: NextRequest,
  resource: string
): Promise<NextResponse | null> {
  return protectRoute(request, ACTION.READ, resource);
}

export async function protectWriteRoute(
  request: NextRequest,
  resource: string
): Promise<NextResponse | null> {
  return protectRoute(request, ACTION.UPDATE, resource);
}

export async function protectCreateRoute(
  request: NextRequest,
  resource: string
): Promise<NextResponse | null> {
  return protectRoute(request, ACTION.CREATE, resource);
}

export async function protectUpdateRoute(
  request: NextRequest,
  resource: string
): Promise<NextResponse | null> {
  return protectRoute(request, ACTION.UPDATE, resource);
}

export async function protectDeleteRoute(
  request: NextRequest,
  resource: string
): Promise<NextResponse | null> {
  return protectRoute(request, ACTION.DELETE, resource);
}
