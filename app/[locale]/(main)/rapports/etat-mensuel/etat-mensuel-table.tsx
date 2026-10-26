
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Columns3, Search, ArrowUpDown } from "lucide-react";

type Column = {
    key: string;
    label: string;
    sortable?: boolean;
};

const COLUMNS: Column[] = [
    { key: "typeParcName", label: "TYPE DE PARC", sortable: true },
    { key: "parcName", label: "PARC", sortable: true },
    { key: "period", label: "PÉRIODE", sortable: true },
    { key: "nbre", label: "NBRE", sortable: true },
    { key: "nho", label: "NHO", sortable: true },
    { key: "him", label: "HIM", sortable: true },
    { key: "hrm", label: "HRM", sortable: true },
    { key: "hrd", label: "HRD", sortable: true },
    { key: "mttr", label: "MTTR", sortable: true },
    { key: "disp", label: "DISP (%)", sortable: true },
    { key: "util", label: "UTIL (%)", sortable: true },
    { key: "sw", label: "SW (%)", sortable: true },
    { key: "obj_d", label: "OBJ-D", sortable: true },
    { key: "obj_u", label: "OBJ-U", sortable: true },
];

type ReportRow = {
    id: string;
    typeParcName: string;
    parcName: string;
    period: string;
    nbre: number;
    nho: number;
    him: number;
    hrm: number;
    hrd: number;
    mttr: number;
    disp: number;
    util: number;
    sw: number;
    obj_d: number | null;
    obj_u: number | null;
    isTotal: boolean;
};

function formatValue(value: unknown, key: string): string {
    if (value == null || value === "") return "—";

    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);

    if (["disp", "util", "sw"].includes(key)) {
        return `${number.toFixed(2)} %`;
    }

    if (key === "mttr" || key === "obj_d" || key === "obj_u") {
        return number.toFixed(2);
    }

    return new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 2,
    }).format(number);
}

