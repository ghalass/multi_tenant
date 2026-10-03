import { getCurrentTenant } from "@/server/tenants";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { TenantBreadcrumb } from "@/components/tenant-breadcrumb";

export default async function TenantLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/");

  return (
    <div>
      <header className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-10 items-center gap-2 px-3">
          <BackButton />

          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Building2 className="h-3.5 w-3.5 text-primary" />
          </div>

          {/* Breadcrumb prend toute la place disponible */}
          <div className="min-w-0 flex-1">
            <TenantBreadcrumb tenantName={tenant.name} />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}