// lib/constantes.ts

import { FR, MR } from "country-flag-icons/react/3x2";

export const APP_NAME = "APP";
export const DELAY_SIMULATION = 0 // zero in prod

export const RESOURCE = {
    SITE: "site",
    USER: "user",
    ROLE: "role",
    PERMISSION: "permission",
    TYPEPARC: "typeparc",
    PARC: "parc",
    ENGIN: "engin",
    TYPEPANNE: "typepanne",
    PANNE: "panne",
    SAISIE_HRM: "saisie_hrm",
    SAISIE_HIM: "saisie_him",
    RAPPORT: "rapport"
};

export const PAGINATION_SETTINGS = {
    itemsPerPage: 10,
    perPageOptions: [5, 10, 20, 50, 100],
}

export const ACTIVE = {
    YES: "active",
    NO: "inactive",
};

export const LANGUAGES = [
    {
        name: 'Français',
        locale: 'fr',
        flag: FR,
        direction: "ltr",
    }, {
        name: 'عربية',
        locale: 'ar',
        flag: MR,
        direction: "rtl",
    },
] as const

export const IMPORT_RESOURCES: Record<string, string> = {
    SITES: "sites",
    TYPEPARCS: "typeparcs",
    PARCS: "parcs",
    ENGINS: "engins",
    TYPEPANNES: "typepannes",
    PANNES: "pannes",
    SAISIE_HRM: "saisie_hrm",
    SAISIE_HIMS: "saisie_hims",
};