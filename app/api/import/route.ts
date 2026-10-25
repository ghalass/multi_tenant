// app/api/import/route.ts

import { sleep } from "@/lib/utils";
import { ImportService } from "@/services/importService";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // 1. Vérifier le JSON reçu
  let body: { sheetName?: unknown; data?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Le contenu JSON de la requête est invalide.",
      },
      { status: 400 },
    );
  }

  // 2. Valider les champs obligatoires
  const { sheetName, data } = body ?? {};

  if (
    typeof sheetName !== "string" ||
    !sheetName.trim() ||
    data === undefined ||
    data === null
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Le nom de la feuille et les données sont obligatoires.",
      },
      { status: 400 },
    );
  }

  try {
    await sleep();

    // 3. Exécuter l'import
    const importService = new ImportService();
    const results = await importService.importData(sheetName, data);

    const successCount = results.filter(
      (result) => result.success,
    ).length;

    const errorCount = results.filter(
      (result) => !result.success,
    ).length;

    // 4. Retourner le bilan de l'import
    return NextResponse.json({
      success: errorCount === 0,
      message: `Import terminé : ${successCount} succès, ${errorCount} erreurs`,
      data: results,
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount,
      },
    });
  } catch (error: unknown) {
    // Détails conservés uniquement dans les journaux du serveur.
    console.error("Erreur interne dans le contrôleur d'import :", error);

    return NextResponse.json(
      {
        success: false,
        message: "Une erreur interne est survenue pendant l'import.",
      },
      { status: 500 },
    );
  }
}