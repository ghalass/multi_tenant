"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

import {
  type IndependentBatchModule,
  type IndependentBatchRowResult,
  type IndependentBatchSummary,
} from "@/services/independentBatchImportTypes";

type ModuleDefinition = {
  key: IndependentBatchModule;
  label: string;
  columns: string[];
  required: string[];
};

type ProgressEvent = {
  type: "batch-progress";
  processed: number;
  total: number;
  results: IndependentBatchRowResult[];
};

type ServerEvent =
  | ProgressEvent
  | { type: "done"; summary: IndependentBatchSummary }
  | { type: "error"; message: string };

const MODULES: ModuleDefinition[] = [
  { key: "sites", label: "Sites", columns: ["name"], required: ["name"] },
  { key: "typeparcs", label: "Types de parc", columns: ["name"], required: ["name"] },
  { key: "parcs", label: "Parcs", columns: ["name", "typeparcName"], required: ["name", "typeparcName"] },
  { key: "engins", label: "Engins", columns: ["name", "parcName", "siteName", "active"], required: ["name", "parcName", "siteName"] },
  { key: "typepannes", label: "Types de panne", columns: ["name", "description"], required: ["name"] },
  { key: "pannes", label: "Pannes", columns: ["name", "description", "typepanneName", "parcName"], required: ["name", "description", "typepanneName", "parcName"] },
  { key: "saisie_hrm", label: "Saisies HRM", columns: ["du", "hrm", "nho", "compteur", "enginName", "siteName"], required: ["du", "hrm", "nho", "enginName", "siteName"] },
  { key: "saisie_hims", label: "Saisies HIM", columns: ["du", "him", "ni", "obs", "enginName", "panneName"], required: ["du", "him", "enginName", "panneName"] },
  {
    key: "backlogs",
    label: "Backlogs",
    columns: ["numeroBacklog", "dateDetection", "description", "source", "priorite", "statut", "enginName", "siteName", "dateExecution", "equipe", "observations"],
    required: ["numeroBacklog", "dateDetection", "description", "source", "priorite", "enginName", "siteName"],
  },
  {
    key: "objectifs",
    label: "Objectifs",
    columns: ["annee", "siteName", "parcName", "dispo", "mtbf", "tdm", "spe_huile", "spe_go", "spe_graisse"],
    required: ["annee", "siteName", "parcName"],
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRowResult(value: unknown): value is IndependentBatchRowResult {
  return (
    isRecord(value) &&
    typeof value.row === "number" &&
    typeof value.success === "boolean" &&
    typeof value.message === "string"
  );
}

function parseEvent(value: unknown): ServerEvent {
  if (!isRecord(value) || typeof value.type !== "string") {
    throw new Error("Événement de progression invalide.");
  }
  if (
    value.type === "batch-progress" &&
    typeof value.processed === "number" &&
    typeof value.total === "number" &&
    Array.isArray(value.results) &&
    value.results.every(isRowResult)
  ) {
    return {
      type: "batch-progress",
      processed: value.processed,
      total: value.total,
      results: value.results,
    };
  }
  if (
    value.type === "done" &&
    isRecord(value.summary) &&
    typeof value.summary.total === "number" &&
    typeof value.summary.processed === "number" &&
    typeof value.summary.success === "number" &&
    typeof value.summary.errors === "number" &&
    typeof value.summary.cancelled === "boolean"
  ) {
    return { type: "done", summary: value.summary as IndependentBatchSummary };
  }
  if (value.type === "error" && typeof value.message === "string") {
    return { type: "error", message: value.message };
  }
  throw new Error("Événement de progression invalide.");
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

export default function IndependentBatchImportClient({
  locale,
}: {
  locale: string;
}): import("react").JSX.Element {
  const isArabic = locale === "ar";
  const fileInput = useRef<HTMLInputElement>(null);
  const processedRef = useRef(0);
  const resultsRef = useRef<IndependentBatchRowResult[]>([]);
  const jobIdRef = useRef<string | null>(null);
  const [module, setModule] = useState<IndependentBatchModule | "">("");
  const [fileName, setFileName] = useState("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [rowNumbers, setRowNumbers] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stopDialog, setStopDialog] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [results, setResults] = useState<IndependentBatchRowResult[]>([]);
  const [summary, setSummary] = useState<IndependentBatchSummary | null>(null);
  const [message, setMessage] = useState("");
  const definition = MODULES.find((item) => item.key === module);
  const progress = rows.length ? Math.round((processed / rows.length) * 100) : 0;
  const successCount = results.filter((item) => item.success).length;
  const errorCount = results.length - successCount;
  const preview = rows.slice(0, 5);
  const unmapped = useMemo(
    () => definition?.required.filter((column) => !headers.includes(column)) ?? [],
    [definition, headers],
  );

  function reset(): void {
    jobIdRef.current = null;
    processedRef.current = 0;
    resultsRef.current = [];
    setFileName("");
    setSheetNames([]);
    setSheetName("");
    setWorkbook(null);
    setHeaders([]);
    setRows([]);
    setRowNumbers([]);
    setError("");
    setConfirmed(false);
    setBusy(false);
    setStopDialog(false);
    setProcessed(0);
    setResults([]);
    setSummary(null);
    setMessage("");
    if (fileInput.current) fileInput.current.value = "";
  }

  function readSheet(source: XLSX.WorkBook, selected: string): void {
    setError("");
    setHeaders([]);
    setRows([]);
    setRowNumbers([]);
    setResults([]);
    setSummary(null);
    setConfirmed(false);
    if (!selected) return;

    const worksheet = source.Sheets[selected];
    if (!worksheet) {
      setError("Feuille Excel introuvable.");
      return;
    }
    const grid = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      raw: false,
      dateNF: "yyyy-mm-dd",
      defval: "",
      blankrows: true,
    });
    const first = grid[0];
    if (!first?.length) {
      setError("La première ligne doit contenir les noms des colonnes.");
      return;
    }
    const rawHeaders = first.map((value) =>
      String(value ?? "").replace(/^\uFEFF/, "").trim(),
    );
    const activeColumns = rawHeaders.flatMap((header, index) => {
      if (header) return [index];
      const hasData = grid.slice(1).some((values) => cellText(values[index]).trim());
      return hasData ? [index] : [];
    });
    const unnamedColumnsWithData = activeColumns.filter((index) => !rawHeaders[index]);
    if (unnamedColumnsWithData.length > 0) {
      setError(
        `Des données sont présentes sous des colonnes sans nom (colonne(s) ${unnamedColumnsWithData.map((index) => index + 1).join(", ")}). Ajoutez un en-tête ou videz ces colonnes.`,
      );
      return;
    }

    const nextHeaders = activeColumns.map((index) => rawHeaders[index]);
    if (new Set(nextHeaders.map((value) => value.toLocaleLowerCase())).size !== nextHeaders.length) {
      setError("Les noms de colonnes sont en double.");
      return;
    }
    const parsed = grid.slice(1).flatMap((values, index) => {
      const record = Object.fromEntries(
        activeColumns.map((column) => [rawHeaders[column], values[column] ?? ""]),
      );
      return Object.values(record).some((value) => cellText(value).trim())
        ? [{ record, row: index + 2 }]
        : [];
    });
    setHeaders(nextHeaders);
    setRows(parsed.map(({ record }) => record));
    setRowNumbers(parsed.map(({ row }) => row));
    setResults([]);
    setSummary(null);
    setConfirmed(false);
    setError(parsed.length ? "" : "Aucune ligne de données n’a été trouvée.");
  }

  async function loadFile(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setFileName(file.name);
    try {
      const nextWorkbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
        cellFormula: false,
      });
      if (!nextWorkbook.SheetNames.length) throw new Error("Le classeur ne contient aucune feuille.");
      setWorkbook(nextWorkbook);
      setSheetNames(nextWorkbook.SheetNames);
      setSheetName("");
      setHeaders([]);
      setRows([]);
      setRowNumbers([]);
      setResults([]);
      setSummary(null);
      setConfirmed(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de lire ce fichier.");
    }
  }

  async function start(): Promise<void> {
    if (!module || !confirmed || !rows.length || unmapped.length) return;
    const controller = new AbortController();
    const jobId = crypto.randomUUID();
    jobIdRef.current = jobId;
    processedRef.current = 0;
    resultsRef.current = [];
    setProcessed(0);
    setResults([]);
    setSummary(null);
    setMessage("");
    setBusy(true);
    try {
      const response = await fetch("/api/independent-batch-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, module, rows, rowNumbers }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const serverMessage = isRecord(body) && typeof body.message === "string" ? body.message : "";
        throw new Error(serverMessage || `Erreur serveur (${response.status}).`);
      }
      if (!response.body) throw new Error("Le flux de progression est indisponible.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      const consume = (line: string): void => {
        if (!line.trim()) return;
        const event = parseEvent(JSON.parse(line));
        if (event.type === "batch-progress") {
          processedRef.current = event.processed;
          setProcessed(event.processed);
          resultsRef.current = [...resultsRef.current, ...event.results];
          setResults(resultsRef.current);
        } else if (event.type === "done") {
          setSummary(event.summary);
          setMessage(
            event.summary.cancelled
              ? `Import interrompu : ${event.summary.processed} ligne(s) traitée(s).`
              : `Import terminé : ${event.summary.success} réussite(s), ${event.summary.errors} erreur(s).`,
          );
          finished = true;
        } else {
          throw new Error(event.message);
        }
      };
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        buffer += decoder.decode(part.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(consume);
      }
      buffer += decoder.decode();
      if (buffer.trim()) consume(buffer);
      if (!finished && !controller.signal.aborted) throw new Error("Le serveur a interrompu le traitement avant son bilan.");
    } catch (cause) {
      if (controller.signal.aborted) {
        setMessage(`Arrêt demandé. ${processedRef.current} ligne(s) traitée(s) ; les lignes déjà validées sont conservées.`);
        setSummary({
          total: rows.length,
          processed: processedRef.current,
          success: resultsRef.current.filter((item) => item.success).length,
          errors: resultsRef.current.filter((item) => !item.success).length,
          cancelled: true,
        });
      } else {
        setError(cause instanceof Error ? cause.message : "Erreur inattendue pendant l’import.");
      }
    } finally {
      jobIdRef.current = null;
      setBusy(false);
    }
  }

  async function confirmStop(): Promise<void> {
    setStopDialog(false);
    if (!jobIdRef.current) return;
    try {
      const response = await fetch("/api/independent-batch-import/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: jobIdRef.current }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || !isRecord(body) || body.success !== true) {
        const detail = isRecord(body) && typeof body.message === "string" ? body.message : "";
        throw new Error(detail || "Impossible d’arrêter le traitement.");
      }
      setMessage(isArabic
        ? "تم طلب الإيقاف؛ ستكتمل الدفعة الحالية أولاً."
        : "Arrêt demandé. Le lot en cours terminera avant l’arrêt.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d’arrêter le traitement.");
    }
  }

  function exportErrors(): void {
    const errors = results.filter((result) => !result.success);
    if (errors.length === 0) return;

    const moduleLabel = MODULES.find((item) => item.key === module)?.label ?? module;
    const contents = [
      "Erreurs d’import en lots",
      `Module : ${moduleLabel}`,
      `Fichier : ${fileName || "non spécifié"}`,
      `Feuille : ${sheetName || "non spécifiée"}`,
      `Nombre d’erreurs : ${errors.length}`,
      "",
      ...errors.map((result) => `Ligne Excel ${result.row} : ${result.message}`),
    ].join("\r\n");
    const blob = new Blob(["\uFEFF", contents], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeModule = (module || "import").replace(/[^a-z0-9_-]/gi, "-");
    link.href = url;
    link.download = `erreurs-import-${safeModule}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="mx-auto max-w-6xl space-y-6 py-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">{isArabic ? "نظام مستقل" : "Nouveau moteur autonome"}</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isArabic ? "الاستيراد على دفعات" : "Importation par lots"}
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          {isArabic
            ? "يعالج الخادم الملف في مجموعات من 100 صف، مع حفظ نتائج كل صف."
            : "Le moteur traite le fichier en groupes de 100 lignes, dans des transactions distinctes, avec un résultat détaillé par ligne."}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{isArabic ? "1. الوحدة" : "1. Module"}</CardTitle>
            <CardDescription>{isArabic ? "اختر الوحدة المستهدفة" : "Choisissez le module à importer"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              aria-label={isArabic ? "الوحدة" : "Module"}
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              value={module}
              disabled={busy}
              onChange={(event) => {
                setModule(event.target.value as IndependentBatchModule | "");
                setConfirmed(false);
              }}
            >
              <option value="">{isArabic ? "اختر وحدة" : "Sélectionner un module"}</option>
              {MODULES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            {definition && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{isArabic ? "أعمدة النموذج" : "Colonnes du modèle"}</p>
                <div className="flex flex-wrap gap-2">
                  {definition.columns.map((column) => (
                    <Badge key={column} variant={unmapped.includes(column) ? "destructive" : "secondary"}>{column}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isArabic ? "2. الملف" : "2. Fichier"}</CardTitle>
            <CardDescription>Excel (.xlsx, .xls) ou CSV</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls,.csv"
              aria-label={isArabic ? "اختر الملف" : "Choisir un fichier Excel ou CSV"}
              onChange={loadFile}
              disabled={busy}
            />
            {fileName && (
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="size-4 text-primary" aria-hidden="true" />
                <span className="truncate">{fileName}</span>
                {rows.length > 0 && <Badge variant="secondary">{rows.length} lignes</Badge>}
              </div>
            )}
            {sheetNames.length > 0 && (
              <label className="block space-y-2 text-sm font-medium">
                {isArabic ? "ورقة العمل" : "Feuille de calcul"}
                <select
                  aria-label={isArabic ? "ورقة العمل" : "Feuille de calcul"}
                  className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                  value={sheetName}
                  disabled={busy}
                  onChange={(event) => {
                    setSheetName(event.target.value);
                    if (workbook) readSheet(workbook, event.target.value);
                  }}
                >
                  <option value="">
                    {isArabic ? "اختر ورقة" : "Sélectionnez une feuille"}
                  </option>
                  {sheetNames.map((name) => <option key={name}>{name}</option>)}
                </select>
              </label>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {message && (
              <Alert>
                <CheckCircle2 aria-hidden="true" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{isArabic ? "معاينة البيانات" : "Aperçu avant import"}</CardTitle>
            <CardDescription>
              {isArabic
                ? "تتم الكتابة على دفعات من 100 صف. تتم معالجة الأخطاء بشكل جزئي."
                : "Les enregistrements existants sont mis à jour. Les insertions sont groupées avec createMany, par lots de 100 lignes."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {sheetName && headers.length > 0 && !error && unmapped.length > 0 && definition && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>{isArabic ? "أعمدة مطلوبة" : "Colonnes attendues manquantes"}</AlertTitle>
                <AlertDescription>{unmapped.join(", ")}</AlertDescription>
              </Alert>
            )}
            <div className="max-h-72 overflow-auto rounded-md border">
              <table className="w-full min-w-max border-collapse text-start text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="border-b px-3 py-2 text-start">Ligne Excel</th>
                    {headers.map((header) => <th key={header} className="border-b px-3 py-2 text-start">{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((record, index) => (
                    <tr key={rowNumbers[index]} className="odd:bg-muted/30">
                      <td className="border-b px-3 py-2">{rowNumbers[index]}</td>
                      {headers.map((header) => (
                        <td key={header} className="max-w-64 truncate border-b px-3 py-2">
                          {cellText(record[header]) || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(busy || summary) && (
              <div className="space-y-2" aria-live="polite">
                <div className="flex justify-between text-sm">
                  <span>{busy ? "Import par lots en cours" : "Progression"}</span>
                  <span>{processed}/{rows.length} ({progress}%)</span>
                </div>
                <Progress value={progress} aria-label="Progression de l’import en lots" />
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={busy || Boolean(summary)}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="size-4 accent-primary"
                />
                {isArabic ? "أؤكد بدء الاستيراد" : "Je confirme l’import du lot"}
              </label>
              {busy ? (
                <Button type="button" variant="destructive" onClick={() => setStopDialog(true)}>
                  {isArabic ? "إيقاف" : "Arrêter l’import"}
                </Button>
              ) : summary ? (
                <Button type="button" variant="outline" onClick={reset}>
                  {isArabic ? "إعادة البدء" : "Nouvel import"}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={start}
                  disabled={!module || !confirmed || Boolean(unmapped.length)}
                >
                  <Upload aria-hidden="true" />
                  {isArabic ? "بدء الاستيراد" : "Démarrer le traitement par lots"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{isArabic ? "النتائج" : "Résultats du lot"}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Badge variant="secondary">Réussies : {successCount}</Badge>
              <Badge variant={errorCount ? "destructive" : "secondary"}>Erreurs : {errorCount}</Badge>
              {errorCount > 0 && (
                <Button type="button" variant="outline" onClick={exportErrors}>
                  <Download aria-hidden="true" />
                  {isArabic ? "تصدير الأخطاء إلى TXT" : "Exporter les erreurs en TXT"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="max-h-80 space-y-2 overflow-auto">
            {results.filter((result) => !result.success).map((result) => (
              <div key={result.row} className="rounded-md border border-destructive/30 p-3 text-sm">
                <p className="font-medium">Ligne Excel {result.row}</p>
                <p className="text-muted-foreground">{result.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={stopDialog} onOpenChange={setStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isArabic ? "إيقاف الاستيراد؟" : "Arrêter le traitement par lots ?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic
                ? "ستنتهي المجموعة الحالية أولاً. ستظل الصفوف التي تمت معالجتها محفوظة."
                : "Le lot de 100 lignes en cours terminera sa transaction. Les lots déjà validés restent enregistrés ; les lots suivants ne démarreront pas."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isArabic ? "متابعة" : "Continuer"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmStop}
            >
              {isArabic ? "تأكيد الإيقاف" : "Confirmer l’arrêt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
