"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Droplet } from "lucide-react";
import { ExportExcel } from "@/components/export-excel";
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
import type {
  LubrifiantConsumptionReport,
  LubrifiantReportOptions,
} from "@/server/rapports/rapport-lubrifiants";

type Props = {
  options: LubrifiantReportOptions;
  report?: LubrifiantConsumptionReport;
  error?: string;
  canExport: boolean;
};

type ReportMode = "engin" | "specificite";

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
  const [mode, setMode] = useState<ReportMode>("engin");
  const [du, setDu] = useState(searchParams.get("du") ?? "");
  const [au, setAu] = useState(searchParams.get("au") ?? "");
  const [typeParcId, setTypeParcId] = useState(searchParams.get("typeParcId") ?? "");
  const [parcId, setParcId] = useState(searchParams.get("parcId") ?? "");
  const [typeLubrifiantId, setTypeLubrifiantId] = useState(searchParams.get("typeLubrifiantId") ?? "");
  const [lubrifiantId, setLubrifiantId] = useState(searchParams.get("lubrifiantId") ?? "");
  const [enginName, setEnginName] = useState(searchParams.get("enginName") ?? "");
  const [section, setSection] = useState(searchParams.get("section") ?? "");
  const [imputation, setImputation] = useState(searchParams.get("imputation") ?? "");

  const parcs = options.typeParcs.find((item) => item.id === typeParcId)?.parcs ?? [];
  const lubrifiants = options.typeLubrifiants.find((item) => item.id === typeLubrifiantId)?.lubrifiants ?? [];

  function generate(): void {
    if (!du || !au || du > au) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("du", du);
    params.set("au", au);
    if (typeParcId) params.set("typeParcId", typeParcId);
    else params.delete("typeParcId");
    if (parcId) params.set("parcId", parcId);
    else params.delete("parcId");
    if (typeLubrifiantId) params.set("typeLubrifiantId", typeLubrifiantId);
    else params.delete("typeLubrifiantId");
    if (lubrifiantId) params.set("lubrifiantId", lubrifiantId);
    else params.delete("lubrifiantId");
    if (enginName.trim()) params.set("enginName", enginName.trim());
    else params.delete("enginName");
    if (section.trim()) params.set("section", section.trim());
    else params.delete("section");
    if (imputation.trim()) params.set("imputation", imputation.trim());
    else params.delete("imputation");
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  const reportTableId = mode === "engin" ? "rapport-lubrifiants-engin" : "rapport-lubrifiants-specificite";
  const reportFileName = mode === "engin" ? "Consommations_lubrifiants_par_engin" : "Consommations_specifiques_lubrifiants";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <BarChart3 className="size-8" />
          Rapports des lubrifiants
        </h1>
        <p className="mt-1 text-muted-foreground">
          Analysez les consommations par engin et la consommation spécifique par parc et lubrifiant.
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
          <Select value={typeParcId || "all"} onValueChange={(value) => { setTypeParcId(value === "all" ? "" : value); setParcId(""); }}>
            <SelectTrigger><SelectValue placeholder="Tous les types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {options.typeParcs.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-48 gap-2">
          <Label>Parc</Label>
          <Select value={parcId || "all"} onValueChange={(value) => setParcId(value === "all" ? "" : value)} disabled={!typeParcId}>
            <SelectTrigger><SelectValue placeholder="Tous les parcs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les parcs</SelectItem>
              {parcs.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-48 gap-2">
          <Label>Type de lubrifiant</Label>
          <Select value={typeLubrifiantId || "all"} onValueChange={(value) => { setTypeLubrifiantId(value === "all" ? "" : value); setLubrifiantId(""); }}>
            <SelectTrigger><SelectValue placeholder="Tous les types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {options.typeLubrifiants.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-48 gap-2">
          <Label>Lubrifiant</Label>
          <Select value={lubrifiantId || "all"} onValueChange={(value) => setLubrifiantId(value === "all" ? "" : value)} disabled={!typeLubrifiantId}>
            <SelectTrigger><SelectValue placeholder="Tous les lubrifiants" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les lubrifiants</SelectItem>
              {lubrifiants.map((item) => <SelectItem key={item.id} value={item.id}>{item.code} — {item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-48 gap-2">
          <Label htmlFor="lubrifiant-report-engin">Engin</Label>
          <Input id="lubrifiant-report-engin" value={enginName} onChange={(event) => setEnginName(event.target.value)} placeholder="Tous les engins" />
        </div>
        <div className="grid min-w-48 gap-2">
          <Label htmlFor="lubrifiant-report-section">Section</Label>
          <Input id="lubrifiant-report-section" value={section} onChange={(event) => setSection(event.target.value)} placeholder="Toutes les sections" />
        </div>
        <div className="grid min-w-48 gap-2">
          <Label htmlFor="lubrifiant-report-imputation">Imputation</Label>
          <Input id="lubrifiant-report-imputation" value={imputation} onChange={(event) => setImputation(event.target.value)} placeholder="Toutes les imputations" />
        </div>
        <Button type="button" onClick={generate} disabled={pending || !du || !au || du > au}>Générer le rapport</Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button type="button" variant={mode === "engin" ? "default" : "outline"} onClick={() => setMode("engin")}>
            <Droplet aria-hidden="true" /> Par engin
          </Button>
          <Button type="button" variant={mode === "specificite" ? "default" : "outline"} onClick={() => setMode("specificite")}>
            <BarChart3 aria-hidden="true" /> Spécifique
          </Button>
        </div>
        {canExport && report && report[mode === "engin" ? "byEngin" : "specificByParcAndLubrifiant"].length > 0 && (
          <ExportExcel tableName={reportTableId} fileName={reportFileName} />
        )}
      </div>

      {error && <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {!report && !error && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Sélectionnez une période puis générez le rapport.
        </div>
      )}
      {report && mode === "engin" && (
        <div className="rounded-md border">
          <TableForEngin report={report} tableId={reportTableId} />
        </div>
      )}
      {report && mode === "specificite" && (
        <div className="rounded-md border">
          <TableForSpecificite report={report} tableId={reportTableId} />
        </div>
      )}
      {report && (
        <p className="text-sm text-muted-foreground">
          Les saisies prises en compte sont entièrement comprises dans la période. Pour chaque couple parc/lubrifiant, le HRM est la somme des HRM de la période pour les engins ayant consommé ce lubrifiant.
        </p>
      )}
    </div>
  );
}

function TableForEngin({
  report,
  tableId,
}: {
  report: LubrifiantConsumptionReport;
  tableId: string;
}): React.JSX.Element {
  return (
    <table id={tableId} className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50 text-left">
        <th className="p-3">Type de parc</th><th className="p-3">Parc</th><th className="p-3">Engin</th><th className="p-3">Code</th><th className="p-3">Lubrifiant</th><th className="p-3">Désignation</th><th className="p-3 text-right">Consommation</th>
      </tr></thead>
      <tbody>
        {report.byEngin.length ? report.byEngin.map((item) => (
          <tr key={`${item.enginId}-${item.lubrifiantId}`} className="border-b">
            <td className="p-3">{item.typeParcName}</td><td className="p-3">{item.parcName}</td><td className="p-3">{item.enginName}</td><td className="p-3">{item.code}</td><td className="p-3">{item.lubrifiantName}</td><td className="p-3">{item.typeLubrifiantName}</td><td className="p-3 text-right">{item.qte.toLocaleString()} {item.unite}</td>
          </tr>
        )) : <tr><td colSpan={7} className="p-8 text-center">Aucune consommation pour cette période.</td></tr>}
      </tbody>
    </table>
  );
}

function TableForSpecificite({
  report,
  tableId,
}: {
  report: LubrifiantConsumptionReport;
  tableId: string;
}): React.JSX.Element {
  return (
    <table id={tableId} className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50 text-left">
        <th className="p-3">Type de parc</th><th className="p-3">Parc</th><th className="p-3">Code</th><th className="p-3">Lubrifiant</th><th className="p-3">Désignation</th><th className="p-3 text-right">Consommation</th><th className="p-3 text-right">HRM période</th><th className="p-3 text-right">Spécifique (quantité/HRM)</th>
      </tr></thead>
      <tbody>
        {report.specificByParcAndLubrifiant.length ? report.specificByParcAndLubrifiant.map((item) => (
          <tr key={`${item.parcId}-${item.lubrifiantId}`} className="border-b">
            <td className="p-3">{item.typeParcName}</td><td className="p-3">{item.parcName}</td><td className="p-3">{item.code}</td><td className="p-3">{item.lubrifiantName}</td><td className="p-3">{item.typeLubrifiantName}</td><td className="p-3 text-right">{item.qte.toLocaleString()} {item.unite}</td><td className="p-3 text-right">{item.hrm.toLocaleString()}</td><td className="p-3 text-right">{item.specific === null ? "—" : `${item.specific.toFixed(4)} ${item.unite}/h`}</td>
          </tr>
        )) : <tr><td colSpan={8} className="p-8 text-center">Aucune consommation pour cette période.</td></tr>}
      </tbody>
    </table>
  );
}
