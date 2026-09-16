// POST /api/auth/register/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import yup from "@/lib/yupFr";

// Validation schema
const registerSchema = yup.object({
  email: yup.string().email().required().label("Email"),
  password: yup.string().min(6).required().label("Mot de passe"),
  tenantName: yup.string().required().label("Entreprise"),
  name: yup.string().required().label("Nom"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Validation Yup
    try {
      await registerSchema.validate(body, { abortEarly: false });
    } catch (err: any) {
      return NextResponse.json({ message: err.errors }, { status: 400 });
    }

    const { email, password, name, tenantName } = body;

    // Vérifier si le tenant existe déjà
    const tenantExist = await prisma.tenant.findUnique({
      where: { name: tenantName },
    });

    if (tenantExist) {
      return NextResponse.json(
        { message: "Ce nom d'entreprise existe déjà" },
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const emailExist = await prisma.user.findFirst({
      where: { email },
    });

    if (emailExist) {
      return NextResponse.json(
        { message: "Cet email est déjà utilisé" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    // Transaction atomique
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: tenantName },
      });

      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          active: true,
          isOwner: true,
          tenantId: tenant.id, // 🔥 lien SaaS
        },
      });

      return { tenant, user };
    });

    return NextResponse.json(
      {
        message: "Compte créé avec succès",
        tenant: result.tenant,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur POST /api/auth/register:", error);

    return NextResponse.json(
      { error: "Erreur lors de la création du compte" },
      { status: 500 }
    );
  }
}
