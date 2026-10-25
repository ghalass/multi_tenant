// app/api/import/route.ts
import { sleep } from "@/lib/utils";
import { ImportService } from "@/services/importService";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    await sleep();
    const { sheetName, data } = await request.json();

    if (!sheetName || !data) {
      return NextResponse.json(
        {
          success: false,
          message: "Sheet name and data are required",
        },
        { status: 400 }
      );
    }

    const importService = new ImportService();
    const results = await importService.importData(sheetName, data);

    const successCount = results?.filter((r: any) => r.success).length;
    const errorCount = results?.filter((r: any) => !r.success).length;

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
  } catch (error: any) {
    console.error("Error in import controller:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
