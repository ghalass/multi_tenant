// components/ui/excel-importer.tsx
"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  FileUp,
  Sheet,
  ChevronDown,
  ChevronUp,
  Filter,
  FilterX,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  StopCircle,
  AlertTriangle,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DownloadButtonSimple from "./DownloadButton";

// Types pour les filtres
export type FilterStatus =
  | "all"
  | "success"
  | "error"
// | "processing"
// | "pending";

export interface User {
  id: string;
  name: string;
  email: string;
  tenantId: string | null;
  active: boolean;
  isSuperAdmin: boolean;
}

// Interface pour la mutation
export interface ImportMutation {
  mutateAsync: (data: {
    sheetName: string;
    data: Record<string, any>;
  }) => Promise<any>;
}

export interface ExcelImporterProps {
  /** Fonction de mutation pour l'importation (alternative à onProcessRow) */
  importMutation?: ImportMutation;

  /** Fonction appelée pour traiter chaque ligne (alternative à importMutation) */
  onProcessRow?: (data: {
    sheetName: string;
    rowData: Record<string, any>;
    rowIndex: number;
  }) => Promise<any>;

  /** Titre du composant */
  title?: string;

  /** Description du composant */
  description?: string;

  /** Texte du bouton de soumission */
  submitButtonText?: string;

  /** Hauteur maximale du tableau */
  tableMaxHeight?: number;

  /** Afficher uniquement certaines colonnes */
  visibleColumns?: string[];

  /** Rendu personnalisé pour les cellules */
  renderCell?: (
    value: any,
    column: string,
    rowIndex: number
  ) => React.ReactNode;

  /** Rendu personnalisé pour le statut */
  renderStatus?: (result: any, isProcessing: boolean) => React.ReactNode;

  /** Fonction pour formater les données de la ligne */
  formatRowData?: (
    row: any[],
    headers: string[],
    sheetName: string
  ) => Record<string, any>;

  /** Désactiver l'importation */
  disabled?: boolean;

  /** Message d'erreur si désactivé */
  disabledMessage?: string;

  /** Actions supplémentaires à afficher dans l'en-tête */
  additionalActions?: React.ReactNode;

  /** Callback appelé au début du chargement du fichier */
  onFileUploadStart?: () => void;

  /** Callback appelé à la fin du chargement du fichier */
  onFileUploadEnd?: () => void;

  /** Callback appelé au début du chargement de l'onglet */
  onSheetLoadStart?: () => void;

  /** Callback appelé à la fin du chargement de l'onglet */
  onSheetLoadEnd?: () => void;

  /** Activer les filtres par statut */
  enableStatusFilters?: boolean;

  /** Message personnalisé pour le bouton de réinitialisation */
  resetButtonText?: string;

  /** Afficher les boutons pause/stop */
  enableControlButtons?: boolean;

  /** Callback appelé lors de l'arrêt */
  onStop?: () => void;

  /** Informations sur l'utilisateur pour vérifier les permissions */
  // user?: User | null;

  /** Rôles autorisés à utiliser l'importation */
  allowedRoles?: string[];

  /** Message d'erreur de permission */
  permissionMessage?: string;
}

