
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
  urlMappingStrategy: 'rewriteDefault'
});

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // Les API ne passent pas par le middleware i18n
  if (isApi) {
    const session = await getSession();

    if (pathname === "/api/create_super_admin") {
      return NextResponse.next();
    }

    if (!session.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    return NextResponse.next();
  }

  // Appliquer l'internationalisation
  const i18nResponse = I18nMiddleware(req);

  // Respecter les redirections et réécritures i18n
  if (
    (i18nResponse.status >= 300 &&
      i18nResponse.status < 400) ||
    i18nResponse.headers.has("x-middleware-rewrite")
  ) {
    return i18nResponse;
  }

  // Déterminer la langue et le chemin sans préfixe
  const segments = pathname.split("/");
  const firstSegment = segments[1];

  const locale = locales.includes(firstSegment as Locale)
    ? (firstSegment as Locale)
    : defaultLocale;

  const normalizedPathname = locales.includes(firstSegment as Locale)
    ? "/" + segments.slice(2).join("/")
    : pathname;

  const session = await getSession();

  const publicPaths = ["/", "/login", "/register"];

  const isPublic = publicPaths.some(
    (path) =>
      normalizedPathname === path ||
      (path !== "/" &&
        normalizedPathname.startsWith(path + "/")),
  );

  if (isPublic) {
    if (
      session.userId &&
      ["/login", "/register"].includes(normalizedPathname)
    ) {
      return NextResponse.redirect(
        new URL(`/${locale}`, req.url),
      );
    }

    return NextResponse.next();
  }

  if (!session.userId) {
    return NextResponse.redirect(
      new URL(`/${locale}/login`, req.url),
    );
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};




// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";
// import { getSession } from "./lib/auth";

// import { createI18nMiddleware } from 'next-international/middleware'

// const I18nMiddleware = createI18nMiddleware({
//   locales: ['en', 'fr'],
//   defaultLocale: 'en'
// })

// export async function proxy(req: NextRequest) {
//   const { pathname } = req.nextUrl;
//   const isApi = pathname.startsWith("/api/");
//   const session = await getSession();

//   const publicPaths = [
//     "/",
//     "/login",
//     "/api/create_super_admin",
//   ];

//   // 🔓 Routes publiques
//   if (
//     publicPaths.some(
//       (path) => pathname === path || pathname.startsWith(path + "/"),
//     )
//   ) {
//     if (session.userId && (pathname === "/login" || pathname === "/register")) {
//       return NextResponse.redirect(new URL("/", req.url));
//     }

//     return NextResponse.next();
//   }

//   // 🔒 Routes privées
//   const decoded = session.userId ? session : null;

//   if (!decoded) {
//     if (isApi) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     } else {
//       return NextResponse.redirect(new URL("/login", req.url));
//     }
//   }

//   // Next.js injecte le pathname dans les headers. On peut parser l'tenantId depuis là.
//   // injecter x-pathname
//   const requestHeaders = new Headers(req.headers);
//   requestHeaders.set("x-pathname", req.nextUrl.pathname);

//   return NextResponse.next({
//     request: { headers: requestHeaders },
//   });
// }

// export const config = {
//   matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
// };
