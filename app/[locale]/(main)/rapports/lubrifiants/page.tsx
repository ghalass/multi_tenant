import CanAccess from "@/components/can-access";
import RapportLubrifiantsClient from "@/components/rapport-lubrifiants-client";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { hasPermission } from "@/lib/rbac/core";
import {
  getLubrifiantConsumptionReport,
  getLubrifiantReportOptions,
  type LubrifiantReportFilters,
} from "@/server/rapports/rapport-lubrifiants";
import { getPageAccessFallback } from "@/lib/rbac/page-access";

type SearchParams = LubrifiantReportFilters;

export default async function RapportLubrifiantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<React.JSX.Element> {
  const accessFallback = await getPageAccessFallback(RESOURCE.RAPPORT);
  if (accessFallback) return accessFallback;

  const filters = await searchParams;
  const [optionsResponse, canExport] = await Promise.all([
    getLubrifiantReportOptions(),
    hasPermission(ACTION.EXPORT, RESOURCE.RAPPORT),
  ]);
  const hasRequiredFilters = Boolean(
    filters.du && filters.au && filters.parcId && filters.typeLubrifiantId,
  );
  const reportResponse = hasRequiredFilters
    ? await getLubrifiantConsumptionReport(filters)
    : undefined;
  const report = reportResponse?.success ? reportResponse.data?.[0] : undefined;
  const error = [
    !optionsResponse.success ? optionsResponse.message : "",
    reportResponse && !reportResponse.success ? reportResponse.message : "",
  ].filter(Boolean).join(" ");

  return (
    <CanAccess resource={RESOURCE.RAPPORT} action={ACTION.READ}>
      <RapportLubrifiantsClient
        options={optionsResponse.data?.[0] ?? {
          typeParcs: [],
          typeLubrifiants: [],
          sites: [],
        }}
        report={report}
        error={error || undefined}
        canExport={canExport}
      />
    </CanAccess>
  );
}
