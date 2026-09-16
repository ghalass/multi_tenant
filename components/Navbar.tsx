import { SidebarTrigger } from "@/components/ui/sidebar";
import ModeToggle from "@/components/ModeToggle";
import AuthButtons from "./AuthButtons";
import { APP_NAME } from "@/lib/constantes";
import Link from "next/link";

export default async function Navbar({
  showSidebarTrigger = true,
}: {
  showSidebarTrigger?: boolean;
}) {

  return (
    <header className="flex items-center justify-between px-4 border-l border-r border-t rounded-t-md bg-background/95 backdrop-blur">
      <div className="flex items-center gap-4 py-4">
        {showSidebarTrigger && (
          <SidebarTrigger className="hover:bg-accent transition-colors rounded-md p-2" />
        )}
        <div className="hidden sm:block">
          <h1 className="text-lg font-semibold text-primary">
            <Link href={"/"}>
              {APP_NAME}{" "}
              <span className="text-xs text-foreground">by GHALASS</span>{" "}
            </Link>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">

        <div className="h-6 w-px bg-border hidden sm:block" />
        <ModeToggle />
        <div className="h-6 w-px bg-border hidden sm:block" />
        <AuthButtons />
      </div>
    </header>
  );
}
