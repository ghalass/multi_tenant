import { LineChart } from "lucide-react";
import CanAccess from "@/components/can-access";
import DisplayError from "@/components/display-error";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import {
  getOptionsRapportPareto,
  type TypeParcParetoOption,
} from "@/server/rapports/rapport_pareto";
import {
  getEvolutionSpecificiteLubrifiants,
  getEvolutionSpecificiteLubrifiantOptions,
  type EvolutionSpecificiteFilters,
} from "@/server/rapports/rapport-evolution-specificite-lubrifiants";
import SelectParams from "./select-params";
import EvolutionCharts from "./evolution-charts";
import { getPageAccessFallback } from "@/lib/rbac/page-access";

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

function firstString(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function EvolutionSpecificiteLubrifiantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<React.JSX.Element> {
  const accessFallback = await getPageAccessFallback(RESOURCE.RAPPORT);
  if (accessFallback) return accessFallback;

  const params = await searchParams;
  const annee = Number(firstString(params.annee));
  const filters: EvolutionSpecificiteFilters = {
    annee,
    typeParcId: firstString(params.typeParcId),
    parcId: firstString(params.parcId),
    siteId: firstString(params.siteId) || undefined,
    enginId: firstString(params.enginId) || undefined,
    typeLubrifiantId: firstString(params.typeLubrifiantId),
    lubrifiantId: firstString(params.lubrifiantId) || undefined,
  };
  const hasValidFilters =
    Number.isInteger(annee) &&
    annee >= 2000 &&
    annee <= 9999 &&
    Boolean(filters.typeParcId) &&
    Boolean(filters.parcId) &&
    Boolean(filters.typeLubrifiantId);

  const [optionsResponse, lubricantOptionsResponse, reportResponse] = await Promise.all([
    getOptionsRapportPareto(),
    getEvolutionSpecificiteLubrifiantOptions(),
    hasValidFilters
      ? getEvolutionSpecificiteLubrifiants(filters)
      : Promise.resolve(undefined),
  ]);
  const typeParcs = optionsResponse.success
    ? optionsResponse.data as TypeParcParetoOption[]
    : [];
  const report = reportResponse?.success ? reportResponse.data?.[0] : undefined;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
          <LineChart className="size-7 text-primary" />
          Évolution du spécifique par type de lubrifiant
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suivez chaque mois la consommation spécifique et son objectif annuel, puis consultez les top 10 des engins et lubrifiants les plus consommés.
        </p>
      </header>

      <CanAccess resource={RESOURCE.RAPPORT} action={ACTION.READ}>
        {!optionsResponse.success && <DisplayError error={optionsResponse.message} />}
        {!lubricantOptionsResponse.success && (
          <DisplayError error={lubricantOptionsResponse.message} />
        )}
        <SelectParams
          typeParcs={typeParcs}
          typeLubrifiants={lubricantOptionsResponse.data ?? []}
        />
        {reportResponse && !reportResponse.success && (
          <DisplayError error={reportResponse.message} />
        )}
        {!hasValidFilters ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <h2 className="font-semibold">Sélectionnez les paramètres du rapport</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choisissez une année, un type de parc, un parc et un type de lubrifiant. Le site, l’engin et le lubrifiant sont facultatifs.
            </p>
          </div>
        ) : reportResponse?.success ? (
          report ? <EvolutionCharts data={report} annee={annee} /> : null
        ) : null}
      </CanAccess>
    </div>
  );
}
