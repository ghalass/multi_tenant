import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { hasPermission } from "@/lib/rbac/core";
import CanAccess from "@/components/can-access";
import LubrifiantClient from "@/components/lubrifiant-client";
import { getAllLubrifiants, getLubrifiantOptions } from "@/server/lubrifiants";

export default async function LubrifiantPage(): Promise<React.JSX.Element> {
  const [response, optionsResponse, canCreate, canUpdate, canDelete, canExport] =
    await Promise.all([
      getAllLubrifiants(),
      getLubrifiantOptions(),
      hasPermission(ACTION.CREATE, RESOURCE.LUBRIFIANT),
      hasPermission(ACTION.UPDATE, RESOURCE.LUBRIFIANT),
      hasPermission(ACTION.DELETE, RESOURCE.LUBRIFIANT),
      hasPermission(ACTION.EXPORT, RESOURCE.LUBRIFIANT),
    ]);

  const options = optionsResponse.data?.[0] ?? { types: [], parcs: [] };
  const errors = [response, optionsResponse]
    .filter((item) => !item.success)
    .map((item) => item.message);

  return (
    <CanAccess resource={RESOURCE.LUBRIFIANT} action={ACTION.READ}>
      <LubrifiantClient
        items={response.data ?? []}
        options={options}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        canExport={canExport}
        error={errors.length ? errors.join(" ") : undefined}
      />
    </CanAccess>
  );
}
