"use client";

import type { JSX } from "react";

import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Cell,
} from "recharts";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type { BacklogPeriodStats } from "@/lib/types/backlog";

const DISTRIBUTION_COLORS = [
    "#0072B2",
    "#E69F00",
    "#009E73",
    "#CC79A7",
    "#D55E00",
];
const PRIORITY_COLORS = {
    ELEVEE: "#DC2626",
    MOYENNE: "#F97316",
    FAIBLE: "#EAB308",
};
const DONE_COLOR = "#22C55E";

const DETECTION_COLOR = "#0072B2";
const EXECUTION_COLOR = DONE_COLOR;

function readable(value: string): string {
    return value.replaceAll("_", " ").toLowerCase();
}

function chartDomainMax(dataMax: number): number {
    return dataMax + Math.max(1, dataMax * 0.2);
}

function ChartLegend({
    items,
    label,
}: {
    items: { marker: string; label: string; color: string }[];
    label: string;
}): JSX.Element {
    return (
        <div
            aria-label={label}
            className="flex flex-wrap content-start items-center justify-center gap-x-3 gap-y-1 overflow-hidden py-1 text-[11px]"
        >
            {items.map((item) => (
                <div
                    key={item.marker}
                    className="flex min-w-0 items-center gap-1.5 whitespace-nowrap"
                    title={`${item.marker} : ${item.label}`}
                >
                    <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: item.color }}
                    />
                    <span
                        className="shrink-0 font-semibold"
                        style={{ color: item.color }}
                    >
                        {item.marker}
                    </span>
                    <span className="truncate text-muted-foreground">
                        {item.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

function DistributionChart({
    title,
    data,
    colorByLabel,
}: {
    title: string;
    data: { label: string; value: number }[];
    colorByLabel?: Record<string, string>;
}): JSX.Element {
    const hasData = data.some((item) => item.value > 0);
    const chartData = data.map((item, index) => ({
        ...item,
        marker: String.fromCharCode(65 + index),
        color:
            colorByLabel?.[item.label] ??
            DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length],
    }));
    const labelsByMarker = new Map(
        chartData.map((item) => [item.marker, readable(item.label)]),
    );
    const legendItems = chartData.map((item) => ({
        marker: item.marker,
        label: readable(item.label),
        color: item.color,
    }));

    return (
        <Card className="gap-2">
            <CardHeader className="pb-0 text-center">
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                {hasData ? (
                    <div className="grid h-56 grid-rows-[2.5rem_1fr]">
                        <ChartLegend
                            items={legendItems}
                            label="Légende des catégories"
                        />
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="marker"
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    domain={[0, chartDomainMax]}
                                />
                                <Tooltip
                                    formatter={(value) => [value, "Backlogs"]}
                                    labelFormatter={(marker) =>
                                        labelsByMarker.get(String(marker)) ??
                                        String(marker)
                                    }
                                />
                                <Bar
                                    dataKey="value"
                                    name="Backlogs"
                                    barSize={32}
                                    radius={[4, 4, 0, 0]}
                                >
                                    {chartData.map((item) => (
                                        <Cell
                                            key={item.label}
                                            fill={item.color}
                                        />
                                    ))}
                                    <LabelList dataKey="value" position="top" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                        Aucun backlog sur cette période.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function BacklogStatsCharts({
    stats,
}: {
    stats: BacklogPeriodStats;
}): JSX.Element {
    const totalDetected = stats.evolution.reduce(
        (total, point) => total + point.backlogs,
        0,
    );
    const totalExecuted = stats.evolution.reduce(
        (total, point) => total + point.executes,
        0,
    );
    const evolutionLegendItems = [
        {
            marker: "A",
            label: "Backlogs détectés",
            color: DETECTION_COLOR,
        },
        {
            marker: "B",
            label: "Backlogs exécutés",
            color: EXECUTION_COLOR,
        },
    ];

    return (
        <>
            <Card className="gap-1">
                <CardHeader className="pb-0">
                    <CardTitle>Évolution des backlogs et des exécutions</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    {stats.evolution.length > 0 ? (
                        <div className="grid h-64 grid-rows-[2rem_1fr]">
                            <ChartLegend
                                items={evolutionLegendItems}
                                label="Légende de l’évolution"
                            />
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={stats.evolution}
                                    margin={{
                                        top: 12,
                                        right: 12,
                                        bottom: 4,
                                        left: 0,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="label"
                                        minTickGap={24}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        domain={[0, chartDomainMax]}
                                    />
                                    <Tooltip />
                                    <Bar
                                        dataKey="backlogs"
                                        name="Backlogs détectés"
                                        fill={DETECTION_COLOR}
                                        radius={[4, 4, 0, 0]}
                                    >
                                        <LabelList
                                            dataKey="backlogs"
                                            position="top"
                                        />
                                    </Bar>
                                    <Bar
                                        dataKey="executes"
                                        name="Backlogs exécutés"
                                        fill={EXECUTION_COLOR}
                                        radius={[4, 4, 0, 0]}
                                    >
                                        <LabelList
                                            dataKey="executes"
                                            position="top"
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            Aucun backlog trouvé.
                        </p>
                    )}
                    {stats.evolution.length > 0 && (
                        <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 border-t pt-2 text-sm">
                            <span>
                                Total détecté :{" "}
                                <strong>{totalDetected}</strong>
                            </span>
                            <span>
                                Total exécuté :{" "}
                                <strong>{totalExecuted}</strong>
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-2 lg:grid-cols-3">
                <DistributionChart
                    title="Répartition par source"
                    data={stats.parSource}
                />
                <DistributionChart
                    title="Répartition par priorité"
                    data={stats.parPriorite}
                    colorByLabel={PRIORITY_COLORS}
                />
                <DistributionChart
                    title="Répartition par statut"
                    data={stats.parStatut}
                    colorByLabel={{ EXECUTE: DONE_COLOR }}
                />
            </div>
        </>
    );
}
