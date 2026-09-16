import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  protectDeleteRoute,
  protectReadRoute,
  protectUpdateRoute,
} from "@/lib/rbac/middleware";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

const the_resource = "permission";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const protectionError = await protectReadRoute(request, the_resource);
    if (protectionError) return protectionError;

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: "ID de la permission requis" },
        { status: 400 }
      );
    }

    const permission = await prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      return NextResponse.json(
        { message: "Permission non trouvée" },
        { status: 404 }
      );
    }

    console.log("✅ Permission found:", permission.id);
    return NextResponse.json(permission);
  } catch (error) {
    console.error("❌ Error fetching permission:", error);
    return NextResponse.json(
      { message: "Erreur lors de la récupération de la permission" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const protectionError = await protectUpdateRoute(request, the_resource);
    if (protectionError) return protectionError;

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: "ID de la permission requis" },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log("Request body:", body);

    const { name, resource, action, description } = body;

    // Validation: au moins un champ à mettre à jour
    if (
      name === undefined &&
      resource === undefined &&
      action === undefined &&
      description === undefined
    ) {
      return NextResponse.json(
        { message: "Au moins un champ à mettre à jour est requis" },
        { status: 400 }
      );
    }

    // Valider l'action si elle est fournie
    if (action !== undefined) {
      const validActions = ["create", "read", "update", "delete"];
      if (!validActions.includes(action)) {
        return NextResponse.json(
          {
            message: `Action invalide. Les actions valides sont: ${validActions.join(
              ", "
            )}`,
          },
          { status: 400 }
        );
      }
    }

    // Vérifier si la permission existe
    const existingPermission = await prisma.permission.findUnique({
      where: { id },
    });

    if (!existingPermission) {
      console.error("Permission not found for ID:", id);
      return NextResponse.json(
        { message: "Permission non trouvée" },
        { status: 404 }
      );
    }

    // Préparer les données de mise à jour
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (resource !== undefined) updateData.resource = resource.trim();
    if (action !== undefined) updateData.action = action;
    if (description !== undefined) {
      updateData.description = description.trim() || null;
    }

    // Mettre à jour la permission
    const permission = await prisma.permission.update({
      where: { id },
      data: updateData,
    });

    console.log("✅ Permission updated successfully:", permission.id);
    return NextResponse.json(permission);
  } catch (error) {
    console.error("❌ Error updating permission:", error);
    // Gestion générique des erreurs
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          {
            message:
              "Une permission avec ce nom ou cette combinaison ressource/action existe déjà",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { message: "Erreur lors de la modification de la permission" },
      { status: 500 }
    );
  }
}

//#region DELETE
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const protectionError = await protectDeleteRoute(request, the_resource);
    if (protectionError) return protectionError;

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: "ID de la permission requis" },
        { status: 400 }
      );
    }

    // Vérifier si la permission existe
    const existingPermission = await prisma.permission.findUnique({
      where: { id },
    });

    if (!existingPermission) {
      return NextResponse.json(
        { message: "Permission non trouvée" },
        { status: 404 }
      );
    }

    // NOTE: Avec votre schéma actuel, vous avez une relation Many-to-Many directe
    // entre Role et Permission (roles: Role[] dans Permission)
    // Donc pas de table RolePermission intermédiaire

    // Vérifier si la permission est utilisée dans des rôles
    const rolesWithPermission = await prisma.role.findMany({
      where: {
        permissions: {
          some: {
            id: id,
          },
        },
      },
      select: {
        name: true,
      },
    });

    if (rolesWithPermission.length > 0) {
      const roleNames = rolesWithPermission.map((role) => role.name).join(", ");
      return NextResponse.json(
        {
          message: `Cette permission est utilisée dans le(s) rôle(s): ${roleNames}. Veuillez d'abord la retirer de ces rôles.`,
        },
        { status: 400 }
      );
    }

    // Supprimer la permission
    await prisma.permission.delete({
      where: { id },
    });

    console.log("✅ Permission deleted successfully:", id);
    return NextResponse.json({ message: "Permission supprimée avec succès" });
  } catch (error) {
    console.error("❌ Error deleting permission:", error);
    return NextResponse.json(
      { message: "Erreur lors de la suppression de la permission" },
      { status: 500 }
    );
  }
}
//#endregion
