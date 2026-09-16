// lib/api.ts - Version corrigée

// Configuration depuis .env
const SIMULATE_DELAY = process.env.NEXT_PUBLIC_SIMULATE_API_DELAY === "true";
const DELAY_MS = parseInt(process.env.NEXT_PUBLIC_API_DELAY_MS || "500");

// Délai unique global
let GLOBAL_API_DELAY = SIMULATE_DELAY ? DELAY_MS : 0;
let DELAY_ENABLED = SIMULATE_DELAY;

export const API = {
  TABLES: "/api/tables",
  AUTH: {
    LOGIN: `/api/auth/login`,
    REGISTER: `/api/auth/register`,
    ME: `/api/auth/me`,
    LOGOUT: `/api/auth/logout`,
    EDIT_PROFILE: `/api/auth/profile`,
    CHANGE_PASSWORD: `/api/auth/change-password`,
    SUPER_ADMIN_LOGIN: `/api/super-admin/login`,
  },
  SUPER_ADMIN: {
    GET_ALL_ENTREPRISES: "/api/super-admin/entreprises",
    GET_ONE_ENTREPRISE: (entrepriseId: string) =>
      `/api/super-admin/entreprises/${entrepriseId}`,
    CREATE_ENTREPRISE: "/api/super-admin/entreprises",
    UPDATE_ENTREPRISE: (entrepriseId: string) =>
      `/api/super-admin/entreprises/${entrepriseId}`,
    DELETE_ENTREPRISE: (entrepriseId: string) =>
      `/api/super-admin/entreprises/${entrepriseId}`,
    DASHBOARD_STATS: "/api/super-admin/dashboard/stats",
    GET_ALL_USERS: "/api/super-admin/users",
    GET_USER_DETAILS: (userId: string) => `/api/super-admin/users/${userId}`,
    UPDATE_USER: (userId: string) => `/api/super-admin/users/${userId}`,
    RESET_USER_PASSWORD: (userId: string) => `/api/super-admin/users/${userId}`,
  },
  USERS: {
    ALL: "/api/users",
    USER_CREATE: "/api/users",
    USER_DETAILS: (userId: string) => `/api/users/${userId}`,
    USER_UPDATE: (userId: string) => `/api/users/${userId}`,
    USER_DELETE: (userId: string) => `/api/users/${userId}`,
  },
  ROLES: {
    ALL: "/api/roles",
    ROLE_CREATE: "/api/roles",
    ROLE_DETAILS: (roleId: string) => `/api/roles/${roleId}`,
    ROLE_UPDATE: (roleId: string) => `/api/roles/${roleId}`,
    ROLE_DELETE: (roleId: string) => `/api/roles/${roleId}`,
  },
  PERMISSIONS: {
    ALL: "/api/permissions",
    PERMISSION_CREATE: "/api/permissions",
    PERMISSION_DETAILS: (id: string) => `/api/permissions/${id}`,
    PERMISSION_UPDATE: (id: string) => `/api/permissions/${id}`,
    PERMISSION_DELETE: (id: string) => `/api/permissions/${id}`,
    RESOURCES: "/api/permissions/resources",
  },
  SITES: {
    ALL: "/api/sites",
    SITE_CREATE: "/api/sites",
    SITE_DETAILS: (id: string) => `/api/sites/${id}`,
    SITE_UPDATE: (id: string) => `/api/sites/${id}`,
    SITE_DELETE: (id: string) => `/api/sites/${id}`,
  },
  TYPEPARCS: {
    ALL: "/api/typeparcs",
    TYPEPARC_CREATE: "/api/typeparcs",
    TYPEPARC_DETAILS: (id: string) => `/api/typeparcs/${id}`,
    TYPEPARC_UPDATE: (id: string) => `/api/typeparcs/${id}`,
    TYPEPARC_DELETE: (id: string) => `/api/typeparcs/${id}`,
  },
  TYPEPANNES: {
    ALL: "/api/typepannes",
    TYPEPANNE_CREATE: "/api/typepannes",
    TYPEPANNE_DETAILS: (id: string) => `/api/typepannes/${id}`,
    TYPEPANNE_UPDATE: (id: string) => `/api/typepannes/${id}`,
    TYPEPANNE_DELETE: (id: string) => `/api/typepannes/${id}`,
  },
  PANNES: {
    ALL: "/api/pannes",
    PANNE_CREATE: "/api/pannes",
    PANNE_DETAILS: (id: string) => `/api/pannes/${id}`,
    PANNE_UPDATE: (id: string) => `/api/pannes/${id}`,
    PANNE_DELETE: (id: string) => `/api/pannes/${id}`,
  },
  PARCS: {
    ALL: "/api/parcs",
    PARC_CREATE: "/api/parcs",
    PARC_DETAILS: (id: string) => `/api/parcs/${id}`,
    PARC_UPDATE: (id: string) => `/api/parcs/${id}`,
    PARC_DELETE: (id: string) => `/api/parcs/${id}`,
  },
  ENGINS: {
    ALL: "/api/engins",
    ENGIN_CREATE: "/api/engins",
    ENGIN_DETAILS: (id: string) => `/api/engins/${id}`,
    ENGIN_UPDATE: (id: string) => `/api/engins/${id}`,
    ENGIN_DELETE: (id: string) => `/api/engins/${id}`,
  },
  ANOMALIES: {
    ALL: "/api/anomalies",
    ANOMALIE_CREATE: "/api/anomalies",
    ANOMALIE_DETAILS: (id: string) => `/api/anomalies/${id}`,
    ANOMALIE_UPDATE: (id: string) => `/api/anomalies/${id}`,
    ANOMALIE_DELETE: (id: string) => `/api/anomalies/${id}`,
    IMPORT: "/api/anomalies/import",
    UPDATE_IMPORT: "/api/anomalies/update-import",
  },
  SAISIEHRMS: {
    ALL: "/api/saisiehrms",
    CREATE: "/api/saisiehrms",
    DETAILS: (id: string) => `/api/saisiehrms/${id}`,
    UPDATE: (id: string) => `/api/saisiehrms/${id}`,
    DELETE: (id: string) => `/api/saisiehrms/${id}`,
  },
  SAISIEHIMS: {
    ALL: "/api/saisiehims",
    CREATE: "/api/saisiehims",
    DETAILS: (id: string) => `/api/saisiehims/${id}`,
    UPDATE: (id: string) => `/api/saisiehims/${id}`,
    DELETE: (id: string) => `/api/saisiehims/${id}`,
  },
  TYPELUBRIFIANTS: {
    ALL: "/api/typelubrifiants",
    TYPELUBRIFIANT_CREATE: "/api/typelubrifiants",
    TYPELUBRIFIANT_DETAILS: (id: string) => `/api/typelubrifiants/${id}`,
    TYPELUBRIFIANT_UPDATE: (id: string) => `/api/typelubrifiants/${id}`,
    TYPELUBRIFIANT_DELETE: (id: string) => `/api/typelubrifiants/${id}`,
    IMPORT: "/api/typelubrifiants/import",
    UPDATE_IMPORT: "/api/typelubrifiants/update-import",
  },
  LUBRIFIANTS: {
    ALL: "/api/lubrifiants",
    LUBRIFIANT_CREATE: "/api/lubrifiants",
    LUBRIFIANT_DETAILS: (id: string) => `/api/lubrifiants/${id}`,
    LUBRIFIANT_UPDATE: (id: string) => `/api/lubrifiants/${id}`,
    LUBRIFIANT_DELETE: (id: string) => `/api/lubrifiants/${id}`,
  },
  OBJECTIFS: {
    ALL: "/api/objectifs",
    OBJECTIF_CREATE: "/api/objectifs",
    OBJECTIF_DETAILS: (id: string) => `/api/objectifs/${id}`,
    OBJECTIF_UPDATE: (id: string) => `/api/objectifs/${id}`,
    OBJECTIF_DELETE: (id: string) => `/api/objectifs/${id}`,
  },
  TYPEORGANES: {
    ALL: "/api/typeorganes",
    TYPEORGANE_CREATE: "/api/typeorganes",
    TYPEORGANE_DETAILS: (id: string) => `/api/typeorganes/${id}`,
    TYPEORGANE_UPDATE: (id: string) => `/api/typeorganes/${id}`,
    TYPEORGANE_DELETE: (id: string) => `/api/typeorganes/${id}`,
  },
  ORGANES: {
    ALL: "/api/organes",
    ORGANE_CREATE: "/api/organes",
    ORGANE_DETAILS: (id: string) => `/api/organes/${id}`,
    ORGANE_UPDATE: (id: string) => `/api/organes/${id}`,
    ORGANE_DELETE: (id: string) => `/api/organes/${id}`,
  },
  SAISIELUBRIFIANTS: {
    ALL: "/api/saisielubrifiants",
    CREATE: "/api/saisielubrifiants",
    DETAILS: (id: string) => `/api/saisielubrifiants/${id}`,
    UPDATE: (id: string) => `/api/saisielubrifiants/${id}`,
    DELETE: (id: string) => `/api/saisielubrifiants/${id}`,
  },
  TYPECONSOMMATIONLUBS: {
    ALL: "/api/typeconsommationlubs",
    CREATE: "/api/typeconsommationlubs",
    DETAILS: (id: string) => `/api/typeconsommationlubs/${id}`,
    UPDATE: (id: string) => `/api/typeconsommationlubs/${id}`,
    DELETE: (id: string) => `/api/typeconsommationlubs/${id}`,
    BY_PARC: (parcId: string) => `/api/typeconsommationlubs?parcId=${parcId}`,
  },
  RAPPORTS: {
    RJE: "/api/rapports/rje",
    ANALYSE_INDISPO: "/api/rapports/analyse-indisponibilite",
  },
  ENTREPRISES: {
    ALL: "/api/entreprises",
    ENTREPRISE_CREATE: "/api/entreprises",
    ENTREPRISE_DETAILS: (id: string) => `/api/entreprises/${id}`,
    ENTREPRISE_UPDATE: (id: string) => `/api/entreprises/${id}`,
    ENTREPRISE_DELETE: (id: string) => `/api/entreprises/${id}`,
  },
};

