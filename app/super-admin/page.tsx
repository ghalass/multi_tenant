import DisplayData from "@/components/DisplayData";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SuperAdminPage() {
  const session = await getSession();
  const tenants = await prisma.tenant.findMany();
  return (
    <div>
      <h1>Liste des tenants</h1>
      {tenants.length}
      <DisplayData data={session} />
      <DisplayData data={tenants} />
    </div>
  );
}
