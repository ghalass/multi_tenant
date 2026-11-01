"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ModuleKey =
  | "sites"
  | "typeparcs"
  | "parcs"
  | "engins"
  | "typepannes"
  | "pannes"
  | "saisie_hrm"
  | "saisie_hims"
  | "backlogs"
  | "objectifs";

type ModuleDefinition = {
  key: ModuleKey;
  label: string;
  columns: string[];
  required: string[];
};

type ImportResult = {
  row: number;
  success: boolean;
  message: string;
};

type BulkImportResponse = {
  success: boolean;
  message: string;
  results: ImportResult[];
  summary: {
    total: number;
    success: number;
    errors: number;
  };
};

type BulkImportEvent =
  | {
      type: "progress";
      processed: number;
      total: number;
      result: ImportResult;
    }
  | { type: "done"; response: BulkImportResponse }
  | { type: "error"; message: string };

const MODULES: ModuleDefinition[] = [
  { key: "sites", label: "Sites", columns: ["name"], required: ["name"] },
  {
    key: "typeparcs",
    label: "Types de parc",
    columns: ["name"],
    required: ["name"],
  },
  {
    key: "parcs",
    label: "Parcs",
    columns: ["name", "typeparcName"],
    required: ["name", "typeparcName"],
  },
  {
    key: "engins",
    label: "Engins",
    columns: ["name", "parcName", "siteName", "active"],
    required: ["name", "parcName", "siteName"],
  },
  {
    key: "typepannes",
    label: "Types de panne",
    columns: ["name", "description"],
    required: ["name"],
  },
  {
    key: "pannes",
    label: "Pannes",
    columns: ["name", "description", "typepanneName", "parcName"],
    required: ["name", "description", "typepanneName", "parcName"],
  },
  {
    key: "saisie_hrm",
    label: "Saisies HRM",
    columns: ["du", "hrm", "nho", "compteur", "enginName", "siteName"],
    required: ["du", "hrm", "nho", "enginName", "siteName"],
  },
  {
    key: "saisie_hims",
    label: "Saisies HIM",
    columns: ["du", "him", "ni", "obs", "enginName", "panneName"],
    required: ["du", "him", "enginName", "panneName"],
  },
  {
    key: "backlogs",
    label: "Backlogs",
    columns: [
      "numeroBacklog",
      "dateDetection",
      "description",
      "source",
      "priorite",
      "statut",
      "enginName",
      "siteName",
      "quantite",
      "equipe",
      "dateExecution",
      "observations",
    ],
    required: [
      "numeroBacklog",
      "dateDetection",
      "description",
      "source",
      "priorite",
      "enginName",
      "siteName",
    ],
  },
  {
    key: "objectifs",
    label: "Objectifs",
    columns: [
      "annee",
      "siteName",
      "parcName",
      "dispo",
      "mtbf",
      "tdm",
      "spe_huile",
      "spe_go",
      "spe_graisse",
    ],
    required: ["annee", "siteName", "parcName"],
  },
];

