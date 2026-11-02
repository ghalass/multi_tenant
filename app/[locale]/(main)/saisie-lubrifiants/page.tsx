import CanAccess from "@/components/can-access";
import Pagination from "@/components/pagination";
import SaisieLubrifiantsClient from "@/components/saisie-lubrifiants-client";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { hasPermission } from "@/lib/rbac/core";
import {
  getAllSaisieLubrifiants,
  getSaisieLubrifiantOptions,
  type SaisieLubrifiantFilters,
} from "@/server/saisie-lubrifiants";
import { getPageAccessFallback } from "@/lib/rbac/page-access";

type PageProps = {
  searchParams: Promise<SaisieLubrifiantFilters>;
};

export default async function SaisieLubrifiantsPage({
  searchParams,
}: PageProps): Promise<React.JSX.Element> {
  const accessFallback = await getPageAccessFallback(
    RESOURCE.SAISIE_LUBRIFIANT,
  );
  if (accessFallback) return accessFallback;

  const filters = await searchParams;
  const hasSearched = filters.search === "1";
  const [response, optionsResponse, canCreate, canUpdate, canDelete, canExport] =
    await Promise.all([
      hasSearched ? getAllSaisieLubrifiants(filters) : Promise.resolve(null),
      getSaisieLubrifiantOptions(),
      hasPermission(ACTION.CREATE, RESOURCE.SAISIE_LUBRIFIANT),
      hasPermission(ACTION.UPDATE, RESOURCE.SAISIE_LUBRIFIANT),
      hasPermission(ACTION.DELETE, RESOURCE.SAISIE_LUBRIFIANT),
      hasPermission(ACTION.EXPORT, RESOURCE.SAISIE_LUBRIFIANT),
    ]);

  const options = optionsResponse.data?.[0] ?? {
    typeParcs: [],
    parcs: [],
    sites: [],
    engins: [],
    lubrifiants: [],
  };
  const errors = [response, optionsResponse]
    .filter((item) => item !== null)
    .filter((item) => !item.success)
    .map((item) => item.message);

  const items = response?.success ? response.data ?? [] : [];

  return (
    <CanAccess resource={RESOURCE.SAISIE_LUBRIFIANT} action={ACTION.READ}>
      <SaisieLubrifiantsClient
        items={items}
        options={options}
        hasSearched={hasSearched}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        canExport={canExport}
        error={errors.length ? errors.join(" ") : undefined}
      />
      {response?.success && response.meta && (
        <Pagination
          totalPages={response.meta.totalPages}
          currentPage={response.meta.currentPage}
          totalItems={response.meta.totalItems}
          itemsPerPage={response.meta.itemsPerPage}
        />
      )}
    </CanAccess>
  );
}
