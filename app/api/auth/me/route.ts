// app/api/auth/me/route.ts - Version corrigée

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, logoutAction } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();

    if (!session.isLoggedIn) {
      return NextResponse.json(null, { status: 401 });
    }

    if (!session.userId) {
      return NextResponse.json(null, { status: 401 });
    }

    // Recherche de l'utilisateur avec ses rôles selon le schéma
    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        isOwner: true,
        isSuperAdmin: true,
        // Relation directe avec Role
        roles: {
          select: {
            id: true,
            name: true,
            // Relation implicite avec Permission
            permissions: {
              select: {
                id: true,
                resource: true,
                action: true,
              },
            },
          },
        },
        tenant: {
          select: { name: true, id: true },
        },
      },
    });

    if (!user) {
      await logoutAction();
      return NextResponse.json(null, { status: 404 });
    }

    // Extraire les permissions de tous les rôles
    const userPermissions = user.roles.flatMap((role) =>
      role.permissions.map((permission) => ({
        ...permission,
        roleId: role.id,
        roleName: role.name,
      })),
    );

    // Construire la réponse
    const userResponse = {
      ...user,
      permissions: userPermissions,
      roleNames: user.roles.map((role) => role.name),
    };
    return NextResponse.json(userResponse);
  } catch (error) {
    // console.error(
    //   "Erreur lors de la récupération de l'utilisateur connecté:",
    //   error
    // );
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
