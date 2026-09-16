// app/api/auth/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, currentPassword } = body;

    // Récupérer l'utilisateur actuel
    const existingUser = await prisma.user.findUnique({
      where: { id: session.userId, tenantId: session.tenant.id! },
    });

    if (!existingUser) {
      return NextResponse.json(
        { message: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Si changement de mot de passe, vérifier l'ancien mot de passe
    if (password && password.trim() !== "") {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Le mot de passe actuel est requis" },
          { status: 400 }
        );
      }

      const isCurrentPasswordValid = await verifyPassword(
        currentPassword,
        existingUser.password
      );

      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: "Mot de passe actuel incorrect" },
          { status: 400 }
        );
      }
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId: session.tenant.id!,
            email,
          },
        },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "Cet email est déjà utilisé" },
          { status: 400 }
        );
      }
    }

    // Préparer les données de mise à jour
    const updateData: any = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.password = await hashPassword(password);

    // Mettre à jour l'utilisateur
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      include: {
        roles: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erreur mise à jour profil:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du profil" },
      { status: 500 }
    );
  }
}
