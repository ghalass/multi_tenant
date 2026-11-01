import CanAccess from "@/components/can-access";
import TypeLubrifiantClient from "@/components/type-lubrifiant-client";
import { getAllTypeLubrifiants } from "@/server/type-lubrifiants";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { hasPermission } from "@/lib/rbac/core";

export default async function TypeLubrifiantPage(): Promise<React.JSX.Element> {
  const [response, canCreate, canUpdate, canDelete, canExport] = await Promise.all([
    getAllTypeLubrifiants(),
    hasPermission(ACTION.CREATE, RESOURCE.TYPE_LUBRIFIANT),
    hasPermission(ACTION.UPDATE, RESOURCE.TYPE_LUBRIFIANT),
    hasPermission(ACTION.DELETE, RESOURCE.TYPE_LUBRIFIANT),
    hasPermission(ACTION.EXPORT, RESOURCE.TYPE_LUBRIFIANT),
  ]);
  return (
    <CanAccess resource={RESOURCE.TYPE_LUBRIFIANT} action={ACTION.READ}>
      <TypeLubrifiantClient
        items={response.data ?? []}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        canExport={canExport}
        error={response.success ? undefined : response.message}
      />
    </CanAccess>
  );
}
