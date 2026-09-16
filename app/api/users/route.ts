// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { protectCreateRoute, protectReadRoute } from "@/lib/rbac/middleware";
import { getSession, hashPassword } from "@/lib/auth";
import { userCreateSchema } from "@/lib/validations/userSchema";

const the_resource = "user";

// GET - Récupérer tous les utilisateurs
export async function GET(request: NextRequest) {
  try {
    // const protectionError = await protectReadRoute(request, the_resource);
    // if (protectionError) return protectionError;
    const session = await getSession();

    const users = await prisma.user.findMany({
      //where: { tenantId: session?.tenant.id },
      include: {
        roles: true, // Relation directe avec Role
        tenant: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      omit: { password: true },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Erreur GET /api/users:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des utilisateurs" },
      { status: 500 },
    );
  }
}

// POST - Créer un utilisateur
export async function POST(request: NextRequest) {
  try {
    const protectionError = await protectCreateRoute(request, the_resource);
    if (protectionError) return protectionError;
    const session = await getSession();

    const body = await request.json();
    // Validation avec Yup
    try {
      await userCreateSchema.validate(body, { abortEarly: false });
    } catch (validationError: any) {
      return NextResponse.json(
        {
          error: "Erreur de validation",
          details: validationError.errors,
        },
        { status: 400 },
      );
    }

    const { email, name, password, roles, active } = body;

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { tenantId_email: { email, tenantId: session.tenant.id! } },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Cet email est déjà utilisé" },
        { status: 400 },
      );
    }

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(password);

    // Vérifier que les rôles existent (optionnel mais recommandé)
    if (roles && Array.isArray(roles) && roles.length > 0) {
      const existingRoles = await prisma.role.findMany({
        where: {
          id: { in: roles },
        },
        select: { id: true },
      });

      // Vérifier si certains rôles n'existent pas
      const existingRoleIds = existingRoles.map((r) => r.id);
      const nonExistentRoles = roles.filter(
        (roleId: string) => !existingRoleIds.includes(roleId),
      );

      if (nonExistentRoles.length > 0) {
        return NextResponse.json(
          {
            message: `Les rôles suivants n'existent pas: ${nonExistentRoles.join(
              ", ",
            )}`,
          },
          { status: 400 },
        );
      }
    }

    // Préparer les données de création
    const createData: any = {
      email: email.trim(),
      name: name.trim(),
      password: hashedPassword,
      active: active !== undefined ? Boolean(active) : true, // Par défaut actif
    };

    // Ajouter les rôles si spécifiés
    if (roles && Array.isArray(roles) && roles.length > 0) {
      createData.roles = {
        connect: roles.map((roleId: string) => ({ id: roleId })),
      };
    }

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: createData,
      include: {
        roles: true,
      },
    });

    // Exclure le mot de passe de la réponse
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/users:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la création de l'utilisateur",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
