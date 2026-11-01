export const BULK_IMPORT_MODULES = [
  "sites",
  "typeparcs",
  "parcs",
  "engins",
  "typepannes",
  "pannes",
  "saisie_hrm",
  "saisie_hims",
  "backlogs",
  "objectifs",
] as const;

export type BulkImportModule = (typeof BULK_IMPORT_MODULES)[number];

export type BulkImportRequest = {
  module: BulkImportModule;
  rows: Record<string, unknown>[];
  rowNumbers?: number[];
};

export type BulkImportRowResult = {
  row: number;
  success: boolean;
  message: string;
};

export type BulkImportResponse = {
  success: boolean;
  message: string;
  results: BulkImportRowResult[];
  summary: {
    total: number;
    success: number;
    errors: number;
  };
};
