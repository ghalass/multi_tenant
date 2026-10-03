// lib/tables.ts
export const TABLES = [
    "user",
    "site",
    "role",
    "permission",
    "tenant",
] as const;

export type TableName = typeof TABLES[number];