// app/api/sites/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  protectDeleteRoute,
  protectReadRoute,
  protectUpdateRoute,
} from "@/lib/rbac/middleware";
import { getSession } from "@/lib/auth";

const the_resource = "site";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const protectionError = await protectReadRoute(request, the_resource);
    if (protectionError) return protectionError;
    const tenantId = (await getSession()).tenant.id!;
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: "ID du site requis" },
        { status: 400 }
      );
    }

    const site = await prisma.site.findUnique({
      where: { id, tenantId },
    });

    if (!site) {
      return NextResponse.json({ message: "Site non trouvé" }, { status: 404 });
    }

    return NextResponse.json(site);
  } catch (error) {
    console.error("Error fetching site:", error);
    return NextResponse.json(
      { message: "Erreur lors de la récupération du site" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const protectionError = await protectUpdateRoute(request, the_resource);
    if (protectionError) return protectionError;
    const tenantId = (await getSession()).tenant.id!;
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: "ID du site requis" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, active } = body;

    // Validation des données
    if (name && typeof name !== "string") {
      return NextResponse.json(
        { message: "Le nom doit être une chaîne de caractères" },
        { status: 400 }
      );
    }

    const existingSite = await prisma.site.findUnique({
      where: { id, tenantId },
    });

    if (!existingSite) {
      return NextResponse.json({ message: "Site non trouvé" }, { status: 404 });
    }

    const site = await prisma.site.update({
      where: { id, tenantId },
      data: {
        ...(name !== undefined && { name }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json(site);
  } catch (error) {
    console.error("Error updating site:", error);

    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          { message: "Un site avec ce nom existe déjà" },
          { status: 400 }
        );
      }
      if (error.message.includes("Record to update not found")) {
        return NextResponse.json(
          { message: "Site non trouvé" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { message: "Erreur lors de la modification du site" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const protectionError = await protectDeleteRoute(request, the_resource);
    if (protectionError) return protectionError;
    const tenantId = (await getSession()).tenant.id!;
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: "ID du site requis" },
        { status: 400 }
      );
    }

    const existingSite = await prisma.site.findUnique({
      where: { id, tenantId },
    });

    if (!existingSite) {
      return NextResponse.json({ message: "Site non trouvé" }, { status: 404 });
    }

    await prisma.site.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Site supprimé avec succès" });
  } catch (error) {
    console.error("Error deleting site:", error);

    if (
      error instanceof Error &&
      error.message.includes("Record to delete does not exist")
    ) {
      return NextResponse.json({ message: "Site non trouvé" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Erreur lors de la suppression du site" },
      { status: 500 }
    );
  }
}
