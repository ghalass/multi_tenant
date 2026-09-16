// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import yup from "@/lib/yupFr";
import { hashPassword } from "@/lib/auth";

const userCreateSchema = yup.object({
  email: yup.string().required().email().label("Email"),
  name: yup.string().required().label("Nom d'utilisateur"),
  password: yup.string().required().min(6).label("Mot de passe"),
});

// POST - Créer un utilisateur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validation avec Yup
    try {
      await userCreateSchema.validate(body, { abortEarly: false });
    } catch (validationError: any) {
      return NextResponse.json(
        { message: validationError.errors },
        { status: 400 }
      );
    }

    const { name, email, password } = body;

    const superAdminToCreate = {
      name: name,
      email: email,
      password: password,
      active: true,
      isSuperAdmin: true,
    };

    // Étape 1: Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findFirst({
      where: { email: superAdminToCreate.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Super admin est déjà créé" },
        { status: 200 }
      );
    }

    // Étape 3: Hasher le mot de passe
    const hashedPassword = await hashPassword(superAdminToCreate.password);

    // Étape 4: Créer l'utilisateur avec la relation de rôle
    const newUser = await prisma.user.create({
      data: {
        email: superAdminToCreate.email,
        name: superAdminToCreate.name,
        password: hashedPassword,
        active: superAdminToCreate.active,
        isSuperAdmin: superAdminToCreate.isSuperAdmin,
      },
      include: {
        roles: true,
      },
      omit: {
        password: true,
      },
    });

    return NextResponse.json(
      { message: "Super admin créé avec succès", user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur dans GET /api/users:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la création du super admin",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
