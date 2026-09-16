import { AppSidebar } from "@/components/AppSidebar";
import Navbar from "@/components/Navbar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-muted/40 p-2">
        {/* Sidebar */}
        <AppSidebar />

        {/* Zone principale */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Navbar */}
          <header className="bg-background/70 backdrop-blur-md">
            {/* Le SidebarTrigger est dans Navbar, qui est bien dans le Provider */}
            <Navbar />
          </header>

          {/* Contenu */}
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-b-lg border bg-background p-4 shadow-inner">
            <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
