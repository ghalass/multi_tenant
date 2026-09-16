// app/api/auth/logout/route.ts

import { logout } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: "Logged out",
    });

    await logout();

    // Supprimer le cookie
    // response.cookies.set({
    //   name: "token",
    //   value: "",
    //   maxAge: 0,
    //   path: "/", // très important pour supprimer le cookie sur tout le site
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "strict",
    // });

    return response;
  } catch (error) {
    console.error("Erreur lors de la decconnexion:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
