import { getCurrentTenant } from "@/server/tenants";
import { redirect } from "next/navigation";

export default async function TenantLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/");

  return (<>{children}</>);
}