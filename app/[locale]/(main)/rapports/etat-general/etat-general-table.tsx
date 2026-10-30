"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import type {
    TypeParcEtatGeneral,
    EnginEtatGeneral,
} from "@/server/rapports/rapport_etat-general";

type ColumnKey =
    | "engin"
    | "site"
    | "parc"
    | "typeParc"
    | "hrmMois";

type Column = {
    key: ColumnKey;
    label: string;
};

type RowKind =
    | "engin"
    | "total-parc"
    | "total-typeparc";

type ReportRow = {
    id: string;
    kind: RowKind;
    engin: string;
    site: string;
    parc: string;
    typeParc: string;
    hrmMois: number | null;
};

const COLUMNS: Column[] = [
    { key: "engin", label: "Engin" },
    { key: "site", label: "Site" },
    { key: "parc", label: "Parc" },
    { key: "typeParc", label: "Type de parc" },
    { key: "hrmMois", label: "HRM du mois (h)" },
];

function formatNumber(
    value: number | null | undefined,
): string {
    if (
        value == null ||
        !Number.isFinite(Number(value))
    ) {
        return "—";
    }

    return new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 2,
    }).format(Number(value));
}

function formatCellValue(
    value: string | number | null,
): string {
    if (value == null) {
        return "—";
    }

    if (typeof value === "number") {
        return formatNumber(value);
    }

    return value;
}

function toEnginRow(
    engin: EnginEtatGeneral,
): ReportRow {
    return {
        id: `engin-${engin.enginId}`,
        kind: "engin",
        engin: engin.enginName,
        site: engin.siteName,
        parc: engin.parcName,
        typeParc: engin.typeParcName,
        hrmMois: engin.hrmMois,
    };
}

export default function EtatGeneralTable({
    data,
    periode,
}: {
    data: TypeParcEtatGeneral[];
    periode: string;
}) {
    if (!data || data.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="font-medium">
                    Aucune donnée disponible pour cette période et ce parc.
                </p>
            </div>
        );
    }

    const premierTypeParc = data[0];
    const premierParc = premierTypeParc?.parcs[0];

    const titreEngin = premierParc
        ? `${premierTypeParc.typeParcName} - ${premierParc.parcName} - ${periode}`
        : `Engin - ${periode}`;

    const allRows: ReportRow[] = [];

    for (const typeParc of data) {
        for (const parc of typeParc.parcs) {
            for (const engin of parc.engins) {
                allRows.push(toEnginRow(engin));
            }

            allRows.push({
                id: `total-parc-${parc.parcId}`,
                kind: "total-parc",
                engin: `TOTAL ${parc.parcName}`,
                site: "",
                parc: "",
                typeParc: "",
                hrmMois: parc.totalParc.totalHRMMois,
            });
        }

        allRows.push({
            id: `total-typeparc-${typeParc.typeParcId}`,
            kind: "total-typeparc",
            engin: `TOTAL ${typeParc.typeParcName}`,
            site: "",
            parc: "",
            typeParc: "",
            hrmMois: typeParc.totalTypeParc.totalHRMMois,
        });
    }

    function renderHeaders() {
        return (
            <TableRow>
                {COLUMNS.map((column) => (
                    <TableHead
                        key={column.key}
                        className={`whitespace-nowrap ${column.key === "engin"
                                ? "min-w-56 text-left font-semibold"
                                : "text-center"
                            }`}
                    >
                        {column.key === "engin"
                            ? titreEngin
                            : column.label}
                    </TableHead>
                ))}
            </TableRow>
        );
    }

    function renderRows(rows: ReportRow[]) {
        return rows.map((row) => {
            const rowClass =
                row.kind === "total-typeparc"
                    ? "border-t-2 border-blue-300 bg-blue-500/10 font-bold dark:border-blue-800"
                    : row.kind === "total-parc"
                        ? "border-t bg-muted/60 font-semibold"
                        : "hover:bg-accent/40";

            return (
                <TableRow
                    key={row.id}
                    className={rowClass}
                >
                    {COLUMNS.map((column) => (
                        <TableCell
                            key={column.key}
                            className="whitespace-nowrap px-3 py-2 text-center"
                        >
                            {formatCellValue(row[column.key])}
                        </TableCell>
                    ))}
                </TableRow>
            );
        });
    }

    return (
        <div className="w-full">
            <div className="overflow-hidden rounded-md border">
                <div className="overflow-x-auto">
                    <Table id="rapport-etat-general-table">
                        <TableHeader className="bg-muted/50">
                            {renderHeaders()}
                        </TableHeader>

                        <TableBody>
                            {renderRows(allRows)}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="hidden">
                <Table id="rapport-etat-general-export-table">
                    <TableHeader>
                        {renderHeaders()}
                    </TableHeader>

                    <TableBody>
                        {renderRows(allRows)}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}