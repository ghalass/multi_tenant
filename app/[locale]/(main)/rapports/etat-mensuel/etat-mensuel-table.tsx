"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import React from "react";

type Metrics = {
    him: number;
    hrm: number;
    ni: number;
    hrd: number;
    mttr: number;
    disp: number;
    util: number;
    sw: number;
    tdm: number;
    mtbf: number;
};

type PeriodData = {
    nhoMois: number;
    nhoAnnee: number;
    aggregatesMois: Metrics;
    aggregatesAnnee: Metrics;
};

type EnginData = PeriodData & {
    enginId: string;
    enginName: string;
    nbreEngins: number;
    objectifDispo: number | null;
    objectifUtil: number | null;
};

type ParcData = PeriodData & {
    parcId: string;
    parcName: string;
    nbreEngins: number;
    objectifDispo: number | null;
    objectifUtil: number | null;
    engins: EnginData[];
};

type TypeParcData = {
    typeParcId: string;
    typeParcName: string;
    parcs: ParcData[];
};

const COLUMNS = [
    { key: "nbre", label: "NBRE" },
    { key: "nho", label: "NHO" },
    { key: "him", label: "HIM" },
    { key: "hrm", label: "HRM" },
    { key: "hrd", label: "HRD" },
    { key: "mttr", label: "MTTR" },
    { key: "disp", label: "DISPO" },
    { key: "util", label: "UTIL" },
    { key: "sw", label: "SW" },
    { key: "objD", label: "OBJ_D" },
    { key: "objU", label: "OBJ_U" },
] as const;

type MetricKey = (typeof COLUMNS)[number]["key"];

function formatNumber(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(Number(value))) {
        return "—";
    }

    return new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 2,
    }).format(Number(value));
}

function formatPercent(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(Number(value))) {
        return "—";
    }

    return `${formatNumber(value)} %`;
}

function getMetricValue(
    key: MetricKey,
    nbreEngins: number,
    nho: number,
    metrics: Metrics,
    objectifDispo: number | null,
    objectifUtil: number | null,
): string {
    switch (key) {
        case "nbre":
            return formatNumber(nbreEngins);
        case "nho":
            return formatNumber(nho);
        case "him":
            return formatNumber(metrics.him);
        case "hrm":
            return formatNumber(metrics.hrm);
        case "hrd":
            return formatNumber(metrics.hrd);
        case "mttr":
            return formatNumber(metrics.mttr);
        case "disp":
            return formatPercent(metrics.disp);
        case "util":
            return formatPercent(metrics.util);
        case "sw":
            return formatPercent(metrics.sw);
        case "objD":
            return formatPercent(objectifDispo);
        case "objU":
            return formatPercent(objectifUtil);
    }
}

function getMetricClass(
    key: MetricKey,
    metrics: Metrics,
    objectifDispo: number | null,
    objectifUtil: number | null,
): string {
    if (key === "disp" && objectifDispo != null) {
        return metrics.disp >= objectifDispo
            ? "font-medium text-green-600 dark:text-green-400"
            : "font-medium text-red-600 dark:text-red-400";
    }

    if (key === "util" && objectifUtil != null) {
        return metrics.util >= objectifUtil
            ? "font-medium text-green-600 dark:text-green-400"
            : "font-medium text-red-600 dark:text-red-400";
    }

    return "";
}

function PeriodRow({
    label,
    nbreEngins,
    nho,
    metrics,
    objectifDispo,
    objectifUtil,
}: {
    label: string;
    nbreEngins: number;
    nho: number;
    metrics: Metrics;
    objectifDispo: number | null;
    objectifUtil: number | null;
}) {
    return (
        <TableRow>
            <TableCell className="whitespace-nowrap font-medium">
                {label}
            </TableCell>

            {COLUMNS.map((column) => (
                <TableCell
                    key={column.key}
                    className={`whitespace-nowrap text-right ${getMetricClass(
                        column.key,
                        metrics,
                        objectifDispo,
                        objectifUtil,
                    )}`}
                >
                    {getMetricValue(
                        column.key,
                        nbreEngins,
                        nho,
                        metrics,
                        objectifDispo,
                        objectifUtil,
                    )}
                </TableCell>
            ))}
        </TableRow>
    );
}

function PeriodRows({
    data,
    nbreEngins,
    objectifDispo,
    objectifUtil,
}: {
    data: PeriodData;
    nbreEngins: number;
    objectifDispo: number | null;
    objectifUtil: number | null;
}) {
    return (
        <>
            <PeriodRow
                label="Mensuel"
                nbreEngins={nbreEngins}
                nho={data.nhoMois}
                metrics={data.aggregatesMois}
                objectifDispo={objectifDispo}
                objectifUtil={objectifUtil}
            />

            <PeriodRow
                label="Cumul annuel"
                nbreEngins={nbreEngins}
                nho={data.nhoAnnee}
                metrics={data.aggregatesAnnee}
                objectifDispo={objectifDispo}
                objectifUtil={objectifUtil}
            />
        </>
    );
}

export default function EtatMensuelTable({
    data, periode
}: {
    data: TypeParcData[];
    periode?: string
}) {
    if (!data || data.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                Aucune donnée disponible pour cette période et ce parc.
            </p>
        );
    }

    const columnCount = COLUMNS.length + 1;

    return (
        <div className="w-full space-y-2">
            {data.map((typeParc) => (
                <section key={typeParc.typeParcId} className="space-y-2">
                    {typeParc.parcs.map((parc) => (
                        <div
                            key={parc.parcId}
                            className="overflow-hidden rounded-md border"
                        >
                            <div className="w-full overflow-x-auto">
                                <Table id="rapport-etat-mensuel-table">
                                    <TableHeader>
                                        <TableRow className="bg-muted/20">
                                            <TableHead className="min-w-32">
                                                {typeParc.typeParcName}{" - "}{parc.parcName}{" - "}{periode}
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
                                        <PeriodRows
                                            data={parc}
                                            nbreEngins={parc.nbreEngins}
                                            objectifDispo={parc.objectifDispo}
                                            objectifUtil={parc.objectifUtil}
                                        />

                                        {parc.engins.map((engin) => (
                                            <React.Fragment key={engin.enginId}>
                                                <TableRow
                                                    key={`${engin.enginId}-heading`}
                                                    className="border-t-2 bg-muted/40"
                                                >
                                                    <TableCell
                                                        colSpan={columnCount}
                                                        className="py-2 font-semibold"
                                                    >
                                                        Engin : {engin.enginName}
                                                    </TableCell>
                                                </TableRow>

                                                <PeriodRows
                                                    key={`${engin.enginId}-periods`}
                                                    data={engin}
                                                    nbreEngins={1}
                                                    objectifDispo={engin.objectifDispo}
                                                    objectifUtil={engin.objectifUtil}
                                                />
                                            </React.Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ))}
                </section>
            ))}

            <p className="text-xs text-muted-foreground">
                DISPO et UTIL sont comparés aux objectifs disponibles. SW reste
                à 0 tant que sa formule et ses données sources ne sont pas
                définies.
            </p>
        </div>
    );
}