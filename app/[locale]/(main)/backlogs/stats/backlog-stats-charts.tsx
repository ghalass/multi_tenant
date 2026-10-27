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
} from "recharts";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type { BacklogPeriodStats } from "@/lib/types/backlog";

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
                                    fill="#2563eb"
                                    radius={[0, 4, 4, 0]}
                                >
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
    return (
        <>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Évolution des backlogs et des exécutions</CardTitle>
                    <CardDescription>
                        Nouveaux backlogs par date de détection et exécutés par date
                        d’exécution, regroupés par {stats.pas}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={stats.evolution}
                                margin={{ top: 20, right: 12, bottom: 4, left: 0 }}
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
                                    fill="#2563eb"
                                    radius={[4, 4, 0, 0]}
                                >
                                    <LabelList dataKey="backlogs" position="top" />
                                </Bar>
                                <Bar
                                    dataKey="executes"
                                    name="Backlogs exécutés"
                                    fill="#16a34a"
                                    radius={[4, 4, 0, 0]}
                                >
                                    <LabelList dataKey="executes" position="top" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
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
                    description="Statut actuel des backlogs analysés."
                    data={stats.parStatut}
                    total={stats.total}
                />
            </div>
        </>
    );
}
