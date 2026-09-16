// app/api/dashboard/stats/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const tenantId = (await getSession()).tenant.id!;
    const [totalUsers, totalRoles, totalPermissions, activeSites] =
      await Promise.all([
        prisma.user.count({ where: { tenantId } }),
        prisma.role.count({ where: { tenantId } }),
        prisma.permission.count({ where: { tenantId } }),
        prisma.site.count({ where: { active: true, tenantId } }),
      ]);

    return NextResponse.json({
      totalUsers,
      totalRoles,
      totalPermissions,
      activeSites,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
}
