// app/(main)/[tenantId]/page.tsx

import { getCurrentTenant } from "@/server/tenants";

export default async function TenantMainPage() {

  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  return (
    <div>
      <h1 className="text-2xl font-bold">Organisation : {tenant.name}</h1>
    </div>
  );
}
