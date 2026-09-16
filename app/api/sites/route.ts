// app/api/sites/route.ts
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { protectCreateRoute, protectReadRoute } from "@/lib/rbac/middleware";
import { getSession } from "@/lib/auth";

const the_resource = "site";

export async function GET(request: NextRequest) {
  try {
    // Vérifier la permission de lecture des sites (pas "users")
    const protectionError = await protectReadRoute(request, the_resource);
    if (protectionError) return protectionError;
    const tenantId = (await getSession()).tenant.id!;
    const sites = await prisma.site.findMany({
      where: { tenantId },
      orderBy: { name: "desc" },
    });

    return NextResponse.json(sites);
  } catch (error) {
    console.error("Error fetching sites:", error);
    return NextResponse.json(
      { message: "Erreur lors de la récupération des sites" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier la permission de création des sites
    const protectionError = await protectCreateRoute(request, the_resource);
    if (protectionError) return protectionError;
    const tenantId = (await getSession()).tenant.id!;
    const body = await request.json();
    const { name, active = true } = body;

    // Validation basique
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { message: "Le nom du site est requis" },
        { status: 400 },
      );
    }
    const site = await prisma.site.create({
      data: {
        name: name.trim(),
        active,
        tenantId,
      },
    });

    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    console.error("Error creating site:", error);

    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { message: "Un site avec ce nom existe déjà" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Erreur lors de la création du site" },
      { status: 500 },
    );
  }
}
