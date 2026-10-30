// app/api/users/route.ts

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import yup from "@/lib/yupFr";

const schema = yup.object({
  name: yup.string().trim().required().label("Nom"),
  email: yup.string().trim().email().required().label("Email"),
  password: yup.string().min(12).required().label("Mot de passe"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Vérifier le secret d'initialisation
    const expected = process.env.SUPER_ADMIN_SETUP_TOKEN;
    const received = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");

    if (!expected) {
      return NextResponse.json(
        { message: "Initialisation non configurée." },
        { status: 503 }
      );
    }

    if (!received) {
      return NextResponse.json(
        { message: "Accès refusé." },
        { status: 401 }
      );
    }

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return NextResponse.json(
        { message: "Accès refusé." },
        { status: 401 }
      );
    }

    // 2. Vérifier les données reçues
    const body = await schema.validate(await request.json(), {
      abortEarly: false,
      stripUnknown: true,
    });

    // 3. Un seul super-administrateur
    const existing = await prisma.user.findFirst({
      where: { isSuperAdmin: true },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Le super-administrateur existe déjà." },
        { status: 409 }
      );
    }

    // 4. Créer le compte
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        password: await hashPassword(body.password),
        active: true,
        isSuperAdmin: true,
        tenantId: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
      },
    });

    return NextResponse.json(
      {
        message: "Super-administrateur créé avec succès.",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Un super-administrateur existe déjà." },
        { status: 409 }
      );
    }

    if (error instanceof yup.ValidationError) {
      return NextResponse.json(
        { message: error.errors },
        { status: 400 }
      );
    }

    console.error("Erreur de création du super-administrateur.");
    return NextResponse.json(
      { message: "Impossible de créer le super-administrateur." },
      { status: 500 }
    );
  }
}