export enum methods {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
}

export async function apiFetch<T = any>(
  url: string,
  options?: {
    method?: methods;
    body?: any;
    headers?: Record<string, string>;
    skipDelay?: boolean; // Option pour désactiver manuellement
    cookies?: Record<string, string>; // Option pour passer des cookies manuellement
  }
) {
  // CORRECTION : Convertir l'URL relative en URL absolue si nécessaire
  let fullUrl = url;

  // Si l'URL ne commence pas par http:// ou https://
  if (!url.startsWith("http")) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fullUrl = `${baseUrl}${url}`;
  }

  // Appliquer le délai automatiquement si activé et non désactivé manuellement
  const shouldDelay = !options?.skipDelay && DELAY_ENABLED;

  if (shouldDelay && GLOBAL_API_DELAY > 0) {
    await new Promise((resolve) => setTimeout(resolve, GLOBAL_API_DELAY));
  }

  try {
    // Préparer les headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options?.headers,
    };

    // Ajouter les cookies si on est côté serveur
    let cookiesToSend = options?.cookies;

    if (!cookiesToSend && typeof window === "undefined") {
      // On est côté serveur, essayer de récupérer les cookies automatiquement
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();

        cookiesToSend = allCookies.reduce((acc, cookie) => {
          acc[cookie.name] = cookie.value;
          return acc;
        }, {} as Record<string, string>);
      } catch (error) {
        // console.error("Impossible de récupérer les cookies automatiquement");
      }
    }

    // Ajouter les cookies au header si disponibles
    if (cookiesToSend && Object.keys(cookiesToSend).length > 0) {
      const cookieString = Object.entries(cookiesToSend)
        .map(([key, value]) => `${key}=${value}`)
        .join("; ");

      headers["Cookie"] = cookieString;
    }

    const response = await fetch(fullUrl, {
      method: options?.method || methods.GET,
      headers,
      body:
        options?.body !== undefined && options?.body !== null
          ? typeof options.body === "string"
            ? options.body
            : JSON.stringify(options.body)
          : undefined,
      credentials: "include", // Important pour inclure les cookies
    });

    if (!response.ok) {
      // console.error(`API Error: ${response.status} ${response.statusText}`);

      // Essayer de parser le JSON de la réponse pour obtenir le message du serveur
      let errorData = {
        error: `HTTP ${response.status}`,
        message: response.statusText || "Erreur HTTP",
      };

      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const serverErrorData = await response.json();
          errorData = {
            ...errorData,
            ...serverErrorData,
          };
        }
      } catch (parseError) {
        // console.error("Impossible de parser l'erreur JSON:", parseError);
      }

      return {
        ok: false,
        status: response.status,
        data: errorData,
      };
    }

    let data;
    const contentType = response.headers.get("content-type");

    try {
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        // console.error("Non-JSON response:", text.substring(0, 200));
        throw new Error(`Response is not JSON: ${text.substring(0, 100)}`);
      }
    } catch (parseError) {
      // console.error("JSON Parse Error:", parseError);
      throw new Error(
        `Invalid JSON response: ${
          parseError instanceof Error ? parseError.message : "Unknown error"
        }`
      );
    }

    return {
      ok: response.ok,
      status: response.status,
      data: data as T,
    };
  } catch (error) {
    // console.error("API Error:", error);

    return {
      ok: false,
      status: 500,
      data: {
        error: "Network Error",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      } as T,
    };
  }
}
