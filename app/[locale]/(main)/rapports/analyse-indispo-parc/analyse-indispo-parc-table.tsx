
"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type Totaux = {
    niMois: number;
    niAnnee: number;
    himMois: number;
    himAnnee: number;
    coeffNiMois: number;
    coeffNiAnnee: number;
    coeffHimMois: number;
    coeffHimAnnee: number;
};

type Panne = {
    panneId: string;
    panneName: string;
} & Totaux;

type TypePanne = {
    typepanneId: string;
    typepanneName: string;
    pannes: Panne[];
    totalTypePanne: Totaux;
};

type TotauxParc = Totaux & {
    nhoMois: number;
    nhoAnnee: number;
    indispMois: number;
    indispAnnee: number;
};

type Parc = {
    parcId: string;
    parcName: string;
    nbreEngins: number;
    nhoMois: number;
    nhoAnnee: number;
    pannes: TypePanne[];
    totalParc: TotauxParc;
};

type TypeParc = {
    typeParcId: string;
    typeParcName: string;
    parcs: Parc[];
    totalTypeParc: TotauxParc;
};

type OptionParc = {
    id: string;
    name: string;
    nbreEngins: number;
};

type OptionTypeParc = {
    id: string;
    name: string;
    parcs: OptionParc[];
};

type Props = {
    data: TypeParc[];
    options: OptionTypeParc[];
    periode: string;
};

type RowData = {
    id: string;
    kind: "header" | "parc" | "type" | "detail" | "subtotal" | "total";
    categorie: string;
    panne: string;
    niMois?: number;
    niAnnee?: number;
    himMois?: number;
    himAnnee?: number;
    coeffNiMois?: number;
    coeffNiAnnee?: number;
    coeffHimMois?: number;
    coeffHimAnnee?: number;
};

const COLUMNS = [
    { key: "categorie", label: "CATÉGORIE", group: "identite" },
    { key: "panne", label: "PANNE", group: "identite" },
    { key: "niMois", label: "NI Mens", group: "ni" },
    { key: "niAnnee", label: "NI Annuel", group: "ni" },
    { key: "himMois", label: "HIM Mens", group: "him" },
    { key: "himAnnee", label: "HIM Annuel", group: "him" },
    { key: "coeffNiMois", label: "COEF NI Mens", group: "coeff" },
    { key: "coeffNiAnnee", label: "COEF NI Annuel", group: "coeff" },
    { key: "coeffHimMois", label: "COEF HIM Mens", group: "coeff" },
    { key: "coeffHimAnnee", label: "COEF HIM Annuel", group: "coeff" },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

const DEFAULT_COLUMNS: ColumnKey[] = COLUMNS.map(
    (column) => column.key,
);

function formatNumber(value: number | undefined): string {
    if (value == null || !Number.isFinite(value)) return "—";

    return new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 2,
    }).format(value);
}

function formatCoefficient(value: number | undefined): string {
    if (value == null || !Number.isFinite(value)) return "—";
    return `${formatNumber(value)} %`;
}

function createRows(
    data: TypeParc[],
    selectedTypeParc: string,
    selectedParc: string,
): RowData[] {
    const rows: RowData[] = [];

    for (const typeParc of data) {
        if (
            selectedTypeParc !== "all" &&
            typeParc.typeParcId !== selectedTypeParc
        ) {
            continue;
        }

        rows.push({
            id: `typeparc-${typeParc.typeParcId}`,
            kind: "header",
            categorie: typeParc.typeParcName.toUpperCase(),
            panne: "",
        });

        for (const parc of typeParc.parcs) {
            if (selectedParc !== "all" && parc.parcId !== selectedParc) {
                continue;
            }

            rows.push({
                id: `parc-${parc.parcId}`,
                kind: "parc",
                categorie: "",
                panne: `PARC : ${parc.parcName} (${parc.nbreEngins} engins)`,
            });

            for (const typePanne of parc.pannes) {
                rows.push({
                    id: `type-panne-${parc.parcId}-${typePanne.typepanneId}`,
                    kind: "type",
                    categorie: typePanne.typepanneName,
                    panne: "",
                });

                for (const panne of typePanne.pannes) {
                    rows.push({
                        id: `panne-${parc.parcId}-${panne.panneId}`,
                        kind: "detail",
                        categorie: typePanne.typepanneName,
                        panne: panne.panneName,
                        niMois: panne.niMois,
                        niAnnee: panne.niAnnee,
                        himMois: panne.himMois,
                        himAnnee: panne.himAnnee,
                        coeffNiMois: panne.coeffNiMois,
                        coeffNiAnnee: panne.coeffNiAnnee,
                        coeffHimMois: panne.coeffHimMois,
                        coeffHimAnnee: panne.coeffHimAnnee,
                    });
                }

                rows.push({
                    id: `subtotal-${parc.parcId}-${typePanne.typepanneId}`,
                    kind: "subtotal",
                    categorie: "",
                    panne: `TOTAL ${typePanne.typepanneName.toUpperCase()}`,
                    ...typePanne.totalTypePanne,
                });
            }

            rows.push({
                id: `total-parc-${parc.parcId}`,
                kind: "total",
                categorie: "",
                panne: `TOTAL ${parc.parcName.toUpperCase()}`,
                ...parc.totalParc,
            });
        }

        // Le total du type de parc est affiché uniquement lorsque
        // tous ses parcs sont sélectionnés.
        if (selectedParc === "all") {
            rows.push({
                id: `total-typeparc-${typeParc.typeParcId}`,
                kind: "total",
                categorie: "",
                panne: `TOTAL ${typeParc.typeParcName.toUpperCase()}`,
                ...typeParc.totalTypeParc,
            });
        }
    }

    return rows;
}

