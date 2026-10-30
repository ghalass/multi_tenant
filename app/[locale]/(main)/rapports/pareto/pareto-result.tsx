
"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    Legend,
    Line,
    LineChart as RechartsLineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import {
    AlertCircle,
    BarChart3,
    Download,
    LineChart,
} from "lucide-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { exportExcel } from "@/lib/xlsxFn";

import type {
    ParetoDispoItem,
    ParetoIndisponibiliteItem,
    RapportParetoData,
} from "@/server/rapports/rapport_pareto";

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function formatNumber(
    value: number | null | undefined,
): string {
    if (value == null || !Number.isFinite(Number(value))) {
        return "—";
    }

    return new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 2,
    }).format(Number(value));
}

function safeFilename(value: string): string {
    return value
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
        .replace(/\s+/g, "_")
        .slice(0, 100);
}

type ChartLabelProps = {
    x?: number | null;
    y?: number | null;
    value?: number | string | null;
    width?: number | null;
    index?: number;
};

function MtbfLabel(props: ChartLabelProps): import("react").JSX.Element | null {
    const { x, y, value } = props;

    if (
        x == null ||
        y == null ||
        value == null ||
        !Number.isFinite(Number(value))
    ) {
        return null;
    }

    return (
        <text
            x={x}
            y={y - 9}
            fill="#8884d8"
            textAnchor="middle"
            fontSize={9}
        >
            {Number(value).toFixed(2)} h
        </text>
    );
}

function ObjectifLabel(props: ChartLabelProps): import("react").JSX.Element | null {
    const { x, y, value, index } = props;

    if (
        index !== 11 ||
        x == null ||
        y == null ||
        value == null ||
        !Number.isFinite(Number(value))
    ) {
        return null;
    }

    return (
        <text
            x={x - 4}
            y={y + 14}
            fill="#16a34a"
            textAnchor="end"
            fontSize={9}
        >
            Objectif {Number(value).toFixed(2)} h
        </text>
    );
}

function DispoLabel(props: ChartLabelProps): import("react").JSX.Element | null {
    const { x, y, value } = props;

    if (
        x == null ||
        y == null ||
        value == null ||
        !Number.isFinite(Number(value))
    ) {
        return null;
    }

    return (
        <text
            x={x}
            y={y - 9}
            fill="#8884d8"
            textAnchor="middle"
            fontSize={9}
        >
            {Number(value).toFixed(2)}%
        </text>
    );
}

function CountBarLabel(props: ChartLabelProps): import("react").JSX.Element | null {
    const { x, y, width, value } = props;

    if (
        x == null ||
        y == null ||
        width == null ||
        value == null ||
        !Number.isFinite(Number(value))
    ) {
        return null;
    }

    return (
        <text
            x={x + width / 2}
            y={y - 5}
            fill="#666"
            textAnchor="middle"
            fontSize={10}
        >
            {Number(value)}
        </text>
    );
}

function PercentBarLabel(props: ChartLabelProps): import("react").JSX.Element | null {
    const { x, y, width, value } = props;

    if (
        x == null ||
        y == null ||
        width == null ||
        value == null ||
        !Number.isFinite(Number(value))
    ) {
        return null;
    }

    return (
        <text
            x={x + width / 2}
            y={y - 5}
            fill="#666"
            textAnchor="middle"
            fontSize={10}
        >
            {Number(value).toFixed(2)}%
        </text>
    );
}

function PanneName({
    item,
}: {
    item: ParetoIndisponibiliteItem;
}): import("react").JSX.Element {
    return (
        <div
            className="line-clamp-2 max-w-[320px] break-words text-xs leading-4"
            title={
                item.panneDescription
                    ? `${item.panne} - ${item.panneDescription}`
                    : item.panne
            }
        >
            {item.panne}
            {item.panneDescription
                ? ` - ${item.panneDescription}`
                : ""}
        </div>
    );
}

