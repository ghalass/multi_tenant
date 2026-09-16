import Navbar from "@/components/Navbar";
import { SidebarProvider } from "@/components/ui/sidebar"; // Import ajouté

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // On enveloppe tout dans SidebarProvider pour que le Navbar (et son SidebarTrigger) puisse fonctionner
    //<SidebarProvider>
    <div className="flex h-dvh w-full overflow-hidden bg-muted/40 p-2">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg">
        {/* Navbar */}
        <header className="bg-background/70 backdrop-blur-md">
          {/* showSidebarTrigger={false} cache le bouton, mais le composant doit quand même être dans le Provider */}
          <Navbar showSidebarTrigger={false} />
        </header>

        {/* Contenu */}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-b-lg border bg-background p-4 shadow-inner">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
    //</SidebarProvider>
  );
}
