// app/api/auth/roles/route.ts
import { NextResponse } from "next/server";
import { hasRole } from "@/lib/rbac/core";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    // Vérifier si l'utilisateur est admin ou super-admin
    const session = await getSession();
    const userId = session?.userId;

    // Si pas de session ou pas d'userId, retourner false
    if (!session || !userId) {
      return NextResponse.json(
        { isAdmin: false, isSuperAdmin: false, isAdminOrSuperAdmin: false },
        { status: 200 }
      );
    }

    const [isAdmin, isSuperAdmin] = await Promise.all([
      hasRole(userId, "admin"),
      hasRole(userId, "super-admin"),
    ]);

    const isAdminOrSuperAdmin = isAdmin || isSuperAdmin;

    console.log("isAdminOrSuperAdmin:", isAdminOrSuperAdmin);

    // ✅ CORRECTION : Toujours retourner une réponse JSON
    return NextResponse.json({
      isAdmin,
      isSuperAdmin,
      isAdminOrSuperAdmin,
    });
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return NextResponse.json(
      { isAdmin: false, isSuperAdmin: false, isAdminOrSuperAdmin: false },
      { status: 200 }
    );
  }
}
