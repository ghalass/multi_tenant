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

function safeFilename(value: string): string {
    return value
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
        .replace(/\s+/g, "_")
        .slice(0, 100);
}

/**
 * Label de chaque point MTBF.
 * Les valeurs nulles ne sont pas affichées.
 */
function MtbfLabel(props: any) {
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

/**
 * L'objectif étant constant sur l'année, son label est affiché
 * uniquement au dernier point afin d'éviter 12 labels superposés.
 */
function ObjectifLabel(props: any) {
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

function DispoLabel(props: any) {
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

function CountBarLabel(props: any) {
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

function PercentBarLabel(props: any) {
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

/**
 * Nom et description sans icône ni infobulle.
 */
function PanneName({
    item,
}: {
    item: ParetoIndisponibiliteItem;
}) {
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
}) {
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
}) {
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

function ParetoIndisponibilites({
    data,
    periode,
    filenameSuffix,
}: {
    data: RapportParetoData;
    periode: string;
    filenameSuffix: string;
}) {
    const topHim = data.indisponibilites
        .filter((item) => item.himTotal > 0)
        .slice(0, 10);

    return (
        <Card>
            <CardHeader className="space-y-1 p-3 pb-1">
                <CardTitle className="text-base">
                    Pareto des indisponibilités — {data.parcName} — {periode}
                </CardTitle>

                <CardDescription className="text-xs">
                    Top 10 des pannes les plus pénalisantes en heures
                    d’immobilisation (HIM).
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-2 p-3 pt-1">
                {topHim.length === 0 ? (
                    <div className="py-5 text-center text-sm text-muted-foreground">
                        <AlertCircle className="mx-auto mb-2 size-8 opacity-50" />

                        <p>
                            Aucune heure d’immobilisation trouvée pour ce mois.
                        </p>
                    </div>
                ) : (
                    <>
                        <div
                            id="pareto-indispo-chart"
                            className="h-[270px] w-full"
                        >
                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >
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
                                        tickFormatter={(value) =>
                                            `${value}%`
                                        }
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

                                    <Legend
                                        wrapperStyle={{ fontSize: 11 }}
                                    />

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

                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold">
                                    Top 10 des pannes les plus pénalisantes [HIM]
                                </h3>

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
                            </div>

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
                        </div>

                        {/* Table complète utilisée uniquement pour l'export Excel. */}
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
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function EvolutionMtbf({
    data,
    periode,
    filenameSuffix,
}: {
    data: RapportParetoData;
    periode: string;
    filenameSuffix: string;
}) {
    const mtbfData = data.evolutionMtbf;

    const objectifMtbf =
        mtbfData.find(
            (item) => item.objectif_mtbf !== null,
        )?.objectif_mtbf ?? null;

    const topNi = [...data.indisponibilites]
        .filter((item) => item.niTotal > 0)
        .sort((a, b) => b.niTotal - a.niTotal)
        .slice(0, 10);

    return (
        <Card className="gap-2 py-3">
            <CardHeader className="space-y-1 p-2 pb-0.5 text-center">
                <CardTitle className="text-base">
                    Évolution MTBF — {data.parcName} — {periode}
                </CardTitle>

                <CardDescription className="text-xs">
                    MTBF mensuel calculé par HRM/NI, avec l’objectif MTBF
                    de référence.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-1.5 p-2 pt-0.5">
                <div
                    id="pareto-mtbf-chart"
                    className="h-[230px] w-full"
                >
                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                    >
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

                            <Legend
                                wrapperStyle={{ fontSize: 11 }}
                            />

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

                {/* Cartes de synthèse compactes. */}
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                    <Card className="gap-1 py-1.5">
                        <CardHeader className="p-1 pb-0 text-center">
                            <CardTitle className="text-xs font-medium">
                                Engins actifs
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="p-1 pt-0 text-center">
                            <div className="text-base font-semibold leading-5">
                                {data.enginsActifs}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="gap-1 py-1.5">
                        <CardHeader className="p-1 pb-0 text-center">
                            <CardTitle className="text-xs font-medium">
                                MTBF annuel
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="p-1 pt-0 text-center">
                            <div className="text-base font-semibold leading-5">
                                {data.mtbfAnnuel === null
                                    ? "—"
                                    : `${formatNumber(data.mtbfAnnuel)} h`}
                            </div>

                            <p className="mt-0.5 text-[10px] leading-3 text-muted-foreground">
                                HRM : {formatNumber(data.hrmTotalAnnee)} h
                                {" · "}
                                NI : {data.niTotalAnnee}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="gap-1 py-1.5">
                        <CardHeader className="p-1 pb-0 text-center">
                            <CardTitle className="text-xs font-medium">
                                Objectif MTBF
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="p-1 pt-0 text-center">
                            <div className="text-base font-semibold leading-5">
                                {objectifMtbf === null
                                    ? "Non défini"
                                    : `${formatNumber(objectifMtbf)} h`}
                            </div>

                            <p className="mt-0.5 text-[10px] leading-3 text-muted-foreground">
                                {data.enginName
                                    ? `Engin : ${data.enginName}`
                                    : data.siteName
                                        ? `Site : ${data.siteName}`
                                        : "Tous les sites"}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">
                            Top 10 des pannes les plus fréquentes [NI]
                        </h3>

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
                    </div>

                    {topNi.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
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

                    {/* Table complète utilisée uniquement pour l'export Excel. */}
                    <div
                        aria-hidden="true"
                        className="absolute left-[-10000px] top-0"
                    >
                        <table id="pareto-top-ni-export-table">
                            <thead>
                                <tr>
                                    <th>Panne</th>
                                    <th>Description</th>
                                    <th>Nombre d'interventions (NI)</th>
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
                </div>
            </CardContent>
        </Card>
    );
}

function EvolutionDispo({
    data,
    periode,
}: {
    data: RapportParetoData;
    periode: string;
}) {
    const dispoData: ParetoDispoItem[] = data.evolutionDispo;

    const objectifDispo =
        dispoData.find(
            (item) => item.objectif_dispo !== null,
        )?.objectif_dispo ?? null;

    return (
        <Card className="gap-2 py-3">
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

            <CardContent className="space-y-2 p-2 pt-0.5">
                <div
                    id="pareto-dispo-chart"
                    className="h-[260px] w-full"
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

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Card className="gap-1 py-2">
                        <CardHeader className="p-1 pb-0 text-center">
                            <CardTitle className="text-xs font-medium">
                                Engins actifs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-1 pt-0 text-center">
                            <div className="text-base font-semibold">
                                {data.enginsActifs}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="gap-1 py-2">
                        <CardHeader className="p-1 pb-0 text-center">
                            <CardTitle className="text-xs font-medium">
                                HIM annuel
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-1 pt-0 text-center">
                            <div className="text-base font-semibold">
                                {formatNumber(
                                    data.evolutionDispo.reduce(
                                        (total, item) => total,
                                        0,
                                    ),
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="gap-1 py-2">
                        <CardHeader className="p-1 pb-0 text-center">
                            <CardTitle className="text-xs font-medium">
                                Objectif DISPO
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-1 pt-0 text-center">
                            <div className="text-base font-semibold">
                                {objectifDispo === null
                                    ? "Non défini"
                                    : `${formatNumber(objectifDispo)}%`}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                {data.enginName
                                    ? `Engin : ${data.enginName}`
                                    : data.siteName
                                        ? `Site : ${data.siteName}`
                                        : "Tous les sites"}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );
}

export default function ParetoResult({
    data,
    periode,
}: {
    data: RapportParetoData;
    periode: string;
}) {
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

    function ParetoNi({
        data,
        periode,
    }: {
        data: RapportParetoData;
        periode: string;
    }) {
        const topNi = [...data.indisponibilites]
            .filter((item) => item.niTotal > 0)
            .sort((a, b) => b.niTotal - a.niTotal)
            .slice(0, 10);

        return (
            <Card>
                <CardHeader className="space-y-1 p-3 pb-1">
                    <CardTitle className="text-base">
                        Pareto NI — {data.parcName} — {periode}
                    </CardTitle>

                    <CardDescription className="text-xs">
                        Top 10 des pannes classées par nombre d’interventions
                        enregistrées pendant le mois sélectionné.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-2 p-3 pt-1">
                    {topNi.length === 0 ? (
                        <div className="py-5 text-center text-sm text-muted-foreground">
                            <AlertCircle className="mx-auto mb-2 size-8 opacity-50" />
                            Aucune intervention panne enregistrée pour ce mois.
                        </div>
                    ) : (
                        <div
                            id="pareto-ni-chart"
                            className="h-[270px] w-full"
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

                                    <Legend
                                        wrapperStyle={{ fontSize: 11 }}
                                    />

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

    return (
        <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
                {perimetre} — {periode}
            </p>

            <Tabs defaultValue="indispo" className="w-full min-w-0">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-4">
                    <TabsTrigger
                        value="indispo"
                        className="gap-2 text-xs sm:text-sm"
                    >
                        <BarChart3 className="size-4" />
                        Pareto indisponibilités
                    </TabsTrigger>

                    <TabsTrigger
                        value="dispo"
                        className="gap-2 text-xs sm:text-sm"
                    >
                        <LineChart className="size-4" />
                        Évolution DISPO
                    </TabsTrigger>

                    <TabsTrigger
                        value="ni"
                        className="gap-2 text-xs sm:text-sm"
                    >
                        <BarChart3 className="size-4" />
                        Pareto NI
                    </TabsTrigger>

                    <TabsTrigger
                        value="mtbf"
                        className="gap-2 text-xs sm:text-sm"
                    >
                        <LineChart className="size-4" />
                        Évolution MTBF
                    </TabsTrigger>


                </TabsList>

                <TabsContent value="indispo">
                    <ParetoIndisponibilites
                        data={data}
                        periode={periode}
                        filenameSuffix={filenameSuffix}
                    />
                </TabsContent>

                <TabsContent value="ni">
                    <ParetoNi
                        data={data}
                        periode={periode}
                    />
                </TabsContent>

                <TabsContent value="mtbf">
                    <EvolutionMtbf
                        data={data}
                        periode={periode}
                        filenameSuffix={filenameSuffix}
                    />
                </TabsContent>

                <TabsContent value="dispo">
                    <EvolutionDispo
                        data={data}
                        periode={periode}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}