function EnginsHimList({
    item,
}: {
    item: ParetoIndisponibiliteItem;
}): import("react").JSX.Element {
    const engins = item.engins.slice(0, 3);

    if (engins.length === 0) {
        return (
            <span className="text-xs text-muted-foreground">
                —
            </span>
        );
    }

    return (
        <div className="space-y-0.5">
            {engins.map((engin) => (
                <div
                    key={engin.name}
                    className="flex items-center justify-between gap-2 text-xs leading-4"
                >
                    <span className="min-w-0 truncate">
                        {engin.name}
                    </span>

                    <span className="shrink-0 text-muted-foreground">
                        {formatNumber(engin.him)} h
                    </span>
                </div>
            ))}

            {item.engins.length > 3 && (
                <p className="text-[11px] leading-4 text-muted-foreground">
                    +{item.engins.length - 3} autre(s)
                </p>
            )}
        </div>
    );
}

function EnginsNiList({
    item,
}: {
    item: ParetoIndisponibiliteItem;
}): import("react").JSX.Element {
    const engins = item.engins_mtbf.slice(0, 3);

    if (engins.length === 0) {
        return (
            <span className="text-xs text-muted-foreground">
                —
            </span>
        );
    }

    return (
        <div className="space-y-0.5">
            {engins.map((engin) => (
                <div
                    key={engin.name}
                    className="flex items-center justify-between gap-2 text-xs leading-4"
                >
                    <span className="min-w-0 truncate">
                        {engin.name}
                    </span>

                    <span className="shrink-0 text-muted-foreground">
                        {engin.ni} occ.
                    </span>
                </div>
            ))}

            {item.engins_mtbf.length > 3 && (
                <p className="text-[11px] leading-4 text-muted-foreground">
                    +{item.engins_mtbf.length - 3} autre(s)
                </p>
            )}
        </div>
    );
}

function getIndispoBadgeClass(indispo: number): string {
    if (indispo > 5) {
        return "border-red-600 text-red-600";
    }

    if (indispo > 2) {
        return "border-orange-600 text-orange-600";
    }

    return "border-green-600 text-green-600";
}

/* -------------------------------------------------------------------------- */
/*                     Pareto des indisponibilités (HIM)                      */
/* -------------------------------------------------------------------------- */

