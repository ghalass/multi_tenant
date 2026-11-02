"use client";

import { Fragment, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Droplet } from "lucide-react";
import { ExportExcel } from "@/components/export-excel";
import Pagination from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGINATION_SETTINGS } from "@/lib/constantes";
import type {
  LubrifiantConsumptionReport,
  LubrifiantParcSpecificityMetric,
  LubrifiantReportOptions,
} from "@/server/rapports/rapport-lubrifiants";

type Props = {
  options: LubrifiantReportOptions;
  report?: LubrifiantConsumptionReport;
  error?: string;
  canExport: boolean;
};

type ReportMode = "ventilation" | "specificite";

function formatNumber(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function formatUnitValues(
  rows: LubrifiantConsumptionReport["globalByParcByUnit"],
  getValue: (row: LubrifiantConsumptionReport["globalByParcByUnit"][number]) => string,
): string {
  return rows.length ? rows.map(getValue).join(" · ") : "—";
}

function SpecificiteValuesCell({
  metrics,
  value,
}: {
  metrics: LubrifiantParcSpecificityMetric[];
  value: "objectif" | "specific" | "ecart";
}): React.JSX.Element {
  return (
    <td className="border-2 border-black p-2 text-center">
      {metrics.map((metric) => {
        const amount = metric[value];
        const color = value === "specific" && amount !== null && metric.objectif !== null
          ? amount > metric.objectif
            ? "bg-red-500"
            : "bg-green-500"
          : value === "ecart" && amount !== null && amount < 0
            ? "bg-amber-400"
            : "";
        return (
          <div
            key={metric.unite || "sans-unite"}
            className={`-mx-2 px-2 py-1 ${color}`}
            title={metric.unite ? `${metric.unite}/h` : undefined}
          >
            {amount === null ? "" : formatNumber(amount)}
          </div>
        );
      })}
    </td>
  );
}

export default function RapportLubrifiantsClient({
  options,
  report,
  error,
  canExport,
}: Props): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<ReportMode>("ventilation");
  const [du, setDu] = useState(searchParams.get("du") ?? "");
  const [au, setAu] = useState(searchParams.get("au") ?? "");
  const [typeParcId, setTypeParcId] = useState(searchParams.get("typeParcId") ?? "");
  const [parcId, setParcId] = useState(searchParams.get("parcId") ?? "");
  const [enginId, setEnginId] = useState(searchParams.get("enginId") ?? "");
  const [siteId, setSiteId] = useState(searchParams.get("siteId") ?? "");
  const [typeLubrifiantId, setTypeLubrifiantId] = useState(searchParams.get("typeLubrifiantId") ?? "");
  const [lubrifiantId, setLubrifiantId] = useState(searchParams.get("lubrifiantId") ?? "");
  const [section, setSection] = useState(searchParams.get("section") ?? "");
  const [imputation, setImputation] = useState(searchParams.get("imputation") ?? "");

  const parcs = typeParcId
    ? options.typeParcs.find((item) => item.id === typeParcId)?.parcs ?? []
    : options.typeParcs.flatMap((item) => item.parcs);
  const engins = parcs.find((item) => item.id === parcId)?.engins ?? [];
  const selectedParc = parcs.find((item) => item.id === parcId);
  const selectedEnginId = engins.some((item) => item.id === enginId) ? enginId : "";
  const lubrifiants = typeLubrifiantId
    ? options.typeLubrifiants.find((item) => item.id === typeLubrifiantId)?.lubrifiants ?? []
    : [];
  const requestedPageSize = Number(searchParams.get("itemsPerPage"));
  const itemsPerPage = Number.isInteger(requestedPageSize) && requestedPageSize > 0
    ? requestedPageSize
    : PAGINATION_SETTINGS.itemsPerPage;

  function getPage(pageParam: string, totalItems: number): {
    currentPage: number;
    totalPages: number;
    start: number;
  } {
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const requestedPage = Number(searchParams.get(pageParam));
    const currentPage = Number.isInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, totalPages)
      : 1;
    return { currentPage, totalPages, start: (currentPage - 1) * itemsPerPage };
  }

  function generate(): void {
    if (!du || !au || du > au || !parcId || !typeLubrifiantId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("currentPageParc", "1");
    params.set("currentPageEngin", "1");
    params.delete("currentPage");
    params.set("du", du);
    params.set("au", au);
    if (typeParcId) params.set("typeParcId", typeParcId);
    else params.delete("typeParcId");
    params.set("parcId", parcId);
    if (selectedEnginId) params.set("enginId", selectedEnginId);
    else params.delete("enginId");
    if (siteId) params.set("siteId", siteId);
    else params.delete("siteId");
    params.delete("enginName");
    params.set("typeLubrifiantId", typeLubrifiantId);
    if (lubrifiantId) params.set("lubrifiantId", lubrifiantId);
    else params.delete("lubrifiantId");
    if (section.trim()) params.set("section", section.trim());
    else params.delete("section");
    if (imputation.trim()) params.set("imputation", imputation.trim());
    else params.delete("imputation");
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  const parcRows = mode === "ventilation"
    ? report?.byParc ?? []
    : report?.specificByParcAndLubrifiant ?? [];
  const enginRows = mode === "ventilation"
    ? report?.byEngin ?? []
    : report?.specificByEngin ?? [];
  const parcPage = getPage("currentPageParc", parcRows.length);
  const enginPage = getPage("currentPageEngin", enginRows.length);
  const tableIds = mode === "ventilation"
    ? {
        parc: "rapport-lubrifiants-ventilation-parc",
        engin: "rapport-lubrifiants-ventilation-engin",
      }
    : {
        parc: "rapport-lubrifiants-specifique-parc",
        engin: "rapport-lubrifiants-specifique-engin",
      };
  const fileNames = mode === "ventilation"
    ? {
        parc: "Ventilation_lubrifiants_par_parc",
        engin: "Ventilation_lubrifiants_par_engin",
      }
    : {
        parc: "Specifique_lubrifiants_par_parc",
        engin: "Specifique_lubrifiants_par_engin",
      };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <BarChart3 className="size-8" />
          Rapports des lubrifiants
        </h1>
        <p className="mt-1 text-muted-foreground">
          Consultez la ventilation et le spécifique par parc ou par engin, avec un filtre facultatif par site.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
        <div className="grid gap-2">
          <Label htmlFor="lubrifiant-report-du">Du</Label>
          <Input id="lubrifiant-report-du" type="date" value={du} onChange={(event) => setDu(event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lubrifiant-report-au">Au</Label>
          <Input id="lubrifiant-report-au" type="date" value={au} onChange={(event) => setAu(event.target.value)} />
        </div>
        <div className="grid min-w-48 gap-2">
          <Label>Type de parc</Label>
          <Select
            value={typeParcId || "all"}
            onValueChange={(value) => {
              setTypeParcId(value === "all" ? "" : value);
              setParcId("");
              setEnginId("");
              setSiteId("");
            }}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="Tous les types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {options.typeParcs.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-48 gap-2">
          <Label>Parc (obligatoire)</Label>
          <Select
            value={parcId || "choose"}
            onValueChange={(value) => {
              setParcId(value === "choose" ? "" : value);
              setEnginId("");
            }}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="Choisir un parc" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="choose">Choisir un parc</SelectItem>
              {parcs.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-48 gap-2">
          <Label>Site (facultatif)</Label>
          <Select value={siteId || "all"} onValueChange={(value) => setSiteId(value === "all" ? "" : value)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Tous les sites" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les sites</SelectItem>
              {options.sites.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-48 gap-2">
          <Label>Type de lubrifiant (obligatoire)</Label>
          <Select
            value={typeLubrifiantId || "choose"}
            onValueChange={(value) => {
              setTypeLubrifiantId(value === "choose" ? "" : value);
              setLubrifiantId("");
            }}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="Choisir un type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="choose">Choisir un type</SelectItem>
              {options.typeLubrifiants.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-48 gap-2">
          <Label>Lubrifiant (facultatif)</Label>
          <Select
            value={lubrifiantId || "all"}
            onValueChange={(value) => setLubrifiantId(value === "all" ? "" : value)}
            disabled={!typeLubrifiantId}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="Tous les lubrifiants" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les lubrifiants</SelectItem>
              {lubrifiants.map((item) => <SelectItem key={item.id} value={item.id}>{item.code} — {item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-48 gap-2">
          <Label>Engin (facultatif)</Label>
          <Select
            value={selectedEnginId || "all"}
            onValueChange={(value) => setEnginId(value === "all" ? "" : value)}
            disabled={!parcId}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="Tous les engins du parc" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les engins du parc</SelectItem>
              {engins.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-48 gap-2">
          <Label htmlFor="lubrifiant-report-section">Section</Label>
          <Input id="lubrifiant-report-section" value={section} onChange={(event) => setSection(event.target.value)} placeholder="Toutes les sections" />
        </div>
        <div className="grid min-w-48 gap-2">
          <Label htmlFor="lubrifiant-report-imputation">Imputation</Label>
          <Input id="lubrifiant-report-imputation" value={imputation} onChange={(event) => setImputation(event.target.value)} placeholder="Toutes les imputations" />
        </div>
        <Button
          type="button"
          onClick={generate}
          disabled={pending || !du || !au || du > au || !parcId || !typeLubrifiantId}
        >
          Générer le rapport
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant={mode === "ventilation" ? "default" : "outline"} onClick={() => setMode("ventilation")}>
          <Droplet aria-hidden="true" /> Ventilation par type de lubrifiant
        </Button>
        <Button type="button" variant={mode === "specificite" ? "default" : "outline"} onClick={() => setMode("specificite")}>
          <BarChart3 aria-hidden="true" /> Rapport de spécifique
        </Button>
      </div>

      {error && <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {!report && !error && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Choisissez une période, un parc et un type de lubrifiant pour générer les rapports.
        </div>
      )}

      {report && (
        <>
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">
                Partie 1 — Parc : {selectedParc?.name ?? ""}
              </h2>
              {canExport && parcRows.length > 0 && (
                <ExportExcel tableName={tableIds.parc} fileName={fileNames.parc} />
              )}
            </div>
            <div className="overflow-x-auto rounded-md border">
              {mode === "ventilation" ? (
                <TableForVentilationParc
                  rows={report.byParc.slice(parcPage.start, parcPage.start + itemsPerPage)}
                  globalRows={report.globalByParcByUnit}
                />
              ) : (
                <TableForSpecificiteParc
                  rows={report.specificByParcAndLubrifiant.slice(parcPage.start, parcPage.start + itemsPerPage)}
                  globalRows={report.globalByParcByUnit}
                />
              )}
            </div>
            <div aria-hidden="true" className="absolute -left-[10000px] top-0">
              {mode === "ventilation" ? (
                <TableForVentilationParc
                  rows={report.byParc}
                  globalRows={report.globalByParcByUnit}
                  tableId={tableIds.parc}
                />
              ) : (
                <TableForSpecificiteParc
                  rows={report.specificByParcAndLubrifiant}
                  globalRows={report.globalByParcByUnit}
                  tableId={tableIds.parc}
                />
              )}
            </div>
            {parcRows.length > 0 && (
              <Pagination
                pageParam="currentPageParc"
                totalPages={parcPage.totalPages}
                currentPage={parcPage.currentPage}
                totalItems={parcRows.length}
                itemsPerPage={itemsPerPage}
              />
            )}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">
                Partie 2 — Engins du Parc : {selectedParc?.name ?? ""}
              </h2>
              {canExport && enginRows.length > 0 && (
                <ExportExcel tableName={tableIds.engin} fileName={fileNames.engin} />
              )}
            </div>
            <div className="overflow-x-auto rounded-md border">
              {mode === "ventilation" ? (
                <TableForVentilationEngin rows={report.byEngin.slice(enginPage.start, enginPage.start + itemsPerPage)} />
              ) : (
                <TableForSpecificiteEngin rows={report.specificByEngin.slice(enginPage.start, enginPage.start + itemsPerPage)} />
              )}
            </div>
            <div aria-hidden="true" className="absolute -left-[10000px] top-0">
              {mode === "ventilation" ? (
                <TableForVentilationEngin rows={report.byEngin} tableId={tableIds.engin} />
              ) : (
                <TableForSpecificiteEngin rows={report.specificByEngin} tableId={tableIds.engin} />
              )}
            </div>
            {enginRows.length > 0 && (
              <Pagination
                pageParam="currentPageEngin"
                totalPages={enginPage.totalPages}
                currentPage={enginPage.currentPage}
                totalItems={enginRows.length}
                itemsPerPage={itemsPerPage}
              />
            )}
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Partie 3 — Les spécifiques</h2>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full border-separate border-spacing-1 text-sm">
                <thead>
                  <tr>
                    <th rowSpan={2} className="border-2 border-black p-2 text-left">Parc</th>
                    <th colSpan={3} className="border-2 border-black bg-muted p-2 text-center">GAS-OIL</th>
                    <th colSpan={3} className="border-2 border-black bg-muted p-2 text-center">HUILE</th>
                    <th colSpan={3} className="border-2 border-black bg-muted p-2 text-center">GRAISSE</th>
                  </tr>
                  <tr>
                    {Array.from({ length: 3 }, (_, group) => (
                      <Fragment key={group}>
                        <th className="border-2 border-black p-2">Obj</th>
                        <th className="border-2 border-black p-2">SP</th>
                        <th className="border-2 border-black p-2">Ecart</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.specificiteByParc.map((item) => (
                    <tr key={item.parcId}>
                      <th className="border-2 border-black p-2 text-left">{item.parcName}</th>
                      {[item.gasoil, item.huile, item.graisse].map((metrics, index) => (
                        <Fragment key={`${item.parcId}-${index}`}>
                          <SpecificiteValuesCell metrics={metrics} value="objectif" />
                          <SpecificiteValuesCell metrics={metrics} value="specific" />
                          <SpecificiteValuesCell metrics={metrics} value="ecart" />
                        </Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground">
              La synthèse reprend les parcs du type de parc sélectionné. Les objectifs de plusieurs sites sont moyennés ; les valeurs sont séparées par unité lorsque nécessaire.
            </p>
          </section>
          <p className="text-sm text-muted-foreground">
            Les saisies sont prises en compte si leur période est entièrement comprise dans la période sélectionnée. Le HRM est additionné une seule fois par engin. L’objectif spécifique correspond à l’objectif annuel de l’année de fin de période ; un spécifique inférieur ou égal à cet objectif est affiché en vert.
          </p>
        </>
      )}
    </div>
  );
}

function TableForVentilationParc({
  rows,
  globalRows,
  tableId,
}: {
  rows: LubrifiantConsumptionReport["byParc"];
  globalRows: LubrifiantConsumptionReport["globalByParcByUnit"];
  tableId?: string;
}): React.JSX.Element {
  return (
    <table id={tableId} className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50 text-left">
        <th className="p-3">Type de parc</th><th className="p-3">Parc</th><th className="p-3">Code</th><th className="p-3">Lubrifiant</th><th className="p-3">Type de lubrifiant</th><th className="p-3 text-right">Consommation</th>
      </tr></thead>
      <tbody>
        <tr className="border-b bg-primary/10 font-semibold">
          <td className="p-3" colSpan={5}>Total du parc — tous les lubrifiants</td>
          <td className="p-3 text-right">
            {formatUnitValues(globalRows, (item) => `${formatNumber(item.qte)} ${item.unite}`)}
          </td>
        </tr>
        {rows.length ? rows.map((item) => (
          <tr key={`${item.parcId}-${item.lubrifiantId}`} className="border-b">
            <td className="p-3">{item.typeParcName}</td><td className="p-3">{item.parcName}</td><td className="p-3">{item.code}</td><td className="p-3">{item.lubrifiantName}</td><td className="p-3">{item.typeLubrifiantName}</td><td className="p-3 text-right">{formatNumber(item.qte)} {item.unite}</td>
          </tr>
        )) : <tr><td colSpan={6} className="p-8 text-center">Aucune consommation pour cette période.</td></tr>}
      </tbody>
    </table>
  );
}

function TableForVentilationEngin({
  rows,
  tableId,
}: {
  rows: LubrifiantConsumptionReport["byEngin"];
  tableId?: string;
}): React.JSX.Element {
  return (
    <table id={tableId} className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50 text-left">
        <th className="p-3">Type de parc</th><th className="p-3">Parc</th><th className="p-3">Site</th><th className="p-3">Engin</th><th className="p-3">Code</th><th className="p-3">Lubrifiant</th><th className="p-3">Type de lubrifiant</th><th className="p-3 text-right">Consommation</th>
      </tr></thead>
      <tbody>
        {rows.length ? rows.map((item) => (
          <tr key={`${item.enginId}-${item.lubrifiantId}`} className="border-b">
            <td className="p-3">{item.typeParcName}</td><td className="p-3">{item.parcName}</td><td className="p-3">{item.siteName}</td><td className="p-3">{item.enginName}</td><td className="p-3">{item.code}</td><td className="p-3">{item.lubrifiantName}</td><td className="p-3">{item.typeLubrifiantName}</td><td className="p-3 text-right">{formatNumber(item.qte)} {item.unite}</td>
          </tr>
        )) : <tr><td colSpan={8} className="p-8 text-center">Aucune consommation pour cette période.</td></tr>}
      </tbody>
    </table>
  );
}

function TableForSpecificiteParc({
  rows,
  globalRows,
  tableId,
}: {
  rows: LubrifiantConsumptionReport["specificByParcAndLubrifiant"];
  globalRows: LubrifiantConsumptionReport["globalByParcByUnit"];
  tableId?: string;
}): React.JSX.Element {
  return (
    <table id={tableId} className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50 text-left">
        <th className="p-3">Type de parc</th><th className="p-3">Parc</th><th className="p-3">Code</th><th className="p-3">Lubrifiant</th><th className="p-3">Type de lubrifiant</th><th className="p-3 text-right">Consommation</th><th className="p-3 text-right">HRM période</th><th className="p-3 text-right">Spécifique (quantité/HRM)</th>
      </tr></thead>
      <tbody>
        <tr className="border-b bg-primary/10 font-semibold">
          <td className="p-3" colSpan={5}>Total du parc — tous les lubrifiants</td>
          <td className="p-3 text-right">
            {formatUnitValues(globalRows, (item) => `${formatNumber(item.qte)} ${item.unite}`)}
          </td>
          <td className="p-3 text-right">
            {formatUnitValues(globalRows, (item) => formatNumber(item.hrm))}
          </td>
          <td className="p-3 text-right">
            {formatUnitValues(globalRows, (item) =>
              item.specific === null ? `— ${item.unite}/h` : `${formatNumber(item.specific)} ${item.unite}/h`,
            )}
          </td>
        </tr>
        {rows.length ? rows.map((item) => (
          <tr key={`${item.parcId}-${item.lubrifiantId}`} className="border-b">
            <td className="p-3">{item.typeParcName}</td><td className="p-3">{item.parcName}</td><td className="p-3">{item.code}</td><td className="p-3">{item.lubrifiantName}</td><td className="p-3">{item.typeLubrifiantName}</td><td className="p-3 text-right">{formatNumber(item.qte)} {item.unite}</td><td className="p-3 text-right">{formatNumber(item.hrm)}</td><td className="p-3 text-right">{item.specific === null ? "—" : `${formatNumber(item.specific)} ${item.unite}/h`}</td>
          </tr>
        )) : <tr><td colSpan={8} className="p-8 text-center">Aucune consommation pour cette période.</td></tr>}
      </tbody>
    </table>
  );
}

function TableForSpecificiteEngin({
  rows,
  tableId,
}: {
  rows: LubrifiantConsumptionReport["specificByEngin"];
  tableId?: string;
}): React.JSX.Element {
  return (
    <table id={tableId} className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50 text-left">
        <th className="p-3">Type de parc</th><th className="p-3">Parc</th><th className="p-3">Site</th><th className="p-3">Engin</th><th className="p-3">Type de lubrifiant</th><th className="p-3 text-right">Consommation</th><th className="p-3 text-right">HRM période</th><th className="p-3 text-right">Spécifique</th><th className="p-3 text-right">Objectif</th><th className="p-3 text-right">Écart</th>
      </tr></thead>
      <tbody>
        {rows.length ? rows.map((item) => (
          <tr key={`${item.enginId}-${item.typeLubrifiantId}-${item.unite}`} className="border-b">
            <td className="p-3">{item.typeParcName}</td><td className="p-3">{item.parcName}</td><td className="p-3">{item.siteName}</td><td className="p-3">{item.enginName}</td><td className="p-3">{item.typeLubrifiantName}</td><td className="p-3 text-right">{formatNumber(item.qte)} {item.unite}</td><td className="p-3 text-right">{formatNumber(item.hrm)}</td><td className="p-3 text-right">{item.specific === null ? "—" : `${formatNumber(item.specific)} ${item.unite}/h`}</td><td className="p-3 text-right">{item.objectif === null ? "—" : `${formatNumber(item.objectif)} ${item.unite}/h`}</td><td className={`p-3 text-right font-medium ${item.ecart === null ? "" : item.ecart <= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>{item.ecart === null ? "—" : `${item.ecart > 0 ? "+" : ""}${formatNumber(item.ecart)} ${item.unite}/h`}</td>
          </tr>
        )) : <tr><td colSpan={10} className="p-8 text-center">Aucune consommation pour cette période.</td></tr>}
      </tbody>
    </table>
  );
}
