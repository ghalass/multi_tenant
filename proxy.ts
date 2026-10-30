
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSession } from "./lib/auth";
import { prisma } from "./lib/prisma";
import { createI18nMiddleware } from "next-international/middleware";

const locales = ["ar", "fr"] as const;
type Locale = (typeof locales)[number];

const defaultLocale: Locale = "fr";

const I18nMiddleware = createI18nMiddleware({
  locales: [...locales],
  defaultLocale,
  urlMappingStrategy: "rewriteDefault",
});

/**
 * Supprime le cookie de session lorsqu'un compte
 * n'existe plus ou est désactivé.
 */
function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.delete("auth_session");
  return response;
}

/**
 * Vérifie que l'utilisateur appartient au tenant
 * sélectionné et que ce tenant est actif.
 */
async function hasActiveTenantAccess(
  userId: string,
  tenantId?: string,
): Promise<boolean> {
  if (!tenantId) {
    return false;
  }

  const membership = await prisma.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId,
        tenantId,
      },
    },
    select: {
      tenant: {
        select: {
          active: true,
        },
      },
    },
  });

  return membership?.tenant.active === true;
}

export async function proxy(req: NextRequest): Promise<NextResponse<unknown>> {
  const { pathname } = req.nextUrl;

  // =========================================================
  // 1. TRAITEMENT DES API
  // =========================================================

  const isApi = pathname.startsWith("/api/");

  if (isApi) {
    // Cette route vérifie elle-même le secret d'initialisation.
    if (pathname === "/api/create_super_admin") {
      return NextResponse.next();
    }

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

    // Vérifier l'existence et l'état du compte.
    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        active: true,
        isSuperAdmin: true,
      },
    });

    if (!user?.active) {
      const response = NextResponse.json(
        {
          error: "Unauthorized",
          message: "Compte désactivé ou utilisateur introuvable.",
        },
        { status: 401 },
      );

      return clearAuthCookie(response);
    }

    // Le SuperAdmin actif peut accéder aux API globales
    // sans devoir sélectionner un tenant.
    if (user.isSuperAdmin) {
      return NextResponse.next();
    }

    // Un utilisateur ordinaire doit avoir un tenant actif
    // et appartenir à ce tenant.
    const hasAccess = await hasActiveTenantAccess(
      session.userId,
      session.currentTenantId,
    );

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message:
            "Tenant absent, désactivé ou non associé à votre compte.",
        },
        { status: 403 },
      );
    }

    return NextResponse.next();
  }

  // =========================================================
  // 2. DÉTERMINER LA LANGUE ET LE CHEMIN
  // =========================================================

  const segments = pathname.split("/");
  const firstSegment = segments[1];

  const hasLocalePrefix = locales.includes(
    firstSegment as Locale,
  );

  const locale: Locale = hasLocalePrefix
    ? (firstSegment as Locale)
    : defaultLocale;

  const normalizedPathname = hasLocalePrefix
    ? `/${segments.slice(2).join("/")}`
    : pathname;

  // =========================================================
  // 3. VÉRIFIER LA SESSION ET LE COMPTE
  // =========================================================

  const session = await getSession();

  const currentUser = session.userId
    ? await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        active: true,
        isSuperAdmin: true,
      },
    })
    : null;

  // Une ancienne session ne doit pas permettre à un compte
  // désactivé ou supprimé de continuer à naviguer.
  if (session.userId && !currentUser?.active) {
    const response =
      normalizedPathname === "/login"
        ? I18nMiddleware(req)
        : NextResponse.redirect(
          new URL(`/${locale}/login`, req.url),
        );

    return clearAuthCookie(response);
  }

  // =========================================================
  // 4. IDENTIFIER LES PAGES PUBLIQUES
  // =========================================================

  const publicPaths = ["/", "/login", "/register"];

  const isPublic = publicPaths.some(
    (path) =>
      normalizedPathname === path ||
      (path !== "/" &&
        normalizedPathname.startsWith(`${path}/`)),
  );

  // Un utilisateur connecté ne doit pas retourner
  // aux pages de connexion ou d'inscription.
  if (
    session.userId &&
    ["/login", "/register"].includes(normalizedPathname)
  ) {
    return NextResponse.redirect(
      new URL(`/${locale}`, req.url),
    );
  }

  // =========================================================
  // 5. PROTÉGER LES PAGES PRIVÉES
  // =========================================================

  if (!isPublic && !session.userId) {
    return NextResponse.redirect(
      new URL(`/${locale}/login`, req.url),
    );
  }

  // Le SuperAdmin actif n'a pas besoin d'un tenant actif
  // pour accéder aux fonctions globales.
  if (
    !isPublic &&
    session.userId &&
    currentUser &&
    !currentUser.isSuperAdmin
  ) {
    const hasAccess = await hasActiveTenantAccess(
      session.userId,
      session.currentTenantId,
    );

    // Si le tenant est désactivé, si l'appartenance a été
    // supprimée ou si aucun tenant n'est sélectionné,
    // retourner à l'accueil pour permettre un autre choix.
    if (!hasAccess) {
      return NextResponse.redirect(
        new URL(`/${locale}`, req.url),
      );
    }
  }

  // =========================================================
  // 6. APPLIQUER L'INTERNATIONALISATION
  // =========================================================

  // Les contrôles d'accès ont lieu avant les réécritures i18n.
  const i18nResponse = I18nMiddleware(req);

  if (
    (i18nResponse.status >= 300 &&
      i18nResponse.status < 400) ||
    i18nResponse.headers.has("x-middleware-rewrite")
  ) {
    return i18nResponse;
  }

  // =========================================================
  // 7. TRANSMETTRE LE CHEMIN À L'APPLICATION
  // =========================================================

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