const TEXT = {
  fr: {
    eyebrow: "Gestion des données",
    title: "Importation en masse",
    description:
      "Choisissez un module, chargez votre fichier et vérifiez les lignes avant de les envoyer.",
    stepModule: "1. Module",
    stepFile: "2. Fichier",
    chooseModule: "Sélectionner un module",
    chooseFile: "Choisir un fichier Excel ou CSV",
    supportedFiles: "Formats acceptés : .xlsx, .xls et .csv",
    worksheet: "Feuille de calcul",
    chooseSheet: "Choisir une feuille",
    rows: "lignes détectées",
    columns: "Colonnes attendues",
    required: "Obligatoires",
    optional: "Facultatives",
    missing: "Colonnes obligatoires manquantes",
    preview: "Aperçu des données",
    previewHint: "Les premières lignes du fichier sont affichées.",
    row: "Ligne Excel",
    confirmation:
      "Je confirme l’envoi des lignes affichées au module sélectionné.",
    start: "Démarrer l’importation",
    processing: "Importation en cours…",
    progress: "Avancement",
    stop: "Arrêter l’importation",
    stopTitle: "Arrêter l’importation en cours ?",
    stopDescription:
      "La ligne en cours peut se terminer avant l’arrêt. Les lignes traitées sont conservées et les suivantes ne seront pas démarrées.",
    confirmStop: "Oui, arrêter",
    keepImporting: "Continuer l’importation",
    stoppedAfter: "Importation arrêtée après",
    idle: "Aucune donnée n’est envoyée avant le démarrage explicite.",
    chooseModuleFirst: "Sélectionnez un module et une feuille pour continuer.",
    noRows: "Aucune ligne de données n’a été trouvée dans cette feuille.",
    noHeaders: "La première ligne doit contenir les noms des colonnes.",
    duplicateHeaders: "Les noms des colonnes doivent être uniques.",
    noSheet: "Cette feuille ne contient pas de données lisibles.",
    fileError: "Impossible de lire ce fichier.",
    summary: "Résultat de l’importation",
    succeeded: "Réussies",
    failed: "En erreur",
    reset: "Recommencer",
    template: "Télécharger un modèle",
    templateDownloaded: "Le modèle du module sélectionné a été téléchargé.",
    emptyRows: "ligne(s) vide(s) ignorée(s)",
    consent: "Confirmez l’importation pour activer le démarrage.",
  },
  ar: {
    eyebrow: "إدارة البيانات",
    title: "استيراد جماعي",
    description: "اختر وحدة، وحمّل ملفك، وراجع الصفوف قبل إرسالها.",
    stepModule: "١. الوحدة",
    stepFile: "٢. الملف",
    chooseModule: "اختر وحدة",
    chooseFile: "اختر ملف Excel أو CSV",
    supportedFiles: "الصيغ المدعومة: xlsx وxls وcsv",
    worksheet: "ورقة العمل",
    chooseSheet: "اختر ورقة",
    rows: "صفوف",
    columns: "الأعمدة المطلوبة",
    required: "إلزامي",
    optional: "اختياري",
    missing: "الأعمدة الإلزامية المفقودة",
    preview: "معاينة البيانات",
    previewHint: "يتم عرض الصفوف الأولى من الملف.",
    row: "صف Excel",
    confirmation: "أؤكد إرسال الصفوف المعروضة إلى الوحدة المختارة.",
    start: "بدء الاستيراد",
    processing: "جارٍ الاستيراد…",
    progress: "التقدم",
    stop: "إيقاف الاستيراد",
    stopTitle: "هل تريد إيقاف الاستيراد الجاري؟",
    stopDescription: "قد يكتمل الصف الجاري قبل الإيقاف. سيتم الاحتفاظ بالصفوف المعالجة ولن يبدأ استيراد الصفوف التالية.",
    confirmStop: "نعم، أوقف",
    keepImporting: "متابعة الاستيراد",
    stoppedAfter: "تم إيقاف الاستيراد بعد",
    idle: "لن يتم إرسال أي بيانات قبل بدء العملية صراحةً.",
    chooseModuleFirst: "اختر وحدة وورقة للمتابعة.",
    noRows: "لم يتم العثور على صفوف بيانات في هذه الورقة.",
    noHeaders: "يجب أن يحتوي الصف الأول على أسماء الأعمدة.",
    duplicateHeaders: "يجب أن تكون أسماء الأعمدة فريدة.",
    noSheet: "لا تحتوي هذه الورقة على بيانات قابلة للقراءة.",
    fileError: "تعذرت قراءة الملف.",
    summary: "نتيجة الاستيراد",
    succeeded: "ناجح",
    failed: "خطأ",
    reset: "إعادة البدء",
    template: "تنزيل نموذج",
    templateDownloaded: "تم تنزيل نموذج الوحدة المختارة.",
    emptyRows: "صفوف فارغة تم تجاهلها",
    consent: "أكّد الاستيراد لتفعيل البدء.",
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isImportResult(value: unknown): value is ImportResult {
  return (
    isRecord(value) &&
    typeof value.row === "number" &&
    typeof value.success === "boolean" &&
    typeof value.message === "string"
  );
}

function isBulkImportEvent(value: unknown): value is BulkImportEvent {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "progress") {
    return (
      typeof value.processed === "number" &&
      typeof value.total === "number" &&
      isImportResult(value.result)
    );
  }
  if (value.type === "done") {
    if (!isRecord(value.response) || !isRecord(value.response.summary)) return false;
    return (
      typeof value.response.success === "boolean" &&
      typeof value.response.message === "string" &&
      Array.isArray(value.response.results) &&
      value.response.results.every(isImportResult) &&
      typeof value.response.summary.total === "number" &&
      typeof value.response.summary.success === "number" &&
      typeof value.response.summary.errors === "number"
    );
  }
  return value.type === "error" && typeof value.message === "string";
}

function cellToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

function getResponseMessage(value: unknown, fallback: string): string {
  if (!isRecord(value)) return fallback;
  if (typeof value.message === "string" && value.message.trim()) {
    return value.message;
  }
  if (Array.isArray(value.data)) {
    const firstError = value.data.find(
      (item) => isRecord(item) && typeof item.message === "string",
    );
    if (isRecord(firstError) && typeof firstError.message === "string") {
      return firstError.message;
    }
  }
  return fallback;
}

export default function BulkImportClient({
  locale,
}: {
  locale: string;
}): import("react").JSX.Element {
  const isArabic = locale === "ar";
  const text = isArabic ? TEXT.ar : TEXT.fr;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const processedCountRef = useRef(0);
  const [moduleKey, setModuleKey] = useState<ModuleKey | "">("");
  const [fileName, setFileName] = useState("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fileError, setFileError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [notice, setNotice] = useState("");
  const [rowNumbers, setRowNumbers] = useState<number[]>([]);

  const selectedModule = MODULES.find((module) => module.key === moduleKey);
  const missingColumns = useMemo(() => {
    if (!selectedModule) return [];
    return selectedModule.required.filter((required) => !headers.includes(required));
  }, [headers, selectedModule]);
  const previewRows = rows.slice(0, 6);
  const succeeded = results.filter((result) => result.success).length;
  const failed = results.length - succeeded;
  const progress = rows.length > 0
    ? Math.round((processedCount / rows.length) * 100)
    : 0;

  function resetImport(): void {
    setFileName("");
    setSheetNames([]);
    setSelectedSheet("");
    setWorkbook(null);
    setHeaders([]);
    setRows([]);
    setRowNumbers([]);
    setFileError("");
    setConfirmed(false);
    setIsProcessing(false);
    setProcessedCount(0);
    processedCountRef.current = 0;
    setResults([]);
    setNotice("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function selectModule(value: string): void {
    resetImport();
    setModuleKey(value as ModuleKey | "");
  }

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    resetImport();
    setFileName(file.name);
    try {
      const data = await file.arrayBuffer();
      const nextWorkbook = XLSX.read(data, {
        type: "array",
        cellDates: true,
        cellFormula: false,
      });
      if (nextWorkbook.SheetNames.length === 0) {
        setFileError(text.noSheet);
        return;
      }
      setWorkbook(nextWorkbook);
      setSheetNames(nextWorkbook.SheetNames);
      setSelectedSheet(nextWorkbook.SheetNames[0]);
      readWorksheet(nextWorkbook, nextWorkbook.SheetNames[0]);
    } catch (error) {
      console.error("Erreur lors de la lecture du fichier d’import en masse :", error);
      setFileError(text.fileError);
    }
  }

  function readWorksheet(source: XLSX.WorkBook, name: string): void {
    setFileError("");
    setConfirmed(false);
    setProcessedCount(0);
    processedCountRef.current = 0;
    setResults([]);
    const worksheet = source.Sheets[name];
    if (!worksheet) {
      setHeaders([]);
      setRows([]);
      setFileError(text.noSheet);
      return;
    }

    const grid = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      raw: false,
      dateNF: "yyyy-mm-dd",
      defval: "",
      blankrows: true,
    });
    const headerRow = grid[0];
    if (!headerRow || headerRow.every((value) => !String(value ?? "").trim())) {
      setHeaders([]);
      setRows([]);
      setFileError(text.noHeaders);
      return;
    }

    const nextHeaders = headerRow.map((value) =>
      String(value ?? "").replace(/^\uFEFF/, "").trim(),
    );
    if (nextHeaders.some((header) => !header)) {
      setHeaders(nextHeaders);
      setRows([]);
      setFileError(text.noHeaders);
      return;
    }
    if (new Set(nextHeaders.map((header) => header.toLocaleLowerCase())).size !== nextHeaders.length) {
      setHeaders(nextHeaders);
      setRows([]);
      setFileError(text.duplicateHeaders);
      return;
    }

    const parsedRows = grid.slice(1).flatMap((values, index) => {
      const record: Record<string, unknown> = {};
      nextHeaders.forEach((header, index) => {
        const value = values[index];
        record[header] = value === undefined || value === null ? "" : value;
      });
      return Object.values(record).some((value) => String(value ?? "").trim())
        ? [{ record, rowNumber: index + 2 }]
        : [];
    });
    const nextRows = parsedRows.map(({ record }) => record);
    setHeaders(nextHeaders);
    setRows(nextRows);
    setRowNumbers(parsedRows.map(({ rowNumber }) => rowNumber));
    if (nextRows.length === 0) setFileError(text.noRows);
  }

  function downloadTemplate(): void {
    if (!selectedModule) return;
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([selectedModule.columns]);
    XLSX.utils.book_append_sheet(workbook, worksheet, selectedModule.key);
    XLSX.writeFile(workbook, `modele-import-${selectedModule.key}.xlsx`);
    setNotice(text.templateDownloaded);
  }

  async function startImport(): Promise<void> {
    if (!selectedModule || !confirmed || missingColumns.length > 0 || rows.length === 0) {
      return;
    }
    setIsProcessing(true);
    setProcessedCount(0);
    processedCountRef.current = 0;
    setResults([]);
    setNotice("");

    try {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const response = await fetch("/api/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: selectedModule.key,
          rows,
          rowNumbers,
        }),
        signal: abortController.signal,
      });
      if (!response.ok) {
        const responseBody: unknown = await response.json().catch(() => null);
        throw new Error(getResponseMessage(responseBody, "Erreur pendant l'import en masse."));
      }
      if (!response.body) {
        throw new Error("Le flux de progression est indisponible.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedDone = false;
      const handleEvent = (line: string): void => {
        if (!line.trim()) return;
        let parsedEvent: unknown;
        try {
          parsedEvent = JSON.parse(line);
        } catch {
          throw new Error("Événement de progression invalide.");
        }
        if (!isBulkImportEvent(parsedEvent)) {
          throw new Error("Événement de progression invalide.");
        }
        const event = parsedEvent;
        if (event.type === "progress") {
          setProcessedCount(event.processed);
          processedCountRef.current = event.processed;
          setResults((current) => [...current, event.result]);
          return;
        }
        if (event.type === "done") {
          setResults(event.response.results);
          setProcessedCount(event.response.summary.total);
          processedCountRef.current = event.response.summary.total;
          setNotice(event.response.message);
          receivedDone = true;
          return;
        }
        if (event.type === "error") {
          throw new Error(event.message);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) handleEvent(line);
      }
      buffer += decoder.decode();
      if (buffer.trim()) handleEvent(buffer);
      if (!receivedDone) {
        throw new Error("Le flux s’est terminé avant la fin de l’importation.");
      }
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) {
        setNotice(`${text.stoppedAfter} ${processedCountRef.current} / ${rows.length} ligne(s).`);
      } else {
        setNotice(error instanceof Error ? error.message : "Erreur réseau.");
      }
    } finally {
      abortControllerRef.current = null;
      setIsProcessing(false);
    }
  }

  function confirmStop(): void {
    setStopDialogOpen(false);
    abortControllerRef.current?.abort();
  }

  const missingColumnsText = missingColumns.join(", ");

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="mx-auto max-w-6xl space-y-6 py-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">{text.eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{text.title}</h1>
        <p className="max-w-3xl text-muted-foreground">{text.description}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{text.stepModule}</CardTitle>
            <CardDescription>{text.chooseModule}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              aria-label={text.chooseModule}
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              value={moduleKey}
              onChange={(event) => selectModule(event.target.value)}
              disabled={isProcessing}
            >
              <option value="">{text.chooseModule}</option>
              {MODULES.map((module) => (
                <option key={module.key} value={module.key}>
                  {module.label}
                </option>
              ))}
            </select>

            {selectedModule && (
              <>
                <div>
                  <p className="mb-2 text-sm font-medium">{text.columns}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedModule.columns.map((column) => (
                      <Badge
                        key={column}
                        variant={selectedModule.required.includes(column) ? "default" : "secondary"}
                      >
                        {column}
                        <span className="ms-1 text-[10px] opacity-75">
                          {selectedModule.required.includes(column) ? text.required : text.optional}
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={downloadTemplate}>
                  <Download aria-hidden="true" />
                  {text.template}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{text.stepFile}</CardTitle>
            <CardDescription>{text.supportedFiles}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              aria-label={text.chooseFile}
              onChange={handleFileChange}
              disabled={isProcessing}
            />
            {fileName && (
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="size-4 text-primary" aria-hidden="true" />
                <span className="truncate">{fileName}</span>
                {rows.length > 0 && (
                  <Badge variant="secondary">{rows.length} {text.rows}</Badge>
                )}
              </div>
            )}
            {sheetNames.length > 1 && (
              <label className="block space-y-2 text-sm font-medium">
                {text.worksheet}
                <select
                  aria-label={text.worksheet}
                  className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm font-normal"
                  value={selectedSheet}
                  onChange={(event) => {
                    setSelectedSheet(event.target.value);
                    if (workbook) readWorksheet(workbook, event.target.value);
                  }}
                  disabled={isProcessing}
                >
                  {sheetNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
            )}
            {fileError && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>{text.fileError}</AlertTitle>
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}
            {notice && (
              <Alert>
                <CheckCircle2 aria-hidden="true" />
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>{text.preview}</CardTitle>
                <CardDescription>{text.previewHint}</CardDescription>
              </div>
              <Badge variant={missingColumns.length ? "destructive" : "secondary"}>
                {rows.length} {text.rows}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {missingColumns.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>{text.missing}</AlertTitle>
                <AlertDescription>{missingColumnsText}</AlertDescription>
              </Alert>
            )}

            <div className="max-h-80 overflow-auto rounded-md border">
              <table className="w-full min-w-max border-collapse text-start text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="border-b px-3 py-2 font-medium">{text.row}</th>
                    {headers.map((header) => (
                      <th key={header} className="border-b px-3 py-2 text-start font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, index) => (
                    <tr key={index} className="odd:bg-muted/30">
                      <td className="border-b px-3 py-2 text-muted-foreground">
                        {rowNumbers[index] ?? index + 2}
                      </td>
                      {headers.map((header) => (
                        <td key={header} className="max-w-64 truncate border-b px-3 py-2">
                          {cellToText(row[header]) || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(isProcessing || results.length > 0) && (
              <div className="space-y-2" aria-live="polite">
                <div className="flex justify-between text-sm">
                  <span>{isProcessing ? text.processing : text.progress}</span>
                  <span>{processedCount}/{rows.length} ({progress}%)</span>
                </div>
                <Progress value={progress} aria-label={text.progress} />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  disabled={isProcessing || results.length > 0}
                  className="size-4 accent-primary"
                />
                {text.confirmation}
              </label>
              {isProcessing ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setStopDialogOpen(true)}
                >
                  {text.stop}
                </Button>
              ) : results.length > 0 ? (
                <Button type="button" variant="outline" onClick={resetImport}>
                  {text.reset}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={startImport}
                  disabled={!confirmed || !selectedModule || missingColumns.length > 0}
                >
                  <Upload aria-hidden="true" />
                  {text.start}
                </Button>
              )}
            </div>
            {!confirmed && results.length === 0 && (
              <p className="text-end text-xs text-muted-foreground">{text.consent}</p>
            )}
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{text.summary}</CardTitle>
            <CardDescription>{notice}</CardDescription>
            <div className="flex gap-2 pt-2">
              <Badge variant="secondary">{text.succeeded}: {succeeded}</Badge>
              <Badge variant={failed > 0 ? "destructive" : "secondary"}>{text.failed}: {failed}</Badge>
            </div>
          </CardHeader>
          <CardContent className="max-h-80 space-y-2 overflow-auto">
            {results.filter((result) => !result.success).map((result) => (
              <div key={result.row} className="rounded-md border border-destructive/30 p-3 text-sm">
                <p className="font-medium">{text.row} {result.row}</p>
                <p className="text-muted-foreground">{result.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <AlertDialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.stopTitle}</AlertDialogTitle>
            <AlertDialogDescription>{text.stopDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{text.keepImporting}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmStop}
            >
              {text.confirmStop}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {!selectedModule && rows.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">{text.chooseModuleFirst}</p>
      )}
      {selectedModule && rows.length === 0 && !fileError && (
        <p className="text-center text-sm text-muted-foreground">{text.idle}</p>
      )}
    </div>
  );
}
