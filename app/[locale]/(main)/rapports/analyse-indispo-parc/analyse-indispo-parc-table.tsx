
"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Fragment } from "react/jsx-runtime";

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
    description: string | null;
} & Totaux;

type TypePanne = {
    typepanneId: string;
    typepanneName: string;
    pannes: Panne[];
    totalTypePanne: Totaux;
};

type TotauxScope = Totaux & {
    nhoMois: number;
    nhoAnnee: number;
    indispMois: number;
    indispAnnee: number;
};

type ScopeResult = {
    scopeId: string;
    scopeName: string;
    nbreEngins: number;
    nhoMois: number;
    nhoAnnee: number;
    pannes: TypePanne[];
    total: TotauxScope;
};

type TypeParcResult = {
    typeParcId: string;
    typeParcName: string;
    parc: ScopeResult;
    engins: ScopeResult[];
};

type Props = {
    data: TypeParcResult[];
    periode: string;
};

const COLUMNS = [
    { key: "niMois", label: "NI Mens." },
    { key: "niAnnee", label: "NI Cumul annuel" },
    { key: "himMois", label: "HIM Mens." },
    { key: "himAnnee", label: "HIM Cumul annuel" },
    { key: "coeffNiMois", label: "Coef. NI Mens. (%)" },
    { key: "coeffNiAnnee", label: "Coef. NI annuel (%)" },
    { key: "coeffHimMois", label: "Coef. HIM Mens. (%)" },
    { key: "coeffHimAnnee", label: "Coef. HIM annuel (%)" },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

function formatNumber(value: number | undefined): string {
    if (value == null || !Number.isFinite(value)) return "—";

    return new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 2,
    }).format(value);
}

function formatPercent(value: number | undefined): string {
    return value == null || !Number.isFinite(value)
        ? "—"
        : `${formatNumber(value)} %`;
}

function displayValue(row: Totaux, key: ColumnKey): string {
    const value = row[key];

    return key.startsWith("coeff")
        ? formatPercent(value)
        : formatNumber(value);
}

function TotalRow({
    label,
    total,
    nhoMois,
    nhoAnnee,
    nbreEngins,
}: {
    label: string;
    total: TotauxScope;
    nhoMois: number;
    nhoAnnee: number;
    nbreEngins: number;
}) {
    return (
        <TableRow className="bg-secondary/60 font-semibold">
            <TableCell className="min-w-64">{label}</TableCell>
            <TableCell className="text-right tabular-nums">
                {formatNumber(nbreEngins)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
                {formatNumber(nhoMois)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
                {formatNumber(nhoAnnee)}
            </TableCell>

            {COLUMNS.map((column) => (
                <TableCell
                    key={column.key}
                    className="text-right tabular-nums"
                >
                    {displayValue(total, column.key)}
                </TableCell>
            ))}
        </TableRow>
    );
}

function ScopeRows({
    scope,
    label,
}: {
    scope: ScopeResult;
    label: string;
}) {
    return (
        <>
            <TableRow
                className={
                    label === "ANALYSE DU PARC"
                        ? "border-t-4 border-t-blue-500 bg-blue-500/10"
                        : "border-t-4 border-t-emerald-500 bg-emerald-500/10"
                }
            >
                <TableCell
                    colSpan={COLUMNS.length + 4}
                    className="py-2 font-semibold"
                >
                    {label}
                </TableCell>
            </TableRow>

            <TotalRow
                label={`TOTAL ${scope.scopeName}`}
                total={scope.total}
                nbreEngins={scope.nbreEngins}
                nhoMois={scope.nhoMois}
                nhoAnnee={scope.nhoAnnee}
            />

            {scope.pannes.map((typePanne) => (
                <Fragment key={`${scope.scopeId}-${typePanne.typepanneId}`}>
                    <TableRow
                        key={`type-${scope.scopeId}-${typePanne.typepanneId}`}
                        className="bg-muted/20"
                    >
                        <TableCell
                            colSpan={COLUMNS.length + 4}
                            className="py-1 font-medium"
                        >
                            {typePanne.typepanneName}
                        </TableCell>
                    </TableRow>

                    {typePanne.pannes.map((panne) => (
                        <TableRow
                            key={`${scope.scopeId}-${panne.panneId}`}
                            className="[&>td]:py-1"
                        >
                            <TableCell className="min-w-64 max-w-80">
                                <div
                                    className="line-clamp-2 whitespace-normal wrap-break-word text-xs"
                                    title={
                                        panne.description
                                            ? `${panne.panneName} - ${panne.description}`
                                            : panne.panneName
                                    }
                                >
                                    {panne.description
                                        ? `${panne.panneName} - ${panne.description}`
                                        : panne.panneName}
                                </div>
                            </TableCell>

                            <TableCell className="text-right tabular-nums">
                                —
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                                —
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                                —
                            </TableCell>

                            {COLUMNS.map((column) => (
                                <TableCell
                                    key={column.key}
                                    className="text-right tabular-nums"
                                >
                                    {displayValue(panne, column.key)}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}


                </Fragment>
            ))}
        </>
    );
}

export default function AnalyseIndispoParcTable({
    data,
    periode,
}: Props) {
    if (!data || data.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                Aucun engin actif ou aucune donnée disponible pour cette
                période et ce parc.
            </p>
        );
    }

    return (
        <div className="w-full space-y-5">
            {data.map((typeParc) => (
                <section
                    key={typeParc.typeParcId}
                    className="space-y-3"
                >
                    <div className="rounded-md border bg-muted/20 p-3">
                        <h2 className="font-semibold">
                            {typeParc.typeParcName} — {typeParc.parc.scopeName}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Période : {periode} · Mensuel et cumul annuel
                        </p>
                    </div>

                    <div className="overflow-hidden rounded-md border">
                        <div className="w-full overflow-x-auto">
                            <Table id="rapport-analyse-indispo-parc-table">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-64">
                                            Type de panne / panne
                                        </TableHead>
                                        <TableHead className="text-right">
                                            NBRE
                                        </TableHead>
                                        <TableHead className="text-right">
                                            NHO mens.
                                        </TableHead>
                                        <TableHead className="text-right">
                                            NHO cumul
                                        </TableHead>

                                        {COLUMNS.map((column) => (
                                            <TableHead
                                                key={column.key}
                                                className="whitespace-nowrap text-right"
                                            >
                                                {column.label}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    <ScopeRows
                                        scope={typeParc.parc}
                                        label="ANALYSE DU PARC"
                                    />

                                    {typeParc.engins.map((engin) => (
                                        <ScopeRows
                                            key={engin.scopeId}
                                            scope={engin}
                                            label={`ENGIN : ${engin.scopeName}`}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </section>
            ))}
        </div>
    );
}
