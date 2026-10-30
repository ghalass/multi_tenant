// app/(main)/page.tsx

import { getAllTenants } from "@/server/tenants";
import { CreateTenantForm } from "./create-tenant-form";
import TenantSwitcher from "../../../components/tenant-link";
import { getSession } from "@/lib/auth";
import CanAccess from "@/components/can-access";
import { ACTION } from "@/lib/enums";
import { getI18n } from "@/locales/server";

export default async function TenantMainPage(): Promise<import("react").JSX.Element> {
  const { userId, currentTenantId } = await getSession();
  const tenants = await getAllTenants();
  const t = await getI18n()
  return (
    <div>
      <div className="max-w-6xl mx-auto">

        {/* En-tête */}
        {userId ? (
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">

              {tenants?.length && `Liste de vos tenants (${tenants?.length})`}
            </h1>
            <CanAccess action={ACTION.READ} resource="tenant">
              <CreateTenantForm />
            </CanAccess>

            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t('home.desc')}
            </p>

            <div className="flex flex-col gap-2 items-center justify-center mt-2">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center gap-0.5">
                  <TenantSwitcher
                    tenantName={tenant.name}
                    tenantId={tenant.id}
                    currentTenantId={currentTenantId}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
              Bienvenue,
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Veuillez se connecter pour accèder à l&apos;application.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
