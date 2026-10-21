// app/(main)/page.tsx

import { getAllTenants } from "@/server/tenants";
import { CreateTenantForm } from "./create-tenant-form";
import TenantSwitcher from "./tenant-link";
import { getSession } from "@/lib/auth";

export default async function TenantMainPage() {
  const session = await getSession();
  const tenants = await getAllTenants();

  return (
    <div>
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        {session.userId ? (
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">

              {tenants?.length && `Liste de vos tenants (${tenants?.length})`}
            </h1>
            <CreateTenantForm />
            {/* <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Description
            </p> */}
            <div className="flex flex-col gap-2 items-center justify-center mt-2">
              {tenants.map((tenant) => (
                <TenantSwitcher key={tenant.id} tenantName={tenant.name} tenantId={tenant.id} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
              Bienvenue,
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Veuillez se connecter pour accèder à l'application.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
