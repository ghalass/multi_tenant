// components/AuthButtons.tsx

import Link from "next/link";
import { User } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

import LogoutButton from "./LogoutButton";
import type { JSX } from "react";

export default async function AuthButtons(): Promise<JSX.Element> {
  const session = await getSession();
  const userId = session?.userId;

  // Aucun utilisateur connecté
  if (!userId) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
        >
          Connexion
        </Link>
      </div>
    );
  }

  // Récupérer les informations de l'utilisateur connecté.
  // Cette requête ne dépend pas de l'existence d'un tenant actif.
  const userData = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      name: true,
      email: true,
      isSuperAdmin: true,
      memberships: {
        where: session.currentTenantId
          ? {
            tenantId: session.currentTenantId,
          }
          : undefined,
        select: {
          roleAssignments: {
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Session existante, mais utilisateur introuvable
  if (!userData) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
        >
          Connexion
        </Link>
      </div>
    );
  }

  // Récupérer les rôles des memberships
  const roles = userData.memberships.flatMap((membership) =>
    membership.roleAssignments.map((assignment) => assignment.role)
  );

  const displayName = userData.name?.trim() || userData.email || "Utilisateur";

  // Le rôle SuperAdmin est indépendant des rôles d'un tenant.
  const roleNames = userData.isSuperAdmin
    ? "SuperAdmin"
    : roles.map((role) => role.name).filter(Boolean).join(", ") ||
    "Aucun rôle";

  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Ouvrir le menu utilisateur"
            className="group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors duration-200 hover:bg-accent"
          >
            {/* Avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/70 text-sm font-medium text-primary-foreground">
              {firstLetter || <User className="h-4 w-4" />}
            </div>

            {/* Nom et rôle : masqués sur les petits écrans */}
            <div className="hidden text-left sm:block">
              <div className="text-sm font-medium text-foreground">
                {displayName}
              </div>

              <div className="text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs capitalize">
                  {roleNames}
                </Badge>
              </div>
            </div>
          </button>
        </DropdownMenuTrigger>

        {/* Menu déroulant */}
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{displayName}</p>

              <p className="text-xs text-muted-foreground">
                {userData.email}
              </p>

              <div className="pt-1">
                <Badge variant="secondary" className="text-xs">
                  {roleNames}
                </Badge>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link
              href="/profile"
              className="flex cursor-pointer items-center gap-2"
            >
              <User className="h-4 w-4" />
              <span>Mon profil</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            asChild
            className="text-destructive focus:text-destructive"
          >
            <div className="flex cursor-pointer items-center gap-2">
              <LogoutButton />
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}