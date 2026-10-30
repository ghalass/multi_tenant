"use client"; // Retenu pour le navigateur

import { logout } from "@/lib/auth";
import { LogOut } from "lucide-react";
import { JSX } from "react/jsx-runtime";

export default function LogoutButton(): JSX.Element {
  return (
    <button
      onClick={async () => {
        await logout();
      }}
      className="cursor-pointer flex items-center gap-2"
    >
      <LogOut className="w-4 h-4 text-destructive" /> Déconnexion
    </button>
  );
}
