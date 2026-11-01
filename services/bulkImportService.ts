import { ImportService } from "@/services/importService";
import {
  BULK_IMPORT_MODULES,
  type BulkImportModule,
  type BulkImportRequest,
  type BulkImportResponse,
} from "@/services/bulkImportTypes";

function isBulkImportModule(value: string): value is BulkImportModule {
  return (BULK_IMPORT_MODULES as readonly string[]).includes(value);
}

function summarizeRow(
  row: number,
  result: { success: boolean; message: string }[],
): BulkImportResponse["results"][number] {
  const success = result.length > 0 && result.every((item) => item.success);
  const message = (success ? result.slice(0, 1) : result.filter((item) => !item.success))
    .map((item) => item.message)
    .filter(Boolean)
    .join(" ; ");

  return {
    row,
    success,
    message: message || (success ? "Import réussi." : "Échec de l'import."),
  };
}

function formatRowError(
  module: BulkImportModule,
  excelRow: number,
  row: Record<string, unknown>,
  message: string,
): string {
  const context: string[] = [`Ligne Excel ${excelRow}`];
  const engineName =
    row.enginName ?? row.engin ?? (module === "engins" ? row.name : undefined);
  if (engineName !== undefined && String(engineName).trim()) {
    context.push(`Engin : ${String(engineName).trim()}`);
  }

  for (const field of ["du", "dateDetection", "dateExecution"] as const) {
    const value = row[field];
    if (value !== undefined && value !== null && String(value).trim()) {
      context.push(`${field} : ${String(value).trim()}`);
    }
  }

  return `${context.join(" | ")} — ${message}`;
}

export class BulkImportService {
  async import(
    request: BulkImportRequest,
    shouldStop: () => boolean = () => false,
    onProgress?: (
      processed: number,
      total: number,
      result: BulkImportResponse["results"][number],
    ) => void,
  ): Promise<BulkImportResponse> {
    if (!isBulkImportModule(request.module)) {
      throw new Error(`Module d'import en masse non pris en charge : ${request.module}`);
    }

    const importer = new ImportService();
    const results: BulkImportResponse["results"] = [];

    for (const [index, row] of request.rows.entries()) {
      if (shouldStop()) break;
      const excelRow = request.rowNumbers?.[index] ?? index + 2;
      try {
        const rowResult = await importer.importData(request.module, row);
        const rowSummary = summarizeRow(excelRow, rowResult);
        if (!rowSummary.success) {
          rowSummary.message = formatRowError(
            request.module,
            excelRow,
            row,
            rowSummary.message,
          );
        }
        results.push(rowSummary);
        onProgress?.(index + 1, request.rows.length, rowSummary);
      } catch (error: unknown) {
        const rowSummary = {
          row: excelRow,
          success: false,
          message: formatRowError(
            request.module,
            excelRow,
            row,
            error instanceof Error
              ? error.message
              : "Erreur inattendue pendant l'import de cette ligne.",
          ),
        };
        results.push(rowSummary);
        onProgress?.(index + 1, request.rows.length, rowSummary);
      }
    }

    const successCount = results.filter((result) => result.success).length;
    const errorCount = results.length - successCount;

    return {
      success: errorCount === 0,
      message: `Import en masse terminé : ${successCount} réussite(s), ${errorCount} erreur(s).`,
      results,
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount,
      },
    };
  }
}
