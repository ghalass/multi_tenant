import type { IndependentBatchModule } from "@/services/independentBatchImportTypes";

type BatchJob = {
  tenantId: string;
  module: IndependentBatchModule;
  stopRequested: boolean;
};

const jobs = new Map<string, BatchJob>();

export function registerIndependentBatchJob(
  id: string,
  tenantId: string,
  module: IndependentBatchModule,
): boolean {
  if (jobs.has(id)) return false;
  jobs.set(id, { tenantId, module, stopRequested: false });
  return true;
}

export function getIndependentBatchJob(id: string): BatchJob | undefined {
  return jobs.get(id);
}

export function requestIndependentBatchStop(
  id: string,
  tenantId: string,
): boolean {
  const job = jobs.get(id);
  if (!job || job.tenantId !== tenantId) return false;
  job.stopRequested = true;
  return true;
}

export function isIndependentBatchStopRequested(id: string): boolean {
  return jobs.get(id)?.stopRequested ?? true;
}

export function removeIndependentBatchJob(id: string): void {
  jobs.delete(id);
}
