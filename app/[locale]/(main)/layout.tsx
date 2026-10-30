// app/[locale]/(main)/layout.tsx

import { AppSidebar } from "@/components/AppSidebar";
import Navbar from "@/components/Navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getSession } from "@/lib/auth";

export default async function MainLayout({
  children, params,
}: Readonly<{
  children: React.ReactNode; params: Promise<{ locale: string }>;
}>): Promise<import("react").JSX.Element> {
  const { locale } = await params;
  const isRTL = locale === "ar";

  const session = await getSession();

  return (
    <SidebarProvider>
      <div dir={isRTL ? "rtl" : "ltr"} className="flex h-dvh w-full overflow-hidden bg-sidebar p-2">

        {/* Sidebar */}
        {/* {<AppSidebar />} */}
        {session?.currentTenantId && <AppSidebar />}

        {/* Zone principale */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Navbar */}
          <header className="bg-sidebar backdrop-blur-md">
            {/* Le SidebarTrigger est dans Navbar, qui est bien dans le Provider */}
            <Navbar />
          </header>

          {/* Contenu */}
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-b-lg border bg-sidebar p-4 shadow-inner">
            <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
