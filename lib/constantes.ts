// lib/constantes.ts

import { FR, MR } from "country-flag-icons/react/3x2";

export const APP_NAME = "APP";
export const DELAY_SIMULATION = 0 // zero in prod

export const RESOURCE = {
    SITE: "site",
    USER: "user",
    ROLE: "role",
    PERMISSION: "permission",
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