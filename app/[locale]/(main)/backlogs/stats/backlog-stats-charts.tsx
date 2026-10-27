"use client";

import type { JSX } from "react";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
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
    CardDescription,
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

const DETECTION_COLOR = "#0072B2";
const EXECUTION_COLOR = "#D55E00";

function readable(value: string): string {
    return value.replaceAll("_", " ").toLowerCase();
}

function DistributionChart({
    title,
    description,
    data,
    total,
}: {
    title: string;
    description: string;
    data: { label: string; value: number }[];
    total?: number;
}): JSX.Element {
    const hasData = data.some((item) => item.value > 0);

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                {total !== undefined && (
                    <p className="mb-1 text-sm font-medium">
                        Total des backlogs :{" "}
                        <span className="text-lg font-bold">{total}</span>
                    </p>
                )}
                {hasData ? (
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data}
                                layout="vertical"
                                margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    horizontal={false}
                                />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis
                                    type="category"
                                    dataKey="label"
                                    width={90}
                                    tickFormatter={readable}
                                    tick={{ fontSize: 11 }}
                                />
                                <Tooltip
                                    formatter={(value) => [value, "Backlogs"]}
                                    labelFormatter={(label) =>
                                        readable(String(label))
                                    }
                                />
                                <Bar
                                    dataKey="value"
                                    name="Backlogs"
                                    radius={[0, 4, 4, 0]}
                                >
                                    {data.map((item, index) => (
                                        <Cell
                                            key={item.label}
                                            fill={
                                                DISTRIBUTION_COLORS[
                                                    index % DISTRIBUTION_COLORS.length
                                                ]
                                            }
                                        />
                                    ))}
                                    <LabelList dataKey="value" position="right" />
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

    return (
        <>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Évolution des backlogs et des exécutions</CardTitle>
                    <CardDescription>
                        Détections par date de détection et exécutions par date
                        d’exécution, affichées par {stats.pas}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    {stats.evolution.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={stats.evolution}
                                    margin={{
                                        top: 20,
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
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Legend />
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
                        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 border-t pt-2 text-sm">
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
                    description={stats.global
                        ? "Répartition globale des backlogs."
                        : "Backlogs détectés pendant la période."}
                    data={stats.parSource}
                />
                <DistributionChart
                    title="Répartition par priorité"
                    description={stats.global
                        ? "Répartition globale des backlogs."
                        : "Backlogs détectés pendant la période."}
                    data={stats.parPriorite}
                />
                <DistributionChart
                    title="Répartition par statut"
                    description="Statut actuel des backlogs détectés pendant la période."
                    data={stats.parStatut}
                    total={stats.total}
                />
            </div>
        </>
    );
}
