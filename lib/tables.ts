// lib/tables.ts
export const TABLES = [
    "user",
    "site",
    "typeparc",
    "parc",
    "engin",
    "typepanne",
    "panne",
    "role",
    "permission",
    "tenant",
    "backlog",
] as const;

export type TableName = typeof TABLES[number];