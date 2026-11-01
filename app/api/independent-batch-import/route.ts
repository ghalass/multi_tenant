import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { RESOURCE } from "@/lib/constantes";
import { ACTION } from "@/lib/enums";
import { guard } from "@/lib/rbac/middleware";
import { IndependentBatchImportService } from "@/services/independentBatchImportService";
import {
  isIndependentBatchStopRequested,
  registerIndependentBatchJob,
  removeIndependentBatchJob,
} from "@/services/independentBatchImportJobs";
import {
  INDEPENDENT_BATCH_MODULES,
  type IndependentBatchModule,
  type IndependentBatchRequest,
} from "@/services/independentBatchImportTypes";

const PERMISSION_RESOURCE: Record<IndependentBatchModule, string> = {
  sites: RESOURCE.SITE,
  typeparcs: RESOURCE.TYPEPARC,
  parcs: RESOURCE.PARC,
  engins: RESOURCE.ENGIN,
  typepannes: RESOURCE.TYPEPANNE,
  pannes: RESOURCE.PANNE,
  saisie_hrm: RESOURCE.SAISIE_HRM,
  saisie_hims: RESOURCE.SAISIE_HIM,
  backlogs: RESOURCE.BACKLOG,
  objectifs: RESOURCE.OBJECTIF,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Le contenu JSON reçu est invalide." },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { success: false, message: "Le contenu de la requête est invalide." },
      { status: 400 },
    );
  }

  if (
    typeof body.module !== "string" ||
    !(INDEPENDENT_BATCH_MODULES as readonly string[]).includes(body.module)
  ) {
    return NextResponse.json(
      { success: false, message: "Le module sélectionné n'est pas pris en charge." },
      { status: 400 },
    );
  }
  if (
    !Array.isArray(body.rows) ||
    body.rows.length === 0 ||
    body.rows.length > 100000 ||
    !body.rows.every(isRecord)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Le fichier doit contenir entre 1 et 100 000 lignes de données valides.",
      },
      { status: 400 },
    );
  }

  const rowNumbersValid =
    Array.isArray(body.rowNumbers) &&
    body.rowNumbers.length === body.rows.length &&
    body.rowNumbers.every(
      (rowNumber) => Number.isInteger(rowNumber) && rowNumber >= 2,
    );
  if (!rowNumbersValid) {
    console.warn(
      "Numéros de lignes Excel absents ou invalides; utilisation des numéros séquentiels.",
    );
  }

  const importModule = body.module as IndependentBatchModule;
  if (typeof body.jobId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.jobId)) {
    return NextResponse.json(
      { success: false, message: "Identifiant de traitement invalide." },
      { status: 400 },
    );
  }
  const permission = await guard(ACTION.IMPORT, PERMISSION_RESOURCE[importModule]);
  if (!permission.success) {
    return NextResponse.json(
      { success: false, message: permission.message },
      { status: 403 },
    );
  }

  const session = await getSession();
  if (!session.currentTenantId) {
    return NextResponse.json(
      { success: false, message: "Sélectionnez un tenant avant de lancer l'import." },
      { status: 400 },
    );
  }

  const batchRequest: IndependentBatchRequest = {
    module: importModule,
    rows: body.rows,
    rowNumbers: rowNumbersValid
      ? body.rowNumbers as number[]
      : body.rows.map((_, index) => index + 2),
  };
  const tenantId = session.currentTenantId;
  if (!registerIndependentBatchJob(body.jobId, tenantId, importModule)) {
    return NextResponse.json(
      { success: false, message: "Cet identifiant de traitement est déjà utilisé." },
      { status: 409 },
    );
  }
  const jobId = body.jobId;
  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller): void {
      const send = (event: unknown): void => {
        if (cancelled || request.signal.aborted) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      const run = async (): Promise<void> => {
        try {
          const summary = await new IndependentBatchImportService().import(
            batchRequest,
            tenantId,
            () => cancelled || request.signal.aborted || isIndependentBatchStopRequested(jobId),
            (progress) => send({ type: "batch-progress", ...progress }),
          );
          send({ type: "done", summary });
        } catch (error: unknown) {
          console.error("Erreur du moteur d'import indépendant par lots :", error);
          send({
            type: "error",
            message: "Le traitement du lot a rencontré une erreur interne.",
          });
        } finally {
          removeIndependentBatchJob(jobId);
          if (!cancelled && !request.signal.aborted) controller.close();
        }
      };

      void run();
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
}
