export const INDEPENDENT_BATCH_MODULES = [
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

export type IndependentBatchModule = (typeof INDEPENDENT_BATCH_MODULES)[number];

export type IndependentBatchRequest = {
  module: IndependentBatchModule;
  rows: Record<string, unknown>[];
  rowNumbers: number[];
};

export type IndependentBatchRowResult = {
  row: number;
  success: boolean;
  message: string;
};

export type IndependentBatchSummary = {
  total: number;
  processed: number;
  success: number;
  errors: number;
  cancelled: boolean;
};
