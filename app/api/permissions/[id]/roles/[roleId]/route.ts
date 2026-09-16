// app/api/permissions/[id]/roles/[roleId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  assignPermissionToRole,
  removePermissionFromRole,
} from "@/lib/rbac/core";
import { protectDeleteRoute, protectUpdateRoute } from "@/lib/rbac/middleware";
import { getSession } from "@/lib/auth";

const the_resource = "permission";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; roleId: string }> } // ✅ Changé: permissionId → id
) {
  // 🔒 Vérifier les permissions
  const protectionError = await protectUpdateRoute(request, the_resource);
  if (protectionError) return protectionError;
  const tenantId = (await getSession()).tenant.id!;
  const { id: permissionId, roleId } = await context.params; // ✅ Destructuration avec alias

  try {
    await assignPermissionToRole(roleId, permissionId);

    return NextResponse.json({
      message: "Permission assignée au rôle avec succès",
    });
  } catch (err) {
    console.error(err);

    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return NextResponse.json(
        { message: "Cette permission est déjà assignée à ce rôle" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Impossible d'assigner la permission au rôle" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; roleId: string }> } // ✅ Changé: permissionId → id
) {
  // 🔒 Vérifier les permissions
  const protectionError = await protectDeleteRoute(request, the_resource);
  if (protectionError) return protectionError;

  const { id: permissionId, roleId } = await context.params; // ✅ Destructuration avec alias

  try {
    await removePermissionFromRole(roleId, permissionId);

    return NextResponse.json({
      message: "Permission retirée du rôle avec succès",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Impossible de retirer la permission du rôle" },
      { status: 500 }
    );
  }
}
