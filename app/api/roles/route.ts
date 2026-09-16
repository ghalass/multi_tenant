// app/api/roles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { roleCreateSchema } from "@/lib/validations/roleSchema";
import { protectCreateRoute, protectReadRoute } from "@/lib/rbac/middleware";
import { getSession } from "@/lib/auth";

const the_resource = "role";

// GET - Récupérer tous les rôles
export async function GET(request: NextRequest) {
  try {
    const protectionError = await protectReadRoute(request, the_resource);
    if (protectionError) return protectionError;
    const tenantId = (await getSession()).tenant.id!;

    const roles = await prisma.role.findMany({
      where: { tenantId },
      include: {
        permissions: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error("Erreur GET /api/roles:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des rôles" },
      { status: 500 }
    );
  }
}

// POST - Créer un rôle
export async function POST(request: NextRequest) {
  try {
    const protectionError = await protectCreateRoute(request, the_resource);
    if (protectionError) return protectionError;
    const tenantId = (await getSession()).tenant.id!;

    const body = await request.json();

    // Validation avec Yup
    try {
      await roleCreateSchema.validate(body, { abortEarly: false });
    } catch (validationError: any) {
      return NextResponse.json(
        {
          error: "Erreur de validation",
          details: validationError.errors,
        },
        { status: 400 }
      );
    }

    const { name, description, permissions } = body;
    console.log(body);

    // Vérifier si le nom existe déjà
    const existingRole = await prisma.role.findUnique({
      where: {
        tenantId_name: { name, tenantId },
      },
    });

    if (existingRole) {
      return NextResponse.json(
        { message: "Ce nom de rôle est déjà utilisé" },
        { status: 409 }
      );
    }

    // Préparer les données de création
    const createData: any = {
      name: name.trim(),
      tenantId,
    };

    // Ajouter la description si elle existe
    if (
      description !== undefined &&
      description !== null &&
      description.trim() !== ""
    ) {
      createData.description = description.trim();
    }

    // Ajouter les permissions si elles existent
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      createData.permissions = {
        connect: permissions.map((permissionId: string) => ({
          id: permissionId,
          tenantId,
        })),
      };
    }

    // Créer le rôle
    const role = await prisma.role.create({
      data: createData,
      include: {
        permissions: true,
      },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Erreur lors de la création du rôle",
      },
      { status: 500 }
    );
  }
}
