// components/AuthButtons.tsx

import { UserDetail } from "@/lib/types";
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
import LogoutButton from "./LogoutButton";
import { getCurrentUser } from "@/server/auth";

export default async function AuthButtons() {
  const { user } = await getCurrentUser();

  // ✅ CORRECTION : iron-session renvoie toujours un objet,
  // il faut tester la propriété 'userId' configurée dans votre lib/auth.ts
  if (!user || !user?.id) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-md"
        >
          Connexion
        </Link>
        <Link
          href="/register"
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-md shadow-sm"
        >
          {"S'inscrire"}
        </Link>
      </div>
    );
  }

  // Type assertion sécurisée maintenant qu'on sait que l'utilisateur est connecté
  const userDetail = user as unknown as UserDetail;

  const userRoles = userDetail.roles || [];
  const roleNames = userDetail.roleNames || [];
  const userPermissions = userDetail.permissions || [];

  // Extraire les noms de rôles selon la structure disponible
  let displayRoleNames: string;

  if (roleNames.length > 0) {
    displayRoleNames = roleNames.join(", ");
  } else if (userRoles.length > 0) {
    displayRoleNames = userRoles
      .map((role) => {
        if (typeof role === "object" && role !== null && "name" in role) {
          return (role as { name: string }).name;
        }
        return typeof role === "string" ? role : "";
      })
      .filter(Boolean)
      .join(", ");
  } else {
    displayRoleNames = "";
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent transition-colors duration-200 group">
            <div className="w-8 h-8 bg-linear-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
              {user?.name?.charAt(0).toUpperCase() || (
                <User className="w-4 h-4" />
              )}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-foreground">
                {user?.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {displayRoleNames ? (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {displayRoleNames}
                  </Badge>
                ) : (
                  <div className="text-muted-foreground flex gap-1">
                    <span> {userDetail?.isOwner && "Owner"}</span>
                    <span>{userDetail?.isSuperAdmin && "SuperAdmin"}</span>
                  </div>
                )}
              </div>
            </div>
          </button>
        </DropdownMenuTrigger>

        {/** */}
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              {displayRoleNames && (
                <p className="text-xs text-muted-foreground capitalize">
                  Rôles: {displayRoleNames}
                </p>
              )}
              {userPermissions.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {userPermissions.length} permission(s)
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              href="/profile"
              className="cursor-pointer flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span>Mon profil</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            asChild
            className="text-destructive focus:text-destructive"
          >
            <div className="cursor-pointer flex items-center gap-2">
              <LogoutButton />
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
