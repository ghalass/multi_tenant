import { NextRequest, NextResponse } from "next/server";

import { BulkImportService } from "@/services/bulkImportService";
import {
  BULK_IMPORT_MODULES,
  type BulkImportRequest,
  type BulkImportModule,
  type BulkImportResponse,
} from "@/services/bulkImportTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Le contenu JSON de la requête est invalide." },
      { status: 400 },
    );
  }

  if (
    !isRecord(body) ||
    typeof body.module !== "string" ||
    !(BULK_IMPORT_MODULES as readonly string[]).includes(body.module) ||
    !Array.isArray(body.rows) ||
    body.rows.length === 0 ||
    !body.rows.every(isRecord) ||
    (body.rowNumbers !== undefined &&
      (!Array.isArray(body.rowNumbers) ||
        body.rowNumbers.length !== body.rows.length ||
        !body.rowNumbers.every(
          (rowNumber) => Number.isInteger(rowNumber) && rowNumber >= 2,
        )))
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Un module et une liste non vide de lignes sont obligatoires.",
      },
      { status: 400 },
    );
  }

  try {
    const bulkRequest: BulkImportRequest = {
      module: body.module as BulkImportModule,
      rows: body.rows,
      rowNumbers: Array.isArray(body.rowNumbers)
        ? body.rowNumbers as number[]
        : undefined,
    };
    const encoder = new TextEncoder();
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller): void {
        const send = (event: unknown): void => {
          if (cancelled || request.signal.aborted) return;
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        const runImport = async (): Promise<void> => {
          try {
            const result = await new BulkImportService().import(
              bulkRequest,
              () => cancelled || request.signal.aborted,
              (
                processed: number,
                total: number,
                rowResult: BulkImportResponse["results"][number],
              ): void => {
                send({ type: "progress", processed, total, result: rowResult });
              },
            );
            send({ type: "done", response: result });
          } catch (error: unknown) {
            console.error("Erreur interne pendant l'import en masse :", error);
            send({
              type: "error",
              message: "Une erreur interne est survenue pendant l'import en masse.",
            });
          } finally {
            if (!cancelled && !request.signal.aborted) controller.close();
          }
        };
        void runImport();
      },
      cancel(): void {
        cancelled = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    console.error("Erreur interne pendant l'import en masse :", error);
    return NextResponse.json(
      { success: false, message: "Une erreur interne est survenue pendant l'import en masse." },
      { status: 500 },
    );
  }
}
