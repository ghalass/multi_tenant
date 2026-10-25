
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSession } from "./lib/auth";
import { createI18nMiddleware } from "next-international/middleware";

const locales = ["ar", "fr"] as const;
type Locale = (typeof locales)[number];

const defaultLocale: Locale = "fr";

const I18nMiddleware = createI18nMiddleware({
  locales: [...locales],
  defaultLocale,
  urlMappingStrategy: "rewriteDefault",
});

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // 1. Gestion des API
  if (isApi) {
    // La route d'initialisation vérifie elle-même son secret.
    if (pathname === "/api/create_super_admin") {
      return NextResponse.next();
    }

    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    return NextResponse.next();
  }

  // 2. Déterminer la langue et le chemin normalisé
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

  // 3. Vérifier l'authentification AVANT l'i18n
  const session = await getSession();

  const publicPaths = ["/", "/login", "/register"];

  const isPublic = publicPaths.some(
    (path) =>
      normalizedPathname === path ||
      (path !== "/" &&
        normalizedPathname.startsWith(`${path}/`)),
  );

  // Rediriger les utilisateurs connectés hors des pages de connexion.
  if (
    session.userId &&
    ["/login", "/register"].includes(normalizedPathname)
  ) {
    return NextResponse.redirect(
      new URL(`/${locale}`, req.url),
    );
  }

  // Protéger les pages privées.
  if (!isPublic && !session.userId) {
    return NextResponse.redirect(
      new URL(`/${locale}/login`, req.url),
    );
  }

  // 4. Appliquer l'internationalisation après le contrôle d'accès
  const i18nResponse = I18nMiddleware(req);

  // Respecter les redirections et les réécritures i18n.
  if (
    (i18nResponse.status >= 300 &&
      i18nResponse.status < 400) ||
    i18nResponse.headers.has("x-middleware-rewrite")
  ) {
    return i18nResponse;
  }

  // 5. Transmettre le chemin de la requête à l'application.
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