function ParetoIndisponibilites({
    data,
    periode,
}: {
    data: RapportParetoData;
    periode: string;
}): import("react").JSX.Element {
    const topHim = data.indisponibilites
        .filter((item) => item.himTotal > 0)
        .slice(0, 10);

    return (
        <Card className="h-full min-w-0">
            <CardHeader className="space-y-1 p-3 pb-1">
                <CardTitle className="text-base">
                    Pareto des indisponibilités — {data.parcName} — {periode}
                </CardTitle>

                <CardDescription className="text-xs">
                    Top 10 des pannes les plus pénalisantes en heures
                    d’immobilisation (HIM).
                </CardDescription>
            </CardHeader>

            <CardContent className="p-3 pt-1">
                {topHim.length === 0 ? (
                    <div className="flex h-[270px] flex-col items-center justify-center py-5 text-center text-sm text-muted-foreground">
                        <AlertCircle className="mx-auto mb-2 size-8 opacity-50" />
                        <p>
                            Aucune heure d’immobilisation trouvée pour ce mois.
                        </p>
                    </div>
                ) : (
                    <div
                        id="pareto-indispo-chart"
                        className="h-[270px] w-full min-w-0"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={topHim}
                                margin={{
                                    top: 18,
                                    right: 8,
                                    left: -18,
                                    bottom: 45,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />

                                <XAxis
                                    dataKey="panne"
                                    angle={-35}
                                    textAnchor="end"
                                    interval={0}
                                    height={65}
                                    tick={{ fontSize: 10 }}
                                />

                                <YAxis
                                    width={52}
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(value) => `${value}%`}
                                />

                                <Tooltip
                                    formatter={(value) => [
                                        `${Number(value ?? 0).toFixed(2)}%`,
                                        "Indisponibilité",
                                    ]}
                                    labelFormatter={(label) =>
                                        String(label ?? "")
                                    }
                                />

                                <Legend wrapperStyle={{ fontSize: 11 }} />

                                <Bar
                                    dataKey="indispo"
                                    name="Indisponibilité (%)"
                                    fill="#8884d8"
                                    radius={[3, 3, 0, 0]}
                                >
                                    <LabelList
                                        dataKey="indispo"
                                        content={<PercentBarLabel />}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/* -------------------------------------------------------------------------- */
/*                   Tableau indépendant des pannes HIM                      */
/* -------------------------------------------------------------------------- */

function TopHimTable({
    data,
    filenameSuffix,
}: {
    data: RapportParetoData;
    filenameSuffix: string;
}): import("react").JSX.Element {
    const topHim = data.indisponibilites
        .filter((item) => item.himTotal > 0)
        .slice(0, 10);

    return (
        <Card className="min-w-0">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 p-3 pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base">
                        Top 10 des pannes les plus pénalisantes [HIM]
                    </CardTitle>

                    <CardDescription className="text-xs">
                        Classement des pannes selon les heures
                        d’immobilisation cumulées.
                    </CardDescription>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        exportExcel(
                            "pareto-top-him-export-table",
                            `Pareto_Top10_HIM_${filenameSuffix}`,
                        )
                    }
                >
                    <Download className="mr-2 size-4" />
                    Exporter Top 10 HIM
                </Button>
            </CardHeader>

            <CardContent className="p-3 pt-0">
                {topHim.length === 0 ? (
                    <p className="py-5 text-center text-sm text-muted-foreground">
                        Aucune heure d’immobilisation trouvée pour ce mois.
                    </p>
                ) : (
                    <div className="max-h-[450px] overflow-auto rounded-md border">
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead className="min-w-48 px-2 py-1.5 text-xs">
                                        Panne
                                    </TableHead>

                                    <TableHead className="whitespace-nowrap px-2 py-1.5 text-xs">
                                        Indispo.
                                    </TableHead>

                                    <TableHead className="whitespace-nowrap px-2 py-1.5 text-xs">
                                        HIM
                                    </TableHead>

                                    <TableHead className="min-w-40 px-2 py-1.5 text-xs">
                                        Engins affectés
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {topHim.map((item) => (
                                    <TableRow key={item.panneId}>
                                        <TableCell className="px-2 py-1">
                                            <PanneName item={item} />
                                        </TableCell>

                                        <TableCell className="whitespace-nowrap px-2 py-1">
                                            <Badge
                                                variant="outline"
                                                className={`px-1.5 py-0 text-[11px] ${getIndispoBadgeClass(item.indispo)}`}
                                            >
                                                {formatNumber(item.indispo)}%
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="whitespace-nowrap px-2 py-1 text-xs font-medium">
                                            {formatNumber(item.himTotal)} h
                                        </TableCell>

                                        <TableCell className="px-2 py-1">
                                            <EnginsHimList item={item} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <div
                    aria-hidden="true"
                    className="absolute left-[-10000px] top-0"
                >
                    <table id="pareto-top-him-export-table">
                        <thead>
                            <tr>
                                <th>Panne</th>
                                <th>Description</th>
                                <th>HIM total (h)</th>
                                <th>Indisponibilité (%)</th>
                                <th>Engins affectés</th>
                            </tr>
                        </thead>

                        <tbody>
                            {topHim.map((item) => (
                                <tr key={item.panneId}>
                                    <td>{item.panne}</td>
                                    <td>{item.panneDescription}</td>
                                    <td>{formatNumber(item.himTotal)}</td>
                                    <td>{formatNumber(item.indispo)}</td>
                                    <td>
                                        {item.engins
                                            .map(
                                                (engin) =>
                                                    `${engin.name}: ${formatNumber(engin.him)} h`,
                                            )
                                            .join(" ; ")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

/* -------------------------------------------------------------------------- */
/*                          Pareto des interventions                          */
/* -------------------------------------------------------------------------- */

function ParetoNi({
    data,
    periode,
}: {
    data: RapportParetoData;
    periode: string;
}): import("react").JSX.Element {
    const topNi = [...data.indisponibilites]
        .filter((item) => item.niTotal > 0)
        .sort((a, b) => b.niTotal - a.niTotal)
        .slice(0, 10);

    return (
        <Card className="h-full min-w-0">
            <CardHeader className="space-y-1 p-3 pb-1">
                <CardTitle className="text-base">
                    Pareto NI — {data.parcName} — {periode}
                </CardTitle>

                <CardDescription className="text-xs">
                    Top 10 des pannes classées par nombre d’interventions
                    enregistrées pendant le mois sélectionné.
                </CardDescription>
            </CardHeader>

            <CardContent className="p-3 pt-1">
                {topNi.length === 0 ? (
                    <div className="flex h-[270px] flex-col items-center justify-center py-5 text-center text-sm text-muted-foreground">
                        <AlertCircle className="mx-auto mb-2 size-8 opacity-50" />
                        Aucune intervention panne enregistrée pour ce mois.
                    </div>
                ) : (
                    <div
                        id="pareto-ni-chart"
                        className="h-[270px] w-full min-w-0"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={topNi}
                                margin={{
                                    top: 18,
                                    right: 8,
                                    left: -18,
                                    bottom: 45,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />

                                <XAxis
                                    dataKey="panne"
                                    angle={-35}
                                    textAnchor="end"
                                    interval={0}
                                    height={65}
                                    tick={{ fontSize: 10 }}
                                />

                                <YAxis
                                    width={52}
                                    allowDecimals={false}
                                    tick={{ fontSize: 10 }}
                                />

                                <Tooltip
                                    formatter={(value) => [
                                        `${Number(value ?? 0)} intervention(s)`,
                                        "NI",
                                    ]}
                                    labelFormatter={(label) =>
                                        String(label ?? "")
                                    }
                                />

                                <Legend wrapperStyle={{ fontSize: 11 }} />

                                <Bar
                                    dataKey="niTotal"
                                    name="Nombre d’interventions (NI)"
                                    fill="#8884d8"
                                    radius={[3, 3, 0, 0]}
                                >
                                    <LabelList
                                        dataKey="niTotal"
                                        content={<CountBarLabel />}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/* -------------------------------------------------------------------------- */
/*                    Tableau indépendant des pannes NI                       */
/* -------------------------------------------------------------------------- */

function TopNiTable({
    data,
    filenameSuffix,
}: {
    data: RapportParetoData;
    filenameSuffix: string;
}): import("react").JSX.Element {
    const topNi = [...data.indisponibilites]
        .filter((item) => item.niTotal > 0)
        .sort((a, b) => b.niTotal - a.niTotal)
        .slice(0, 10);

    return (
        <Card className="min-w-0">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 p-3 pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base">
                        Top 10 des pannes les plus fréquentes [NI]
                    </CardTitle>

                    <CardDescription className="text-xs">
                        Classement des pannes selon le nombre
                        d’interventions enregistrées.
                    </CardDescription>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        exportExcel(
                            "pareto-top-ni-export-table",
                            `Pareto_Top10_NI_${filenameSuffix}`,
                        )
                    }
                >
                    <Download className="mr-2 size-4" />
                    Exporter Top 10 NI
                </Button>
            </CardHeader>

            <CardContent className="p-3 pt-0">
                {topNi.length === 0 ? (
                    <p className="py-5 text-center text-sm text-muted-foreground">
                        Aucune intervention panne enregistrée pour ce mois.
                    </p>
                ) : (
                    <div className="max-h-[450px] overflow-auto rounded-md border">
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead className="min-w-48 px-2 py-1.5 text-xs">
                                        Panne
                                    </TableHead>

                                    <TableHead className="whitespace-nowrap px-2 py-1.5 text-xs">
                                        Occurrences
                                    </TableHead>

                                    <TableHead className="min-w-40 px-2 py-1.5 text-xs">
                                        Engins affectés
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {topNi.map((item) => (
                                    <TableRow key={item.panneId}>
                                        <TableCell className="px-2 py-1">
                                            <PanneName item={item} />
                                        </TableCell>

                                        <TableCell className="px-2 py-1 text-xs font-semibold">
                                            {item.niTotal}
                                        </TableCell>

                                        <TableCell className="px-2 py-1">
                                            <EnginsNiList item={item} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <div
                    aria-hidden="true"
                    className="absolute left-[-10000px] top-0"
                >
                    <table id="pareto-top-ni-export-table">
                        <thead>
                            <tr>
                                <th>Panne</th>
                                <th>Description</th>
                                <th>Nombre d&apos;interventions (NI)</th>
                                <th>Engins affectés</th>
                            </tr>
                        </thead>

                        <tbody>
                            {topNi.map((item) => (
                                <tr key={item.panneId}>
                                    <td>{item.panne}</td>
                                    <td>{item.panneDescription}</td>
                                    <td>{item.niTotal}</td>
                                    <td>
                                        {item.engins_mtbf
                                            .map(
                                                (engin) =>
                                                    `${engin.name}: ${engin.ni} occ.`,
                                            )
                                            .join(" ; ")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

/* -------------------------------------------------------------------------- */
/*                             Évolution du MTBF                              */
/* -------------------------------------------------------------------------- */

function EvolutionMtbf({
    data,
    periode,
}: {
    data: RapportParetoData;
    periode: string;
}): import("react").JSX.Element {
    const mtbfData = data.evolutionMtbf;

    const objectifMtbf =
        mtbfData.find(
            (item) => item.objectif_mtbf !== null,
        )?.objectif_mtbf ?? null;

    return (
        <Card className="h-full min-w-0 gap-2 py-3">
            <CardHeader className="space-y-1 p-2 pb-0.5 text-center">
                <CardTitle className="text-base">
                    Évolution MTBF — {data.parcName} — {periode}
                </CardTitle>

                <CardDescription className="text-xs">
                    MTBF mensuel calculé par HRM/NI, avec l’objectif MTBF
                    de référence.
                </CardDescription>
            </CardHeader>

            <CardContent className="p-2 pt-0.5">
                <div
                    id="pareto-mtbf-chart"
                    className="h-[270px] w-full min-w-0"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart
                            data={mtbfData}
                            margin={{
                                top: 16,
                                right: 12,
                                left: -15,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />

                            <XAxis
                                dataKey="mois"
                                tick={{ fontSize: 10 }}
                            />

                            <YAxis
                                width={55}
                                tick={{ fontSize: 10 }}
                                tickFormatter={(value) => `${value} h`}
                            />

                            <Tooltip
                                formatter={(value, name) => [
                                    value == null
                                        ? "Non calculable"
                                        : `${Number(value).toFixed(2)} h`,
                                    name === "MTBF (h)"
                                        ? "MTBF"
                                        : "Objectif MTBF",
                                ]}
                            />

                            <Legend wrapperStyle={{ fontSize: 11 }} />

                            <Line
                                type="monotone"
                                dataKey="mtbf"
                                name="MTBF (h)"
                                stroke="#8884d8"
                                strokeWidth={2}
                                connectNulls={false}
                                activeDot={{ r: 5 }}
                            >
                                <LabelList
                                    dataKey="mtbf"
                                    content={<MtbfLabel />}
                                />
                            </Line>

                            {objectifMtbf !== null && (
                                <Line
                                    type="monotone"
                                    dataKey="objectif_mtbf"
                                    name="Objectif MTBF"
                                    stroke="#16a34a"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    connectNulls
                                    dot={false}
                                >
                                    <LabelList
                                        dataKey="objectif_mtbf"
                                        content={<ObjectifLabel />}
                                    />
                                </Line>
                            )}
                        </RechartsLineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

/* -------------------------------------------------------------------------- */
/*                            Évolution DISPO                                 */
/* -------------------------------------------------------------------------- */

function EvolutionDispo({
    data,
    periode,
}: {
    data: RapportParetoData;
    periode: string;
}): import("react").JSX.Element {
    const dispoData: ParetoDispoItem[] = data.evolutionDispo;

    const objectifDispo =
        dispoData.find(
            (item) => item.objectif_dispo !== null,
        )?.objectif_dispo ?? null;

    return (
        <Card className="h-full min-w-0 gap-2 py-3">
            <CardHeader className="space-y-1 p-2 pb-0.5 text-center">
                <CardTitle className="text-base">
                    Évolution DISPO — {data.parcName} — {periode}
                </CardTitle>

                <CardDescription className="text-xs">
                    Disponibilité mensuelle calculée par
                    (NHO − HIM) / NHO × 100, avec l’objectif DISPO
                    de référence.
                </CardDescription>
            </CardHeader>

            <CardContent className="p-2 pt-0.5">
                <div
                    id="pareto-dispo-chart"
                    className="h-[270px] w-full min-w-0"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart
                            data={dispoData}
                            margin={{
                                top: 18,
                                right: 12,
                                left: -10,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />

                            <XAxis
                                dataKey="mois"
                                tick={{ fontSize: 10 }}
                            />

                            <YAxis
                                width={55}
                                domain={[0, 100]}
                                tick={{ fontSize: 10 }}
                                tickFormatter={(value) => `${value}%`}
                            />

                            <Tooltip
                                formatter={(value, name) => [
                                    value == null
                                        ? "Non calculable"
                                        : `${Number(value).toFixed(2)}%`,
                                    name === "DISPO (%)"
                                        ? "DISPO"
                                        : "Objectif DISPO",
                                ]}
                            />

                            <Legend wrapperStyle={{ fontSize: 11 }} />

                            <Line
                                type="monotone"
                                dataKey="dispo"
                                name="DISPO (%)"
                                stroke="#8884d8"
                                strokeWidth={2}
                                connectNulls={false}
                                activeDot={{ r: 5 }}
                            >
                                <LabelList
                                    dataKey="dispo"
                                    content={<DispoLabel />}
                                />
                            </Line>

                            {objectifDispo !== null && (
                                <Line
                                    type="monotone"
                                    dataKey="objectif_dispo"
                                    name="Objectif DISPO"
                                    stroke="#16a34a"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    connectNulls
                                    dot={false}
                                />
                            )}
                        </RechartsLineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

/* -------------------------------------------------------------------------- */
/*                              Résultat Pareto                               */
/* -------------------------------------------------------------------------- */

export default function ParetoResult({
    data,
    periode,
}: {
    data: RapportParetoData;
    periode: string;
}): import("react").JSX.Element {
    const filenameSuffix = safeFilename(
        [
            data.parcName,
            data.siteName ?? "Tous_les_sites",
            data.enginName ?? "Tous_les_engins",
            periode.replace("/", "-"),
        ].join("_"),
    );

    const perimetre = [
        data.typeParcName,
        data.parcName,
        data.siteName ?? "Tous les sites",
        data.enginName ?? "",
    ]
        .filter(Boolean)
        .join(" / ");

    return (
        <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
                {perimetre} — {periode}
            </p>

            <Tabs defaultValue="disponibilite" className="w-full min-w-0">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-1">
                    <TabsTrigger
                        value="disponibilite"
                        className="gap-2 text-xs sm:text-sm"
                    >
                        <BarChart3 className="size-4" />
                        Disponibilité
                    </TabsTrigger>

                    <TabsTrigger
                        value="mtbf"
                        className="gap-2 text-xs sm:text-sm"
                    >
                        <LineChart className="size-4" />
                        MTBF
                    </TabsTrigger>
                </TabsList>

                <TabsContent
                    value="disponibilite"
                    className="mt-3 min-w-0 space-y-3"
                >
                    <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
                        <ParetoIndisponibilites
                            data={data}
                            periode={periode}
                        />

                        <EvolutionDispo
                            data={data}
                            periode={periode}
                        />
                    </div>

                    <TopHimTable
                        data={data}
                        filenameSuffix={filenameSuffix}
                    />
                </TabsContent>

                <TabsContent
                    value="mtbf"
                    className="mt-3 min-w-0 space-y-3"
                >
                    <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
                        <ParetoNi
                            data={data}
                            periode={periode}
                        />

                        <EvolutionMtbf
                            data={data}
                            periode={periode}
                        />
                    </div>

                    <TopNiTable
                        data={data}
                        filenameSuffix={filenameSuffix}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