export default function EtatMensuelTable({
    data,
}: {
    data: any[];
}) {
    const [search, setSearch] = useState("");
    const [compact, setCompact] = useState(true);
    const [showColumnManager, setShowColumnManager] = useState(false);
    const [sortColumn, setSortColumn] = useState("typeParcName");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [visibleColumns, setVisibleColumns] = useState(
        COLUMNS.map((column) => column.key),
    );

    const rows = useMemo<ReportRow[]>(() => {
        const result: ReportRow[] = [];

        for (const groupe of data) {
            for (const parc of groupe.parcs ?? []) {
                for (const period of [
                    {
                        key: "M",
                        label: "Mensuel",
                        nho: parc.nhoMois,
                        metrics: parc.aggregatesMois,
                    },
                    {
                        key: "A",
                        label: "Cumul annuel",
                        nho: parc.nhoAnnee,
                        metrics: parc.aggregatesAnnee,
                    },
                ]) {
                    result.push({
                        id: `${parc.parcId}-${period.key}`,
                        typeParcName: groupe.typeParcName,
                        parcName: parc.parcName,
                        period: period.label,
                        nbre: parc.nbreEngins,
                        nho: period.nho,
                        him: period.metrics.him,
                        hrm: period.metrics.hrm,
                        hrd: period.metrics.hrd,
                        mttr: period.metrics.mttr,
                        disp: Number(period.metrics.disp),
                        util: Number(period.metrics.util),
                        sw: Number(period.metrics.sw),
                        obj_d: parc.objectifDispo,
                        obj_u: parc.objectifUtil,
                        isTotal: false,
                    });
                }
            }

            for (const period of [
                {
                    key: "M",
                    label: "Mensuel",
                    nho: groupe.totalTypeParc.nhoMois,
                    metrics: groupe.totalTypeParc.aggregatesMois,
                },
                {
                    key: "A",
                    label: "Cumul annuel",
                    nho: groupe.totalTypeParc.nhoAnnee,
                    metrics: groupe.totalTypeParc.aggregatesAnnee,
                },
            ]) {
                result.push({
                    id: `${groupe.typeParcId}-total-${period.key}`,
                    typeParcName: groupe.typeParcName,
                    parcName: `TOTAL ${groupe.typeParcName}`,
                    period: period.label,
                    nbre: groupe.totalTypeParc.nbreEngins,
                    nho: period.nho,
                    him: period.metrics.him,
                    hrm: period.metrics.hrm,
                    hrd: period.metrics.hrd,
                    mttr: period.metrics.mttr,
                    disp: Number(period.metrics.disp),
                    util: Number(period.metrics.util),
                    sw: Number(period.metrics.sw),
                    obj_d: null,
                    obj_u: null,
                    isTotal: true,
                });
            }
        }

        return result;
    }, [data]);

    const filteredRows = useMemo(() => {
        const query = search.trim().toLocaleLowerCase("fr");

        const filtered = rows.filter((row) => {
            if (!query) return true;

            return [
                row.typeParcName,
                row.parcName,
                row.period,
            ].some((value) =>
                value.toLocaleLowerCase("fr").includes(query),
            );
        });

        return [...filtered].sort((a, b) => {
            const left = a[sortColumn as keyof ReportRow];
            const right = b[sortColumn as keyof ReportRow];

            let comparison: number;

            if (typeof left === "number" && typeof right === "number") {
                comparison = left - right;
            } else {
                comparison = String(left ?? "").localeCompare(
                    String(right ?? ""),
                    "fr",
                    { numeric: true },
                );
            }

            return sortDirection === "asc" ? comparison : -comparison;
        });
    }, [rows, search, sortColumn, sortDirection]);

    function toggleSort(key: string) {
        if (sortColumn === key) {
            setSortDirection((current) =>
                current === "asc" ? "desc" : "asc",
            );
        } else {
            setSortColumn(key);
            setSortDirection("asc");
        }
    }

    function toggleColumn(key: string) {
        setVisibleColumns((current) =>
            current.includes(key)
                ? current.filter((column) => column !== key)
                : [...current, key],
        );
    }

    function cellClass(row: ReportRow, key: string) {
        const base = compact ? "px-2 py-1" : "px-3 py-3";

        if (row.isTotal) {
            return `${base} bg-muted/50 font-semibold`;
        }

        if (key === "disp" && row.obj_d != null) {
            return `${base} ${row.disp >= row.obj_d
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`;
        }

        if (key === "util" && row.obj_u != null) {
            return `${base} ${row.util >= row.obj_u
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`;
        }

        return base;
    }

    if (data.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                Aucune donnée disponible pour cette période.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative min-w-56 flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Rechercher un parc ou un type..."
                        className="pl-9"
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCompact((value) => !value)}
                    >
                        {compact ? "Mode normal" : "Mode compact"}
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            setShowColumnManager((value) => !value)
                        }
                    >
                        <Columns3 className="mr-2 size-4" />
                        Colonnes
                    </Button>
                </div>
            </div>

            {showColumnManager && (
                <div className="grid grid-cols-2 gap-3 rounded-lg border p-4 sm:grid-cols-4">
                    {COLUMNS.map((column) => (
                        <label
                            key={column.key}
                            className="flex items-center gap-2 text-sm"
                        >
                            <input
                                type="checkbox"
                                checked={visibleColumns.includes(column.key)}
                                onChange={() => toggleColumn(column.key)}
                                className="size-4 accent-primary"
                            />
                            {column.label}
                        </label>
                    ))}

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                            setVisibleColumns(
                                COLUMNS.map((column) => column.key),
                            )
                        }
                    >
                        Tout afficher
                    </Button>
                </div>
            )}

            <p className="text-sm text-muted-foreground">
                {filteredRows.length} ligne(s) affichée(s).
                Les objectifs sont surlignés en vert lorsqu’ils sont atteints,
                et en rouge lorsqu’ils ne le sont pas.
            </p>

            <div className="w-full overflow-x-auto rounded-md border">
                <Table id="rapport-etat-mensuel-table">
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            {COLUMNS.filter((column) =>
                                visibleColumns.includes(column.key),
                            ).map((column) => (
                                <TableHead
                                    key={column.key}
                                    className="whitespace-nowrap"
                                >
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1 font-semibold"
                                        onClick={() =>
                                            column.sortable &&
                                            toggleSort(column.key)
                                        }
                                    >
                                        {column.label}
                                        {column.sortable && (
                                            <ArrowUpDown className="size-3" />
                                        )}
                                    </button>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {filteredRows.map((row) => (
                            <TableRow key={row.id}>
                                {COLUMNS.filter((column) =>
                                    visibleColumns.includes(column.key),
                                ).map((column) => {
                                    const value =
                                        row[column.key as keyof ReportRow];

                                    return (
                                        <TableCell
                                            key={column.key}
                                            className={cellClass(row, column.key)}
                                        >
                                            {formatValue(value, column.key)}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}

                        {filteredRows.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={visibleColumns.length}
                                    className="py-8 text-center text-muted-foreground"
                                >
                                    Aucun résultat pour cette recherche.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
