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
// import { Badge } from "@/components/ui/badge";
import LogoutButton from "./LogoutButton";
import { getCurrentUser } from "@/server/auth";
import { Badge } from "./ui/badge";

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

      </div>
    );
  }

  let roleNames = "";
  if (user.isSuperAdmin) {
    roleNames = "SuperAdmin";
  }
  else if (user?.roles && Array.isArray(user.roles)) {
    roleNames = user.roles.map((role) => {
      if (typeof role === "object" && role !== null && "name" in role) {
        return (role as { name: string }).name;
      }
      return typeof role === "string" ? role : "";
    })
      .filter(Boolean)
      .join(", ");
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

                <Badge variant="secondary" className="text-xs capitalize">
                  {roleNames}
                </Badge>
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
