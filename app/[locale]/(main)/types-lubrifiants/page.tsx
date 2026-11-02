import TypeLubrifiantClient from "@/components/type-lubrifiant-client";
import { getAllTypeLubrifiants } from "@/server/type-lubrifiants";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { hasPermission } from "@/lib/rbac/core";
import { getPageAccessFallback } from "@/lib/rbac/page-access";

export default async function TypeLubrifiantPage(): Promise<React.JSX.Element> {
  const accessFallback = await getPageAccessFallback(RESOURCE.TYPE_LUBRIFIANT);
  if (accessFallback) return accessFallback;

  const [response, canCreate, canUpdate, canDelete, canExport] =
    await Promise.all([
      getAllTypeLubrifiants(),
      hasPermission(ACTION.CREATE, RESOURCE.TYPE_LUBRIFIANT),
      hasPermission(ACTION.UPDATE, RESOURCE.TYPE_LUBRIFIANT),
      hasPermission(ACTION.DELETE, RESOURCE.TYPE_LUBRIFIANT),
      hasPermission(ACTION.EXPORT, RESOURCE.TYPE_LUBRIFIANT),
    ]);

  return (
    <TypeLubrifiantClient
      items={response.data ?? []}
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
      canExport={canExport}
      error={response.success ? undefined : response.message}
    />
  );
}
