import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface TableInfo {
  table_name: string;
}

export async function GET() {
  try {
    const tables = await prisma.$queryRaw<TableInfo[]>`
      SELECT table_name::text as table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    // Filtrer les tables qui ne commencent pas par "prisma_" ou "_"
    const filteredTables = tables
      .map((table) => table.table_name)
      .filter(
        (tableName) =>
          !tableName.startsWith("prisma_") && !tableName.startsWith("_")
      );

    return NextResponse.json(filteredTables);
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json(
      { error: "Failed to fetch tables" },
      { status: 500 }
    );
  }
}
