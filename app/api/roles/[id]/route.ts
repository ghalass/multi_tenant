// app/api/roles/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  protectDeleteRoute,
  protectReadRoute,
  protectUpdateRoute,
} from "@/lib/rbac/middleware";
import { getSession } from "@/lib/auth";

const the_resource = "role";

// GET - Récupérer un rôle spécifique
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const protectionError = await protectReadRoute(request, the_resource);
    if (protectionError) return protectionError;
    const tenantId = (await getSession()).tenant.id!;
    const { id } = await context.params;
    if (!id || id === "roles") {
      return NextResponse.json(
        { message: "ID du rôle requis" },
        { status: 400 }
      );
    }
    const session = await getSession();
    const role = await prisma.role.findUnique({
      where: { id, tenantId },
      include: {
        permissions: true, // Relation directe avec Permission
        users: true, // Relation directe avec User
      },
    });

    if (!role) {
      return NextResponse.json({ message: "Rôle non trouvé" }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      { message: "Erreur lors de la récupération du rôle" },
      { status: 500 }
    );
  }
}

// PUT - Modifier un rôle
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const protectionError = await protectUpdateRoute(request, the_resource);
    if (protectionError) return protectionError;
    const tenantId = (await getSession()).tenant.id!;
    const { id } = await context.params;

    if (!id || id === "roles") {
      return NextResponse.json(
        { message: "ID du rôle requis" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const { name, description, permissions } = body; // Ajout de 'description'

    // Validation
    if (
      name === undefined &&
      description === undefined &&
      permissions === undefined
    ) {
      return NextResponse.json(
        { message: "Au moins un champ à mettre à jour est requis" },
        { status: 400 }
      );
    }

    const existingRole = await prisma.role.findUnique({
      where: { id, tenantId },
      include: {
        permissions: true,
        users: true,
      },
    });

    if (!existingRole) {
      return NextResponse.json({ message: "Rôle non trouvé" }, { status: 404 });
    }

    // Préparer les données de mise à jour
    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      // Si description est une chaîne vide, on la met à null
      updateData.description =
        description.trim() === "" ? null : description.trim();
    }

    // Mettre à jour le nom et la description si fournis
    if (Object.keys(updateData).length > 0) {
      await prisma.role.update({
        where: { id, tenantId },
        data: updateData,
      });
    }

    // Mettre à jour les permissions si fournies
    if (permissions !== undefined) {
      // Récupérer les permissions actuelles
      const currentPermissionIds = existingRole.permissions.map((p) => p.id);

      // Identifier les permissions à ajouter et à retirer
      const newPermissionIds = Array.isArray(permissions) ? permissions : [];
      const permissionsToAdd = newPermissionIds.filter(
        (pid: string) => !currentPermissionIds.includes(pid)
      );
      const permissionsToRemove = currentPermissionIds.filter(
        (pid: string) => !newPermissionIds.includes(pid)
      );

      // Préparer les opérations sur les permissions
      const permissionOperations: any = {};

      if (permissionsToAdd.length > 0) {
        permissionOperations.connect = permissionsToAdd.map((pid: string) => ({
          id: pid,
        }));
      }

      if (permissionsToRemove.length > 0) {
        permissionOperations.disconnect = permissionsToRemove.map(
          (pid: string) => ({ id: pid })
        );
      }

      // Mettre à jour les permissions si nécessaire
      if (Object.keys(permissionOperations).length > 0) {
        await prisma.role.update({
          where: { id },
          data: {
            permissions: permissionOperations,
          },
        });
      }
    }

    // Récupérer le rôle mis à jour avec ses relations
    const updatedRole = await prisma.role.findUnique({
      where: { id, tenantId },
      include: {
        permissions: true,
        users: true,
      },
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error("Error updating role:", error);
    // Gestion des erreurs génériques
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { message: "Un rôle avec ce nom existe déjà" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Erreur lors de la modification du rôle" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un rôle
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const protectionError = await protectDeleteRoute(request, the_resource);
    if (protectionError) return protectionError;
    const tenantId = (await getSession()).tenant.id!;
    const { id } = await context.params;

    if (!id || id === "roles") {
      return NextResponse.json(
        { message: "ID du rôle requis" },
        { status: 400 }
      );
    }

    const existingRole = await prisma.role.findUnique({
      where: { id, tenantId },
      include: {
        users: true, // Vérifier les utilisateurs directement liés
        permissions: true, // Optionnel: voir les permissions associées
      },
    });

    if (!existingRole) {
      return NextResponse.json({ message: "Rôle non trouvé" }, { status: 404 });
    }

    // Vérifier si le rôle est utilisé par des utilisateurs
    if (existingRole.users && existingRole.users.length > 0) {
      const userCount = existingRole.users.length;
      return NextResponse.json(
        {
          message: `Ce rôle est utilisé par ${userCount} utilisateur(s). Vous ne pouvez pas le supprimer tant qu'il est attribué à des utilisateurs.`,
        },
        { status: 400 }
      );
    }

    // Note: Les permissions seront automatiquement déconnectées
    // grâce à la relation Many-to-Many (cascade par défaut)
    await prisma.role.delete({
      where: { id, tenantId },
    });

    return NextResponse.json({
      message: "Rôle supprimé avec succès",
    });
  } catch (error) {
    console.error("Error deleting role:", error);

    return NextResponse.json(
      { message: "Erreur lors de la suppression du rôle" },
      { status: 500 }
    );
  }
}