export default function AnalyseIndispoParcTable({
    data,
    options,
    periode,
}: Props) {
    const [selectedTypeParc, setSelectedTypeParc] = useState("all");
    const [selectedParc, setSelectedParc] = useState("all");
    const [search, setSearch] = useState("");
    const [visibleColumns, setVisibleColumns] =
        useState<ColumnKey[]>(DEFAULT_COLUMNS);
    const [showColumnManager, setShowColumnManager] = useState(false);
    const [compactMode, setCompactMode] = useState(true);
    const [highlightCoefficients, setHighlightCoefficients] =
        useState(true);

    const parcs = useMemo(() => {
        if (selectedTypeParc === "all") {
            return options.flatMap((typeParc) => typeParc.parcs);
        }

        return (
            options.find((typeParc) => typeParc.id === selectedTypeParc)
                ?.parcs ?? []
        );
    }, [options, selectedTypeParc]);

    const rows = useMemo(
        () => createRows(data, selectedTypeParc, selectedParc),
        [data, selectedTypeParc, selectedParc],
    );

    const filteredRows = useMemo(() => {
        const query = search.trim().toLocaleLowerCase("fr");

        if (!query) return rows;

        // Conserver les lignes de détail correspondantes et les totaux.
        // Les en-têtes restent affichés pour préserver la structure du tableau.
        const details = rows.filter(
            (row) =>
                row.kind === "detail" &&
                `${row.categorie} ${row.panne}`
                    .toLocaleLowerCase("fr")
                    .includes(query),
        );

        const detailIds = new Set(details.map((row) => row.id));
        const matchingCategories = new Set(
            details.map((row) => row.categorie),
        );

        return rows.filter((row) => {
            if (detailIds.has(row.id)) return true;

            if (
                (row.kind === "header" || row.kind === "parc") &&
                `${row.categorie} ${row.panne}`
                    .toLocaleLowerCase("fr")
                    .includes(query)
            ) {
                return true;
            }

            if (
                row.kind === "type" &&
                matchingCategories.has(row.categorie)
            ) {
                return true;
            }

            return (
                row.kind === "subtotal" &&
                matchingCategories.has(
                    row.panne.replace(/^TOTAL /, ""),
                )
            );
        });
    }, [rows, search]);

    function toggleColumn(key: ColumnKey) {
        setVisibleColumns((current) =>
            current.includes(key)
                ? current.filter((column) => column !== key)
                : [...current, key],
        );
    }

    function resetColumns() {
        setVisibleColumns([...DEFAULT_COLUMNS]);
    }

    function cellValue(row: RowData, key: ColumnKey) {
        if (key === "categorie") return row.categorie;
        if (key === "panne") return row.panne;

        const value = row[key];

        if (
            key === "coeffNiMois" ||
            key === "coeffNiAnnee" ||
            key === "coeffHimMois" ||
            key === "coeffHimAnnee"
        ) {
            return formatCoefficient(value);
        }

        return formatNumber(value);
    }

    function cellClass(key: ColumnKey, row: RowData) {
        const isCoefficient = key.startsWith("coeff");

        if (row.kind === "header") {
            return "bg-primary/10 font-bold text-primary";
        }

        if (row.kind === "parc") {
            return "bg-muted font-semibold";
        }

        if (row.kind === "type") {
            return "bg-muted/50 font-medium";
        }

        if (row.kind === "total" || row.kind === "subtotal") {
            return "bg-secondary font-semibold";
        }

        if (isCoefficient && highlightCoefficients) {
            const value = row[key];

            if (typeof value === "number" && value > 5) {
                return "font-medium text-red-600 dark:text-red-400";
            }

            if (typeof value === "number" && value > 2) {
                return "font-medium text-orange-600 dark:text-orange-400";
            }
        }

        return "";
    }

    if (!data.length) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                Aucune donnée disponible pour cette période.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
                <div className="w-full space-y-2 sm:w-56">
                    <label
                        htmlFor="analyse-type-parc"
                        className="text-sm font-medium"
                    >
                        Type de parc
                    </label>

                    <select
                        id="analyse-type-parc"
                        value={selectedTypeParc}
                        onChange={(event) => {
                            setSelectedTypeParc(event.target.value);
                            setSelectedParc("all");
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="all">Tous les types de parc</option>
                        {options.map((typeParc) => (
                            <option key={typeParc.id} value={typeParc.id}>
                                {typeParc.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="w-full space-y-2 sm:w-56">
                    <label
                        htmlFor="analyse-parc"
                        className="text-sm font-medium"
                    >
                        Parc
                    </label>

                    <select
                        id="analyse-parc"
                        value={selectedParc}
                        onChange={(event) =>
                            setSelectedParc(event.target.value)
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="all">Tous les parcs</option>
                        {parcs.map((parc) => (
                            <option key={parc.id} value={parc.id}>
                                {parc.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="w-full space-y-2 sm:w-64">
                    <label
                        htmlFor="analyse-recherche"
                        className="text-sm font-medium"
                    >
                        Rechercher une panne
                    </label>

                    <Input
                        id="analyse-recherche"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Catégorie ou panne..."
                    />
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCompactMode((current) => !current)}
                >
                    {compactMode ? "Mode normal" : "Mode compact"}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                        setShowColumnManager((current) => !current)
                    }
                >
                    {showColumnManager ? "Masquer colonnes" : "Colonnes"}
                </Button>

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={highlightCoefficients}
                        onChange={(event) =>
                            setHighlightCoefficients(event.target.checked)
                        }
                    />
                    Surligner les coefficients élevés
                </label>
            </div>

            {showColumnManager && (
                <div className="space-y-3 rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-semibold">
                            Colonnes visibles
                        </h2>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={resetColumns}
                        >
                            Réinitialiser
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                        {COLUMNS.map((column) => (
                            <label
                                key={column.key}
                                className="flex items-center gap-2 text-sm"
                            >
                                <input
                                    type="checkbox"
                                    checked={visibleColumns.includes(
                                        column.key,
                                    )}
                                    onChange={() =>
                                        toggleColumn(column.key)
                                    }
                                />
                                {column.label}
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="text-sm text-muted-foreground">
                Période : <span className="font-medium">{periode}</span>
                {" · "}
                {filteredRows.filter((row) => row.kind === "detail").length}
                {" ligne(s) de panne affichée(s)"}
            </div>

            <div className="w-full overflow-x-auto rounded-md border">
                <Table id="rapport-analyse-indispo-parc-table">
                    <TableHeader>
                        <TableRow>
                            {COLUMNS.filter((column) =>
                                visibleColumns.includes(column.key),
                            ).map((column) => (
                                <TableHead
                                    key={column.key}
                                    className="whitespace-nowrap"
                                >
                                    {column.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {filteredRows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={Math.max(
                                        visibleColumns.length,
                                        1,
                                    )}
                                    className="py-8 text-center text-muted-foreground"
                                >
                                    Aucun résultat pour cette recherche.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className={
                                        compactMode
                                            ? "[&>td]:py-1 [&>td]:text-xs"
                                            : ""
                                    }
                                >
                                    {COLUMNS.filter((column) =>
                                        visibleColumns.includes(column.key),
                                    ).map((column) => (
                                        <TableCell
                                            key={column.key}
                                            className={`whitespace-nowrap ${cellClass(
                                                column.key,
                                                row,
                                            )} ${column.key !== "categorie" &&
                                                column.key !== "panne"
                                                ? "text-right tabular-nums"
                                                : ""
                                                }`}
                                        >
                                            {cellValue(row, column.key)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
