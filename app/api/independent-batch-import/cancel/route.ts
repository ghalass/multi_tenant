import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { RESOURCE } from "@/lib/constantes";
import { ACTION } from "@/lib/enums";
import { guard } from "@/lib/rbac/middleware";
import {
  getIndependentBatchJob,
  requestIndependentBatchStop,
} from "@/services/independentBatchImportJobs";
import type { IndependentBatchModule } from "@/services/independentBatchImportTypes";

const PERMISSION_RESOURCE: Record<IndependentBatchModule, string> = {
  sites: RESOURCE.SITE,
  typeparcs: RESOURCE.TYPEPARC,
  parcs: RESOURCE.PARC,
  engins: RESOURCE.ENGIN,
  typepannes: RESOURCE.TYPEPANNE,
  pannes: RESOURCE.PANNE,
  type_lubrifiants: RESOURCE.TYPE_LUBRIFIANT,
  lubrifiants: RESOURCE.LUBRIFIANT,
  saisie_lubrifiants: RESOURCE.SAISIE_LUBRIFIANT,
  saisie_hrm: RESOURCE.SAISIE_HRM,
  saisie_hims: RESOURCE.SAISIE_HIM,
  backlogs: RESOURCE.BACKLOG,
  objectifs: RESOURCE.OBJECTIF,
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Le contenu JSON reçu est invalide." },
      { status: 400 },
    );
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("jobId" in body) ||
    typeof body.jobId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(body.jobId)
  ) {
    return NextResponse.json(
      { success: false, message: "Identifiant de traitement invalide." },
      { status: 400 },
    );
  }

  const job = getIndependentBatchJob(body.jobId);
  if (!job) {
    return NextResponse.json(
      { success: false, message: "Le traitement est déjà terminé ou introuvable." },
      { status: 404 },
    );
  }
  const session = await getSession();
  if (!session.currentTenantId || session.currentTenantId !== job.tenantId) {
    return NextResponse.json(
      { success: false, message: "Vous ne pouvez pas arrêter ce traitement." },
      { status: 403 },
    );
  }
  const permission = await guard(ACTION.IMPORT, PERMISSION_RESOURCE[job.module]);
  if (!permission.success) {
    return NextResponse.json(
      { success: false, message: permission.message },
      { status: 403 },
    );
  }

  const stopped = requestIndependentBatchStop(body.jobId, session.currentTenantId);
  return NextResponse.json({ success: stopped });
}
