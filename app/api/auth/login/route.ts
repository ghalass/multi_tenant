// app/api/auth/login/route.ts - Version corrigée avec relations implicites
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, verifyPassword } from "@/lib/auth";
import yup from "@/lib/yupFr";

// Validation schema
const loginSchema = yup.object({
  email: yup.string().email().required().label("Email"),
  password: yup.string().min(6).required().label("Mot de passe"),
  tenantName: yup.string().required().label("Entreprise"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validation Yup
    try {
      await loginSchema.validate(body, { abortEarly: false });
    } catch (err: any) {
      return NextResponse.json({ message: err.errors }, { status: 400 });
    }

    const { email, password, tenantName } = body;

    // Vérifier si le tenant existe déjà
    const tenant = await prisma.tenant.findUnique({
      where: { name: tenantName },
    });
    if (!tenant) {
      return NextResponse.json(
        { message: "Ce nom d'entreprise n'existe pas" },
        { status: 404 },
      );
    }

    // find user
    const user = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          email,
          tenantId: tenant.id,
        },
      },
      include: {
        // Relation directe User -> Role[]
        roles: {
          include: {
            // Relation implicite Role -> Permission[]
            permissions: true, // Pas besoin de `include: { permission: true }` car c'est direct
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Email ou mot de passe incorrect!" },
        { status: 401 },
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { message: "Email ou mot de passe incorrect!" },
        { status: 401 },
      );
    }

    if (!user.active) {
      return NextResponse.json(
        {
          message:
            "Votre compte n'est pas encore activé, veuillez contacter un admin pour l'activation.",
        },
        { status: 401 },
      );
    }

    // Préparer les données de session
    const userRoles = user.roles.map((role) => role.name);

    // Extraire toutes les permissions des rôles de l'utilisateur
    // Avec la relation implicite, permissions est un tableau direct
    const userPermissions = user.roles.flatMap((role) =>
      role.permissions.map((permission) => ({
        id: permission.id,
        resource: permission.resource,
        action: permission.action,
        roleId: role.id,
        roleName: role.name,
      })),
    );

    // SESSION
    const session = await getSession();
    session.userId = user.id;
    session.email = user.email;
    session.name = user.name; // Ajout du nom dans la session
    session.roles = userRoles;
    session.permissions = userPermissions; // Stocker les permissions dans la session
    session.isLoggedIn = true;
    session.isSuperAdmin = user?.isSuperAdmin;
    session.isOwner = user?.isOwner;
    session.tenant = {
      id: tenant?.id,
      name: tenant?.name,
    };
    await session.save();

    // Supprimer le mot de passe avant de renvoyer l'utilisateur
    const { password: _, ...sanitizedUser } = user;

    // Formater la réponse avec les données structurées
    const userResponse = {
      ...sanitizedUser,
      // Ajouter les permissions dans la réponse pour le frontend
      permissions: userPermissions,
      // Liste des noms de rôles pour faciliter les vérifications
      roleNames: userRoles,
    };

    return NextResponse.json(true, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
