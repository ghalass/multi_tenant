"use client"; // Retenu pour le navigateur

import { logoutAction } from "@/lib/auth";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      onClick={async () => {
        await logoutAction();
      }}
      className="cursor-pointer flex items-center gap-2"
    >
      <LogOut className="w-4 h-4 text-destructive" /> Déconnexion
    </button>
  );
}