export function ExcelImporter({
  importMutation,
  onProcessRow,
  title = "Importation de données Excel",
  description = "Importez des données depuis un fichier Excel",
  submitButtonText = "Injecter",
  tableMaxHeight = 500,
  visibleColumns,
  renderCell,
  renderStatus,
  formatRowData: customFormatRowData,
  additionalActions,
  onFileUploadStart,
  onFileUploadEnd,
  onSheetLoadStart,
  onSheetLoadEnd,
  enableStatusFilters = true,
  resetButtonText = "Réinitialiser",
  enableControlButtons = true,
  onStop,
}: ExcelImporterProps) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [tableData, setTableData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning" | "info";
    text: string;
  }>({ type: "info", text: "" });
  const [currentProcessingRow, setCurrentProcessingRow] = useState(-1);
  const [processingResults, setProcessingResults] = useState<
    Record<number, any>
  >({});
  const [previewMode, setPreviewMode] = useState<"full" | "preview">("preview");
  const [previewRowsCount, setPreviewRowsCount] = useState(50);

  // États pour les filtres
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [expandedErrorDetails, setExpandedErrorDetails] = useState<number[]>(
    []
  );

  // États pour le contrôle du traitement
  const [isStopped, setIsStopped] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [processingQueue, setProcessingQueue] = useState<number[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [processedAtStop, setProcessedAtStop] = useState(0);

  // Références
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const headerContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef(false);
  const processingRef = useRef(false);

  // Fonction pour réinitialiser complètement l'état
  const resetAllState = useCallback((keepFileInput = false) => {
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet("");
    setTableData([]);
    setHeaders([]);
    setProgress(0);
    setCurrentProcessingRow(-1);
    setProcessingResults({});
    setPreviewMode("preview");
    setStatusFilter("all");
    setShowOnlyErrors(false);
    setExpandedErrorDetails([]);
    setMessage({ type: "info", text: "" });
    setIsStopped(false);
    setProcessingQueue([]);
    setProcessedCount(0);
    setProcessedAtStop(0);
    stopRequestedRef.current = false;
    processingRef.current = false;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (!keepFileInput && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Fonction pour arrêter le traitement avec confirmation
  const stopProcessing = useCallback(async () => {
    setShowStopDialog(true);
  }, []);

  // Fonction pour arrêter effectivement le traitement
  const performStop = useCallback(() => {
    const currentProcessedCount = processedCount;
    setProcessedAtStop(currentProcessedCount);
    stopRequestedRef.current = true;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setIsStopped(true);
    setIsLoading(false);
    processingRef.current = false;

    const totalRows = tableData.length;
    const remainingRows = totalRows - currentProcessedCount;

    setMessage({
      type: "warning",
      text: `Traitement arrêté. ${currentProcessedCount} ligne(s) traitée(s), ${remainingRows} ligne(s) restante(s).`,
    });

    setCurrentProcessingRow(-1);
    setProcessingQueue([]);
    onStop?.();
    setShowStopDialog(false);
  }, [tableData.length, processedCount, onStop]);

  // Gérer l'arrêt après confirmation
  const handleStopConfirmed = useCallback(() => {
    performStop();
  }, [performStop]);

  // Fonction utilitaire pour vérifier si un résultat est réussi
  const isResultSuccessful = useCallback((result: any): boolean => {
    if (!result) return false;

    // if (result.success !== undefined) {
    //   return result.success === true;
    // }

    if (result.data) {

      if (Array.isArray(result.data)) {
        if (result.data.length === 0) return false;

        if (result.data[0] && result.data[0].success !== undefined) {
          return result.data.every(
            (item: any) => item && item.success === true
          );
        }

        return result.data.every(
          (item: any) =>
            item && (item.success === undefined || item.success === true)
        );
      }

      if (result.data.success !== undefined) {
        return result.data.success === true;
      }
    }

    return (
      !result.error &&
      !result.message?.includes("erreur") &&
      !result.message?.includes("échec")
    );
  }, []);

  // Fonction pour obtenir le statut d'une ligne
  const getRowStatus = useCallback(
    (rowIndex: number): FilterStatus => {
      const result = processingResults[rowIndex];

      // Une ligne non encore traitée n'est pas une erreur
      if (!result) return "all";

      return isResultSuccessful(result) ? "success" : "error";
    },
    [processingResults, isResultSuccessful]
  );

  // Fonction de formatage par défaut des données
  const defaultFormatRowData = useCallback(
    (row: any[], headers: string[], sheetName: string) => {
      const formatted: Record<string, any> = {};
      headers.forEach((header, index) => {
        if (header && header.trim() !== "") {
          const value = row[index];
          if (value !== undefined && value !== null) {
            formatted[header] = value;
          }
        }
      });
      return formatted;
    },
    []
  );

  const formatRowData = customFormatRowData || defaultFormatRowData;

  // Fonction interne de traitement de ligne
  const processRowInternal = useCallback(
    async ({
      sheetName,
      rowData,
      rowIndex,
    }: {
      sheetName: string;
      rowData: Record<string, any>;
      rowIndex: number;
    }) => {
      if (importMutation) {
        return await importMutation.mutateAsync({
          sheetName,
          data: rowData,
        });
      } else if (onProcessRow) {
        return await onProcessRow({
          sheetName,
          rowData,
          rowIndex,
        });
      } else {
        throw new Error(
          "Aucune méthode de traitement fournie. Fournissez soit importMutation soit onProcessRow."
        );
      }
    },
    [importMutation, onProcessRow]
  );

  // Calculer les statistiques par statut
  const statusStats = useMemo(() => {
    const stats = {
      all: 0,
      success: 0,
      error: 0,
    };
    if (tableData.length === 0) return stats;

    tableData.forEach((_, index) => {
      const status = getRowStatus(index);
      if (status === "success" || status === "error") {
        stats[status]++;
      }
      stats.all++;
    });

    return stats;
  }, [tableData, getRowStatus]);

  // Filtrer les données selon le statut sélectionné
  const filteredData = useMemo(() => {
    if (statusFilter === "all" && !showOnlyErrors) {
      return tableData;
    }

    return tableData.filter((_, index) => {
      const rowStatus = getRowStatus(index);

      if (showOnlyErrors) {
        return rowStatus === "error";
      }

      return statusFilter === "all" || rowStatus === statusFilter;
    });
  }, [tableData, statusFilter, showOnlyErrors, getRowStatus]);

  // Fonction pour obtenir l'index original
  const getOriginalIndex = useCallback(
    (filteredIndex: number): number => {
      if (statusFilter === "all" && !showOnlyErrors) {
        return filteredIndex;
      }

      let count = 0;
      for (let i = 0; i < tableData.length; i++) {
        const rowStatus = getRowStatus(i);
        const matchesFilter =
          statusFilter === "all" || rowStatus === statusFilter;
        const matchesErrorFilter = !showOnlyErrors || rowStatus === "error";

        if (matchesFilter && matchesErrorFilter) {
          if (count === filteredIndex) {
            return i;
          }
          count++;
        }
      }
      return -1;
    },
    [tableData, statusFilter, showOnlyErrors, getRowStatus]
  );

  // Virtualizer pour les lignes
  const rowVirtualizer = useVirtualizer({
    count:
      previewMode === "full"
        ? filteredData.length
        : Math.min(filteredData.length, previewRowsCount),
    getScrollElement: () => tableContainerRef.current,
    estimateSize: (index) => {
      const rowIndex = getOriginalIndex(index);
      const isExpanded = expandedErrorDetails.includes(rowIndex);
      const result = processingResults[rowIndex];

      if (isExpanded && result && result.data && Array.isArray(result.data)) {
        const itemCount = Math.min(result.data.length, 5);
        return 40 + itemCount * 24;
      }

      return 40;
    },
    overscan: 10,
  });

  // Calculer les données à afficher
  const displayedData = useMemo(() => {
    if (previewMode === "preview") {
      return filteredData.slice(0, previewRowsCount);
    }
    return filteredData;
  }, [filteredData, previewMode, previewRowsCount]);

  // Synchroniser le scroll
  const handleTableScroll = useCallback(() => {
    if (tableContainerRef.current && headerContainerRef.current) {
      headerContainerRef.current.scrollLeft =
        tableContainerRef.current.scrollLeft;
    }
  }, []);

  // Réinitialiser les filtres
  const resetFilters = useCallback(() => {
    setStatusFilter("all");
    setShowOnlyErrors(false);
    setExpandedErrorDetails([]);
  }, []);

  // Basculer le mode prévisualisation
  const togglePreviewMode = useCallback(() => {
    setPreviewMode((prev) => (prev === "preview" ? "full" : "preview"));
  }, []);

  // Changer le nombre de lignes en prévisualisation
  const changePreviewRowsCount = useCallback(
    (count: number) => {
      setPreviewRowsCount(count);
      if (previewMode === "full") {
        setPreviewMode("preview");
      }
    },
    [previewMode]
  );

  // Normaliser le résultat
  const normalizeResult = useCallback((result: any) => {
    if (!result) {
      return {
        success: false,
        message: "Aucun résultat retourné",
        data: null,
      };
    }

    if (typeof result === "object" && !Array.isArray(result)) {
      if (result.success !== undefined) {
        return {
          success: result.success === true,
          message: result.message || "",
          data: result.data || null,
        };
      }

      if (result.data && Array.isArray(result.data)) {
        const allSuccess = result.data.every(
          (item: any) =>
            item && (item.success === undefined || item.success === true)
        );

        return {
          success: allSuccess,
          message:
            result.message ||
            (allSuccess
              ? "Tous les éléments ont réussi"
              : "Certains éléments ont échoué"),
          data: result.data,
        };
      }

      return {
        success: true,
        message: "Opération réussie",
        data: result,
      };
    }

    if (Array.isArray(result)) {
      const allSuccess = result.every(
        (item) => item && (item.success === undefined || item.success === true)
      );

      return {
        success: allSuccess,
        message: `${result.length} élément(s) traité(s)`,
        data: result,
      };
    }

    if (typeof result === "string") {
      const isError =
        result.toLowerCase().includes("erreur") ||
        result.toLowerCase().includes("échec") ||
        result.toLowerCase().includes("error") ||
        result.toLowerCase().includes("failed");

      return {
        success: !isError,
        message: result,
        data: null,
      };
    }

    if (typeof result === "boolean") {
      return {
        success: result,
        message: result ? "Succès" : "Échec",
        data: null,
      };
    }

    return {
      success: false,
      message: "Format de résultat non reconnu",
      data: result,
    };
  }, []);

  // Gestion de l'upload de fichier
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {

      const file = event.target.files?.[0];
      if (!file) return;

      resetAllState(true);
      setIsFileUploading(true);
      setMessage({ type: "info", text: "Chargement du fichier en cours..." });
      onFileUploadStart?.();

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, {
            type: "array",
            cellText: false,
            cellDates: true,
            cellNF: false,
            cellFormula: false,
          });

          setWorkbook(workbook);
          setSheetNames(workbook.SheetNames);

          setMessage({
            type: "success",
            text: `Fichier chargé avec succès. ${workbook.SheetNames.length} onglet(s) détecté(s).`,
          });
        } catch (error) {
          console.error("Erreur lors de la lecture du fichier:", error);
          setMessage({
            type: "error",
            text: "Erreur lors de la lecture du fichier Excel",
          });
        } finally {
          setIsFileUploading(false);
          onFileUploadEnd?.();
        }
      };

      reader.onerror = () => {
        setMessage({
          type: "error",
          text: "Erreur lors de la lecture du fichier",
        });
        setIsFileUploading(false);
        onFileUploadEnd?.();
      };

      reader.readAsArrayBuffer(file);
    },
    [resetAllState, onFileUploadStart, onFileUploadEnd]
  );

  // Gestion de la sélection d'onglet
  const handleSheetSelect = useCallback(
    async (value: string) => {

      setIsSheetLoading(true);
      setMessage({
        type: "info",
        text: `Chargement de l'onglet "${value}"...`,
      });
      onSheetLoadStart?.();

      setSelectedSheet(value);
      setTableData([]);
      setHeaders([]);
      setProcessingResults({});
      setCurrentProcessingRow(-1);
      setIsStopped(false);
      resetFilters();
      stopRequestedRef.current = false;

      await new Promise((resolve) => setTimeout(resolve, 0));

      if (workbook && value) {
        try {
          const worksheet = workbook.Sheets[value];
          if (!worksheet) {
            setMessage({
              type: "warning",
              text: `L'onglet "${value}" est vide ou n'existe pas`,
            });
            setIsSheetLoading(false);
            onSheetLoadEnd?.();
            return;
          }

          const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, {
            header: 1,
            raw: false,
            rawNumbers: false,
            dateNF: "dd-mm-yyyy",
            defval: null,
            blankrows: false,
          });

          if (Array.isArray(jsonData) && jsonData.length > 0) {
            const firstRow = jsonData[0];
            const originalHeaders = firstRow.map((header: any) => {
              if (header == null) return "";
              if (header instanceof Date) {
                return header.toLocaleDateString("fr-FR");
              }
              return String(header).trim();
            });

            const dataRows = jsonData.slice(1).map((row: any) => {
              if (!Array.isArray(row)) return [];
              const paddedRow = [...Array(originalHeaders.length)].map(
                (_, i) => {
                  if (i < row.length) {
                    const cellValue = row[i];
                    if (cellValue instanceof Date) {
                      return cellValue.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });
                    }
                    return cellValue;
                  }
                  return null;
                }
              );
              return paddedRow;
            });

            const filteredDataRows = dataRows.filter((row: any[]) =>
              row.some((cell) => cell != null && cell !== "")
            );

            setHeaders(originalHeaders);
            setTableData(filteredDataRows);

            setMessage({
              type: "success",
              text: `Onglet "${value}" chargé: ${filteredDataRows.length} ligne(s) de données`,
            });
          } else {
            setHeaders([]);
            setTableData([]);
            setMessage({
              type: "warning",
              text: `L'onglet "${value}" ne contient aucune donnée`,
            });
          }
        } catch (error) {
          console.error("Erreur lors de la lecture de l'onglet:", error);
          setMessage({
            type: "error",
            text: "Erreur lors de la lecture de l'onglet sélectionné",
          });
        } finally {
          setIsSheetLoading(false);
          onSheetLoadEnd?.();
        }
      } else {
        setIsSheetLoading(false);
        onSheetLoadEnd?.();
      }
    },
    [workbook, resetFilters, onSheetLoadStart, onSheetLoadEnd]
  );

  // Soumission des données
  const submit = useCallback(async () => {
    if (!selectedSheet || tableData.length === 0) {
      setMessage({
        type: "warning",
        text: "Veuillez sélectionner un onglet avec des données",
      });
      return;
    }

    // Vérifier qu'une méthode de traitement est fournie
    if (!importMutation && !onProcessRow) {
      setMessage({
        type: "error",
        text: "Configuration invalide: Fournissez soit importMutation soit onProcessRow",
      });
      return;
    }

    setIsLoading(true);
    setIsStopped(false);
    setProgress(0);
    setCurrentProcessingRow(-1);
    setProcessingResults({});
    setProcessedCount(0);
    setProcessedAtStop(0);
    resetFilters();
    stopRequestedRef.current = false;
    processingRef.current = true;

    setMessage({ type: "info", text: "Début du traitement des données..." });

    const indicesToProcess = Array.from(
      { length: tableData.length },
      (_, i) => i
    );
    setProcessingQueue(indicesToProcess);

    try {
      const totalRows = tableData.length;
      let successfulRows = 0;
      let failedRows = 0;

      abortControllerRef.current = new AbortController();

      for (let i = 0; i < totalRows; i++) {
        if (stopRequestedRef.current) {
          break;
        }

        const index = indicesToProcess[i];
        setCurrentProcessingRow(index);

        const rowData = tableData[index];
        const formattedData = formatRowData(rowData, headers, selectedSheet);

        if (Object.keys(formattedData).length === 0) {
          const emptyResult = {
            success: false,
            message: `Ligne ${index + 1} ignorée (données vides)`,
            data: null,
          };
          setProcessingResults((prev) => ({ ...prev, [index]: emptyResult }));
          failedRows++;

          const newProcessedCount = i + 1;
          setProcessedCount(newProcessedCount);
          setProcessingQueue((prev) => prev.slice(1));
          const newProgress = Math.round((newProcessedCount / totalRows) * 100);
          setProgress(newProgress);
          continue;
        }

        try {
          if (stopRequestedRef.current) {
            break;
          }

          if (abortControllerRef.current?.signal.aborted) {
            throw new Error("Traitement annulé par l'utilisateur");
          }

          const result = await processRowInternal({
            sheetName: selectedSheet,
            rowData: formattedData,
            rowIndex: index,
          });

          if (stopRequestedRef.current) {
            break;
          }

          const normalizedResult = normalizeResult(result);
          setProcessingResults((prev) => ({
            ...prev,
            [index]: normalizedResult,
          }));

          if (isResultSuccessful(normalizedResult)) {
            successfulRows++;
          } else {
            failedRows++;
          }
        } catch (error: any) {
          if (error.name === "AbortError" || error.message.includes("arrêté")) {
            break;
          }

          const errorResult = {
            success: false,
            message: `Erreur: ${error.message || error.toString()}`,
            data: null,
          };
          setProcessingResults((prev) => ({ ...prev, [index]: errorResult }));
          failedRows++;
        }

        const newProcessedCount = i + 1;
        setProcessedCount(newProcessedCount);
        setProcessingQueue((prev) => prev.slice(1));

        const newProgress = Math.round((newProcessedCount / totalRows) * 100);
        setProgress(newProgress);
      }

      processingRef.current = false;
      abortControllerRef.current = null;
      setCurrentProcessingRow(-1);
      setIsLoading(false);

      if (stopRequestedRef.current) {
        const stoppedCount = processedCount;
        const remainingRows = totalRows - stoppedCount;
        setMessage({
          type: "warning",
          text: `Traitement arrêté. ${stoppedCount} ligne(s) traitée(s), ${remainingRows} ligne(s) restante(s).`,
        });
        setIsStopped(true);
      } else if (failedRows === 0 && successfulRows > 0) {
        setMessage({
          type: "success",
          text: `Traitement terminé avec succès ! ${successfulRows} ligne(s) importée(s) sans erreur`,
        });
      } else if (successfulRows > 0 && failedRows > 0) {
        setMessage({
          type: "warning",
          text: `Traitement partiellement réussi : ${successfulRows} succès, ${failedRows} échec(s).`,
        });
        if (enableStatusFilters && failedRows > 0) {
          setShowOnlyErrors(false);
        }
      } else if (failedRows > 0) {
        setMessage({
          type: "error",
          text: `Échec complet du traitement : ${failedRows} échec(s).`,
        });
      } else {
        setMessage({
          type: "info",
          text: `Traitement terminé sans lignes traitées.`,
        });
      }
    } catch (error: any) {
      console.error("Erreur lors du traitement:", error);
      processingRef.current = false;
      setIsLoading(false);
      setCurrentProcessingRow(-1);
      setMessage({
        type: "error",
        text: `Une erreur est survenue lors du traitement des données: ${error.message}`,
      });
    }
  }, [
    selectedSheet,
    tableData,
    headers,
    formatRowData,
    processRowInternal,
    normalizeResult,
    isResultSuccessful,
    enableStatusFilters,
    resetFilters,
    processedCount,
    importMutation,
    onProcessRow,
  ]);

  // Fonctions utilitaires pour les colonnes visibles
  const getFilteredHeaders = useCallback(() => {
    if (!visibleColumns || visibleColumns.length === 0) {
      return headers;
    }
    return headers.filter((header) => visibleColumns.includes(header));
  }, [headers, visibleColumns]);

  const getVisibleCellIndexes = useCallback(() => {
    if (!visibleColumns || visibleColumns.length === 0) {
      return headers.map((_, index) => index);
    }
    return headers
      .map((header, index) => (visibleColumns.includes(header) ? index : -1))
      .filter((index) => index !== -1);
  }, [headers, visibleColumns]);

  const visibleHeaders = useMemo(
    () => getFilteredHeaders(),
    [getFilteredHeaders]
  );
  const visibleCellIndexes = useMemo(
    () => getVisibleCellIndexes(),
    [getVisibleCellIndexes]
  );

  // Rendu par défaut des cellules
  const defaultRenderCell = useCallback(
    (value: any, column: string, rowIndex: number) => {
      return value !== undefined && value !== null && value !== "" ? (
        <div className="truncate" title={String(value)}>
          {value}
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
    []
  );

  // Rendu par défaut du statut
  const defaultRenderStatus = useCallback(
    (result: any, isProcessing: boolean) => {
      if (isProcessing) {
        return (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <Badge variant="secondary" className="font-medium">
              En traitement...
            </Badge>
          </div>
        );
      }

      if (!result) {
        return (
          <Badge variant="outline" className="font-medium">
            En attente
          </Badge>
        );
      }

      const isSuccess = isResultSuccessful(result);

      return (
        <Badge
          variant={isSuccess ? "default" : "destructive"}
          className="font-medium"
        >
          {isSuccess ? "Succès" : "Échec"}
        </Badge>
      );
    },
    [isResultSuccessful]
  );

  // Calcul des largeurs de colonnes
  const columnWidths = useMemo(
    () => ({
      status: 100,
      result: 350,
      dataCell: 120,
    }),
    []
  );

  const totalWidth = useMemo(
    () =>
      columnWidths.status +
      columnWidths.result +
      visibleHeaders.length * columnWidths.dataCell,
    [columnWidths, visibleHeaders]
  );

  // Bouton de réinitialisation
  const resetButton = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => resetAllState()}
            disabled={
              isLoading || isFileUploading || isSheetLoading
            }
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {resetButtonText}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Effacer toutes les données et réinitialiser</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Boutons de contrôle
  const controlButtons = enableControlButtons && isLoading && (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={stopProcessing}
              disabled={isStopped}
              className="gap-2 bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
            >
              <StopCircle className="h-4 w-4" />
              Arrêter
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Arrêter définitivement le traitement</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  // Indicateur de progression détaillé
  const progressDetails = isLoading && (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>
          Ligne {currentProcessingRow + 1} sur {tableData.length}
        </span>
        {/* <span>
          {processedCount} traitées • {tableData.length - processedCount}{" "}
          restantes
        </span> */}
        {/* {processingQueue.length > 0 && (
          <Badge variant="outline">
            {processingQueue.length} en file d'attente
          </Badge>
        )} */}
        {isStopped && (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            <StopCircle className="h-3 w-3 mr-1" />
            Arrêté
          </Badge>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold">{title}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {description}
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {/* {userInfo} */}
              {additionalActions}

              {resetButton}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          <>
            {/* Section d'upload */}
            <div className="flex flex-col col-2 gap-2 items-start md:items-center">
              <div className="w-full md:w-auto relative">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="w-full md:w-75 cursor-pointer pr-10"
                  disabled={isLoading || isFileUploading}
                />
                {isFileUploading ? (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <FileUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative">
                  <Select
                    value={selectedSheet}
                    onValueChange={handleSheetSelect}
                    disabled={
                      !sheetNames.length || isLoading || isSheetLoading
                    }
                  >
                    <SelectTrigger className="w-full md:w-50 pr-10">
                      <SelectValue placeholder="Sélectionnez un onglet" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-64">
                        {sheetNames.map((sheetName, index) => (
                          <SelectItem key={index} value={sheetName}>
                            {sheetName}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  {isSheetLoading ? (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  ) : selectedSheet ? (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Sheet className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ) : null}
                </div>

                <Button
                  onClick={submit}
                  disabled={
                    !selectedSheet ||
                    tableData.length === 0 ||
                    isLoading ||
                    isFileUploading ||
                    isSheetLoading
                  }
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    submitButtonText
                  )}
                </Button>
                {controlButtons}
              </div>
            </div>

            {/* Indicateurs de chargement */}
            {(isFileUploading || isSheetLoading) && (
              <div className="space-y-2">
                {isFileUploading && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <span>Chargement du fichier en cours...</span>
                  </div>
                )}
                {isSheetLoading && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <span>Chargement de l'onglet "{selectedSheet}"...</span>
                  </div>
                )}
              </div>
            )}

            {/* Messages d'alerte */}
            {message.text && (
              <Alert
                variant={
                  message.type === "success"
                    ? "default"
                    : message.type === "error"
                      ? "destructive"
                      : "default"
                }
                className={`mt-2 ${message.type === "success"
                  ? "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400"
                  : message.type === "error"
                    ? "border-red-500/20 bg-red-500/10"
                    : message.type === "warning"
                      ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                      : "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  }`}
              >
                <AlertTitle className="font-semibold">
                  {message.type === "success"
                    ? "Succès"
                    : message.type === "error"
                      ? "Erreur"
                      : message.type === "warning"
                        ? "Avertissement"
                        : "Information"}
                </AlertTitle>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            {/* Barre de progression et détails */}
            {(isLoading || progress > 0) && (
              <div className="space-y-2">
                {progressDetails}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isLoading
                      ? "Traitement en cours..."
                      : "Traitement terminé"}
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Indicateur d'état si arrêté */}
            {isStopped && (
              <Alert className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Traitement arrêté</AlertTitle>
                <AlertDescription>
                  Le traitement a été arrêté manuellement. {processedAtStop}{" "}
                  ligne(s) ont été traitées avant l'arrêt.
                </AlertDescription>
              </Alert>
            )}

            {/* Section des filtres */}
            {enableStatusFilters && tableData.length > 0 && (
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Filtres par statut</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-gray-400" />
                      <span>Tous:</span>
                      <Badge variant="outline">{statusStats.all}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span>Succès:</span>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        {statusStats.success}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      <span>Erreurs:</span>
                      <Badge
                        variant="outline"
                        className="bg-red-50 text-red-700 border-red-200"
                      >
                        {statusStats.error}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Tabs
                    value={statusFilter}
                    onValueChange={(value) =>
                      setStatusFilter(value as FilterStatus)
                    }
                    className="w-full"
                  >
                    <TabsList className="flex justify-center w-full">
                      <TabsTrigger value="all" >
                        <Eye className="h-4 w-4 mr-2" />
                        Tous
                      </TabsTrigger>
                      <TabsTrigger value="success">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Succès
                      </TabsTrigger>
                      <TabsTrigger value="error">
                        <XCircle className="h-4 w-4 mr-2 text-red-600" />
                        Erreurs
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="flex-1" />
                </div>

                {(statusFilter !== "all" || showOnlyErrors) && (
                  <div className="mt-3 p-3 rounded bg-muted">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {filteredData.length} ligne
                        {filteredData.length !== 1 ? "s" : ""} affichée
                        {filteredData.length !== 1 ? "s" : ""}
                        {filteredData.length !== tableData.length &&
                          ` sur ${tableData.length}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contrôles d'affichage */}
            {tableData.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-4">
                  {filteredData.length > 100 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          {previewMode === "preview"
                            ? `Prévisualisation (${previewRowsCount} lignes)`
                            : "Toutes les lignes"}
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => changePreviewRowsCount(50)}
                        >
                          50 premières lignes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => changePreviewRowsCount(100)}
                        >
                          100 premières lignes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => changePreviewRowsCount(200)}
                        >
                          200 premières lignes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={togglePreviewMode}>
                          {previewMode === "preview"
                            ? "Afficher toutes les lignes"
                            : "Revenir en prévisualisation"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  {previewMode === "preview"
                    ? `Affichage des ${Math.min(
                      previewRowsCount,
                      filteredData.length
                    )} premières lignes sur ${filteredData.length}`
                    : `Affichage de toutes les ${filteredData.length} lignes`
                  }
                </div>
              </div>
            )}

            {/* Tableau de données */}
            {displayedData.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Onglet:{" "}
                    <span className="text-primary">{selectedSheet}</span>
                    {(statusFilter !== "all" || showOnlyErrors) && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        (filtré)
                      </span>
                    )}
                  </h3>
                </div>

                <div className="rounded-lg border overflow-hidden">
                  {/* En-têtes */}
                  <div
                    ref={headerContainerRef}
                    className="sticky top-0 bg-background border-b overflow-hidden z-10"
                    style={{
                      width: "100%",
                      overflowX: "auto",
                      overflowY: "hidden",
                    }}
                  >
                    <div style={{ width: totalWidth, minWidth: "100%" }}>
                      <div className="flex text-center">
                        <div
                          className="p-2 font-semibold border-r bg-background"
                          style={{
                            width: columnWidths.status,
                            minWidth: columnWidths.status,
                          }}
                        >
                          Statut
                        </div>
                        <div
                          className="p-2 font-semibold border-r bg-background"
                          style={{
                            width: columnWidths.result,
                            minWidth: columnWidths.result,
                          }}
                        >
                          Résultat
                        </div>
                        {visibleHeaders.map((header, index) => (
                          <div
                            key={index}
                            className="p-2 font-semibold border-r bg-background last:border-r-0"
                            style={{
                              width: columnWidths.dataCell,
                              minWidth: columnWidths.dataCell,
                            }}
                          >
                            <div className="truncate" title={header}>
                              {header || `Colonne ${index + 1}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Corps du tableau */}
                  <div
                    ref={tableContainerRef}
                    onScroll={handleTableScroll}
                    style={{
                      height: tableMaxHeight,
                      width: "100%",
                      overflow: "auto",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        height: rowVirtualizer.getTotalSize(),
                        width: totalWidth,
                        minWidth: "100%",
                      }}
                    >
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const filteredIndex = virtualRow.index;
                        const originalIndex = getOriginalIndex(filteredIndex);
                        const row = displayedData[filteredIndex];
                        const rowResult = processingResults[originalIndex];
                        const isProcessing =
                          currentProcessingRow === originalIndex &&
                          !isStopped;
                        const rowStatus = getRowStatus(originalIndex);
                        const isError = rowStatus === "error";

                        return (
                          <div
                            key={originalIndex}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: `${virtualRow.size}px`,
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className={`border-b ${isError ? "bg-red-50/30 dark:bg-red-950/10" : ""
                              } ${isProcessing
                                ? "bg-blue-50/30 dark:bg-blue-950/10"
                                : ""
                              }`}
                          >
                            <div className="flex h-full">
                              {/* Statut */}
                              <div
                                className="border-r flex items-center justify-center"
                                style={{
                                  width: columnWidths.status,
                                  minWidth: columnWidths.status,
                                }}
                              >
                                {renderStatus
                                  ? renderStatus(rowResult, isProcessing)
                                  : defaultRenderStatus(
                                    rowResult,
                                    isProcessing
                                  )}
                              </div>

                              {/* Résultat */}
                              <div
                                className="border-r overflow-auto"
                                style={{
                                  width: columnWidths.result,
                                  minWidth: columnWidths.result,
                                }}
                              >
                                <div className="h-full flex items-center">
                                  <div className="p-2 w-full">
                                    {rowResult?.data &&
                                      Array.isArray(rowResult.data) ? (
                                      <ScrollArea className="h-full max-h-24">
                                        {rowResult.data.map(
                                          (item: any, idx: number) => {
                                            const isSuccess =
                                              item?.success === true;
                                            const isError =
                                              item?.success === false;

                                            return (
                                              <div
                                                key={idx}
                                                className={`text-xs p-1 mb-1 rounded ${isError
                                                  ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                                                  : isSuccess
                                                    ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                                                    : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                                  }`}
                                              >
                                                {item?.message ||
                                                  "Sans message"}
                                              </div>
                                            );
                                          }
                                        )}
                                      </ScrollArea>
                                    ) : rowResult?.message ? (
                                      <div
                                        className={`text-sm ${isError
                                          ? "text-red-600 dark:text-red-400"
                                          : "text-green-600 dark:text-green-400"
                                          }`}
                                      >
                                        {rowResult.message}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              {/* Données */}
                              {visibleCellIndexes.map((cellIndex) => {
                                const header = headers[cellIndex];
                                const value = row[cellIndex];
                                return (
                                  <div
                                    key={cellIndex}
                                    className="border-r last:border-r-0"
                                    style={{
                                      width: columnWidths.dataCell,
                                      minWidth: columnWidths.dataCell,
                                    }}
                                  >
                                    <div className="flex items-center justify-center h-full p-2">
                                      {renderCell
                                        ? renderCell(
                                          value,
                                          header,
                                          originalIndex
                                        )
                                        : defaultRenderCell(
                                          value,
                                          header,
                                          originalIndex
                                        )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Messages de prévisualisation */}
                {previewMode === "preview" &&
                  filteredData.length > previewRowsCount && (
                    <div className="flex items-center justify-center gap-2 p-2 border rounded-lg bg-muted/30">
                      <AlertDescription className="text-center">
                        {filteredData.length - previewRowsCount} lignes
                        supplémentaires non affichées
                      </AlertDescription>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={togglePreviewMode}
                        className="h-8 px-3"
                      >
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Afficher toutes les lignes
                      </Button>
                    </div>
                  )}

                {previewMode === "full" && filteredData.length > 100 && (
                  <div className="flex items-center justify-center gap-2 p-2 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
                    <AlertDescription className="text-amber-700 dark:text-amber-400">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                          Mode complet - {filteredData.length} lignes
                          affichées
                        </span>
                      </div>
                    </AlertDescription>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={togglePreviewMode}
                      className="h-8 px-3"
                    >
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Retour en prévisualisation
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Messages d'état */}
            {selectedSheet && tableData.length === 0 && !isSheetLoading && (
              <div className="text-center py-12 border rounded-lg">
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Aucune donnée trouvée dans l'onglet{" "}
                    <span className="font-medium text-foreground">
                      {selectedSheet}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Assurez-vous que l'onglet contient des données
                  </p>
                </div>
              </div>
            )}

            {selectedSheet && isSheetLoading && (
              <div className="text-center py-12 border rounded-lg">
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      Chargement des données de l'onglet{" "}
                      <span className="font-medium text-foreground">
                        {selectedSheet}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Veuillez patienter...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {tableData.length > 0 && filteredData.length === 0 && (
              <div className="text-center py-8 border rounded-lg">
                <div className="space-y-4">
                  <FilterX className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">
                      Aucune ligne ne correspond aux filtres
                    </h3>
                    <p className="text-muted-foreground mt-2">
                      Aucune ligne ne correspond aux critères de filtrage
                      actuels.
                    </p>
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        onClick={resetFilters}
                        className="gap-2"
                      >
                        <FilterX className="h-4 w-4" />
                        Réinitialiser les filtres
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        </CardContent>

        <CardFooter className="flex justify-end gap-1 border-t py-0 my-0">
          <DownloadButtonSimple />
        </CardFooter>
      </Card>

      {/* Dialog de confirmation d'arrêt */}
      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <span>Arrêter le traitement ?</span>
            </DialogTitle>

            <DialogDescription asChild className="pt-4">
              <div className="space-y-3">
                <p>
                  Vous êtes sur le point d'arrêter définitivement le traitement
                  en cours. Cette action ne peut pas être annulée.
                </p>

                {processedCount > 0 && (
                  <div className="p-3 bg-muted/50 rounded-md border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progression :</span>
                      <span className="text-sm font-semibold">
                        {processedCount}/{tableData.length} lignes
                      </span>
                    </div>
                    <Progress
                      value={(processedCount / tableData.length) * 100}
                      className="h-2"
                    />
                    {/* <p className="text-xs text-muted-foreground mt-2">
                      {processedCount} ligne{processedCount !== 1 ? "s" : ""}{" "}
                      traitées
                      {tableData.length - processedCount > 0 &&
                        ` • ${tableData.length - processedCount} restante${tableData.length - processedCount !== 1 ? "s" : ""
                        }`}
                    </p> */}
                  </div>
                )}

                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Avertissement</AlertTitle>
                  <AlertDescription className="text-xs">
                    Le traitement s'arrêtera immédiatement et ne pourra pas être
                    repris. Seules les lignes déjà traitées seront sauvegardées.
                  </AlertDescription>
                </Alert>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowStopDialog(false)}
              className="flex-1 sm:flex-none"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleStopConfirmed}
              className="flex-1 sm:flex-none gap-2"
            >
              <StopCircle className="h-4 w-4" />
              Arrêter définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
