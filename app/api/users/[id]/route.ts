// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userUpdateSchema } from "@/lib/validations/userSchema";
import {
  protectDeleteRoute,
  protectReadRoute,
  protectUpdateRoute,
} from "@/lib/rbac/middleware";
import { getSession, hashPassword } from "@/lib/auth";
import { isAdmin, isSuperAdmin } from "@/lib/rbac/core";

const the_resource = "user";

// GET - Récupérer un utilisateur spécifique
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
        { message: "ID de l'utilisateur requis" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id, tenantId: (await getSession())?.tenant.id },
      include: {
        roles: true, // Relation directe avec Role
      },
      omit: { password: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Exclure le mot de passe de la réponse

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { message: "Erreur lors de la récupération de l'utilisateur" },
      { status: 500 }
    );
  }
}

// PATCH - Mettre à jour un utilisateur
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const protectionError = await protectUpdateRoute(request, the_resource);
    if (protectionError) return protectionError;

    const session = await getSession();
    if (!session?.tenant.id) {
      return NextResponse.json(
        { message: "Ce nom d'entreprise n'existe pas" },
        { status: 404 }
      );
    }
    // Vérifier si le tenant existe déjà
    const tenant = await prisma.tenant.findUnique({
      where: { id: session?.tenant.id },
    });
    if (!tenant) {
      return NextResponse.json(
        { message: "Ce nom d'entreprise n'existe pas" },
        { status: 404 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    // Validation avec Yup
    try {
      await userUpdateSchema.validate(body, { abortEarly: false });
    } catch (validationError: any) {
      return NextResponse.json(
        {
          error: "Erreur de validation",
          details: validationError.errors,
        },
        { status: 400 }
      );
    }

    const { email, name, password, roles, active } = body;

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { message: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: {
          tenantId_email: { email, tenantId: session.tenant.id },
        },
      });

      if (emailExists) {
        return NextResponse.json(
          { message: "Cet email est déjà utilisé" },
          { status: 400 }
        );
      }
    }

    // Validation: au moins un champ à mettre à jour
    if (
      email === undefined &&
      name === undefined &&
      password === undefined &&
      roles === undefined &&
      active === undefined
    ) {
      return NextResponse.json(
        { message: "Au moins un champ à mettre à jour est requis" },
        { status: 400 }
      );
    }

    // Préparer les données de mise à jour
    const updateData: any = {};

    if (email !== undefined) {
      updateData.email = email.trim();
    }

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (active !== undefined) {
      updateData.active = Boolean(active);
    }

    // Hasher le nouveau mot de passe si fourni et non vide
    if (password !== undefined && password.trim() !== "") {
      if (password.length < 6) {
        return NextResponse.json(
          { message: "Le mot de passe doit contenir au moins 6 caractères" },
          { status: 400 }
        );
      }

      const hashedPassword = await hashPassword(password);
      updateData.password = hashedPassword;
    }

    // Gestion des rôles
    if (roles !== undefined) {
      // Vérifier que roles est un tableau
      if (!Array.isArray(roles)) {
        return NextResponse.json(
          { message: "Le champ 'roles' doit être un tableau" },
          { status: 400 }
        );
      }

      // Récupérer les rôles actuels
      const currentRoleIds = existingUser.roles.map((role) => role.id);

      // Identifier les rôles à ajouter et à retirer
      const newRoleIds = roles;
      const rolesToAdd = newRoleIds.filter(
        (roleId: string) => !currentRoleIds.includes(roleId)
      );
      const rolesToRemove = currentRoleIds.filter(
        (roleId: string) => !newRoleIds.includes(roleId)
      );

      // Vérifier que les rôles existent
      if (rolesToAdd.length > 0) {
        const existingRoles = await prisma.role.findMany({
          where: {
            id: { in: rolesToAdd },
          },
          select: { id: true },
        });

        const existingRoleIds = existingRoles.map((r) => r.id);
        const nonExistentRoles = rolesToAdd.filter(
          (roleId: string) => !existingRoleIds.includes(roleId)
        );

        if (nonExistentRoles.length > 0) {
          return NextResponse.json(
            {
              message: `Les rôles suivants n'existent pas: ${nonExistentRoles.join(
                ", "
              )}`,
            },
            { status: 400 }
          );
        }
      }

      // Préparer les opérations sur les rôles
      const roleOperations: any = {};

      if (rolesToAdd.length > 0) {
        roleOperations.connect = rolesToAdd.map((roleId: string) => ({
          id: roleId,
        }));
      }

      if (rolesToRemove.length > 0) {
        roleOperations.disconnect = rolesToRemove.map((roleId: string) => ({
          id: roleId,
        }));
      }

      // Ajouter les opérations de rôles aux données de mise à jour
      if (Object.keys(roleOperations).length > 0) {
        updateData.roles = roleOperations;
      }
    }

    // Mettre à jour l'utilisateur
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        roles: true,
      },
    });

    // Exclure le mot de passe de la réponse
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("Erreur PATCH /api/users/[id]:", error);
    return NextResponse.json(
      {
        message: "Erreur lors de la mise à jour de l'utilisateur",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
// DELETE - Supprimer un utilisateur
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const protectionError = await protectDeleteRoute(request, the_resource);
    if (protectionError) return protectionError;

    const { id } = await context.params;

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id, tenantId: (await getSession())?.tenant.id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { message: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Vérifier si l'utilisateur tente de se supprimer lui-même
    const authHeader = request.headers.get("authorization");
    const session = await getSession();

    const connectedUser = session?.userId;
    // const connectedUser_is_Admin = await isAdmin(connectedUser);
    const connectedUser_is_SuperAdmin = session?.isSuperAdmin;
    const toDelete_SuperAdmin = await isSuperAdmin(id); // utilisateur qui sera supprimer isSuperAdmin ?
    const toDelete_Admin = await isAdmin(id); // utilisateur qui sera supprimer isAdmin ?

    // interdire de supprimer votre propre compte
    if (connectedUser === id) {
      return NextResponse.json(
        { message: "Vous ne pouvez pas supprimer votre propre compte." },
        { status: 400 }
      );
    }

    // interdire aux utilisateurs non super-admin de supprimer un super-admin
    if (toDelete_SuperAdmin && !connectedUser_is_SuperAdmin) {
      return NextResponse.json(
        { message: "Vous ne pouvez pas supprimer un compte d'un super admin." },
        { status: 400 }
      );
    }

    // seul super-admin peut suprimer un admin
    if (toDelete_Admin && !connectedUser_is_SuperAdmin) {
      return NextResponse.json(
        {
          message:
            "Vous ne pouvez pas supprimer un compte d'un admin, seul un super admin peut suprimer un admin.",
        },
        { status: 400 }
      );
    }

    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        // Ici vous devriez décoder le JWT pour obtenir l'ID de l'utilisateur connecté
        // Pour l'instant, c'est un exemple - à adapter à votre système d'authentification
        if (existingUser.email.includes("admin")) {
          return NextResponse.json(
            {
              message:
                "Impossible de supprimer un compte administrateur via cette interface",
            },
            { status: 400 }
          );
        }
      } catch (error) {
        // Ne pas bloquer la suppression si erreur de décodage
        console.warn("Erreur lors de la vérification du token:", error);
      }
    }

    // Supprimer l'utilisateur (les rôles seront automatiquement déconnectés)
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Utilisateur supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur DELETE /api/users/[id]:", error);
    return NextResponse.json(
      {
        message: "Erreur lors de la suppression de l'utilisateur",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
