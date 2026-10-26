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

import { AlertCircle, BarChart3, Info, LineChart } from "lucide-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

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

import type {
    ParetoIndisponibiliteItem,
    ParetoMtbfItem,
    RapportParetoData,
} from "@/server/rapports/rapport_pareto";

function formatNumber(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(Number(value))) {
        return "—";
    }

    return new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 2,
    }).format(Number(value));
}

function PercentBarLabel(props: any) {
    const { x, y, width, value } = props;

    if (
        x == null ||
        y == null ||
        width == null ||
        value == null
    ) {
        return null;
    }

    return (
        <text
            x={x + width / 2}
            y={y - 8}
            fill="currentColor"
            textAnchor="middle"
            fontSize={11}
        >
            {Number(value).toFixed(2)}%
        </text>
    );
}

function MtbfLabel(props: any) {
    const { x, y, value } = props;

    if (x == null || y == null || value == null) {
        return null;
    }

    return (
        <text
            x={x}
            y={y - 12}
            fill="#8884d8"
            textAnchor="middle"
            fontSize={10}
        >
            {Number(value).toFixed(0)} h
        </text>
    );
}

function ObjectifLabel(props: any) {
    const { x, y, value } = props;

    if (x == null || y == null || value == null) {
        return null;
    }

    return (
        <text
            x={x}
            y={y - 12}
            fill="#16a34a"
            textAnchor="middle"
            fontSize={10}
        >
            {Number(value).toFixed(0)} h
        </text>
    );
}

function PanneName({
    item,
}: {
    item: ParetoIndisponibiliteItem;
}) {
    const fullName = item.panneDescription
        ? `${item.panne} - ${item.panneDescription}`
        : item.panne;

    return (
        <div
            className="flex items-center gap-2"
            title={fullName}
        >
            <span className="line-clamp-2 break-words font-medium">
                {fullName}
            </span>

            {item.panneDescription && (
                <Info className="size-4 shrink-0 text-muted-foreground" />
            )}
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
        return <span className="text-muted-foreground">—</span>;
    }

    return (
        <div className="space-y-1">
            {engins.map((engin) => (
                <div
                    key={engin.name}
                    className="flex items-center justify-between gap-3 text-sm"
                >
                    <span className="min-w-0 truncate">
                        {engin.name}
                    </span>

                    <span className="shrink-0 font-medium text-muted-foreground">
                        {formatNumber(engin.him)} h
                    </span>
                </div>
            ))}

            {item.engins.length > 3 && (
                <p className="pt-1 text-xs text-muted-foreground">
                    + {item.engins.length - 3} autre(s) engin(s) affecté(s)
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
        return <span className="text-muted-foreground">—</span>;
    }

    return (
        <div className="space-y-1">
            {engins.map((engin) => (
                <div
                    key={engin.name}
                    className="flex items-center justify-between gap-3 text-sm"
                >
                    <span className="min-w-0 truncate">
                        {engin.name}
                    </span>

                    <span className="shrink-0 font-medium text-muted-foreground">
                        {engin.ni} occ.
                    </span>
                </div>
            ))}

            {item.engins_mtbf.length > 3 && (
                <p className="pt-1 text-xs text-muted-foreground">
                    + {item.engins_mtbf.length - 3} autre(s) engin(s)
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
}: {
    data: RapportParetoData;
    periode: string;
}) {
    /*
     * Les pannes avec HIM nul ne sont pas utiles au classement
     * d'indisponibilité, mais restent disponibles dans le tableau NI.
     */
    const topHim = data.indisponibilites
        .filter((item) => item.himTotal > 0)
        .slice(0, 10);

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    Pareto des indisponibilités — {data.parcName} — {periode}
                </CardTitle>

                <CardDescription>
                    Top 10 des pannes les plus pénalisantes en heures
                    d’immobilisation (HIM).
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {topHim.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                        <AlertCircle className="mx-auto mb-3 size-10 opacity-50" />

                        <p className="font-medium">
                            Aucune heure d’immobilisation trouvée pour ce mois.
                        </p>

                        <p className="mt-1 text-sm">
                            Vérifiez les saisies HIM du parc sélectionné.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="h-[340px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={topHim}
                                    margin={{
                                        top: 20,
                                        right: 15,
                                        left: 5,
                                        bottom: 60,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />

                                    <XAxis
                                        dataKey="panne"
                                        angle={-35}
                                        textAnchor="end"
                                        interval={0}
                                        height={85}
                                        tick={{ fontSize: 11 }}
                                    />

                                    <YAxis
                                        tickFormatter={(value) => `${value}%`}
                                    />

                                    <Tooltip
                                        formatter={(value) => [
                                            `${Number(value ?? 0).toFixed(2)}%`,
                                            "Indisponibilité",
                                        ]}
                                        labelFormatter={(label) =>
                                            String(label)
                                        }
                                    />

                                    <Legend />

                                    <Bar
                                        dataKey="indispo"
                                        name="Indisponibilité (%)"
                                        fill="#8884d8"
                                        radius={[4, 4, 0, 0]}
                                    >
                                        <LabelList
                                            dataKey="indispo"
                                            content={<PercentBarLabel />}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div>
                            <h3 className="mb-3 text-center text-lg font-semibold">
                                Top 10 des pannes les plus pénalisantes [HIM]
                            </h3>

                            <div className="max-h-[500px] overflow-auto rounded-md border">
                                <Table>
                                    <TableHeader className="bg-muted">
                                        <TableRow>
                                            <TableHead className="min-w-64">
                                                Panne
                                            </TableHead>

                                            <TableHead className="whitespace-nowrap">
                                                Indisponibilité
                                            </TableHead>

                                            <TableHead className="whitespace-nowrap">
                                                HIM total
                                            </TableHead>

                                            <TableHead className="min-w-52">
                                                Engins affectés
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {topHim.map((item) => (
                                            <TableRow key={item.panneId}>
                                                <TableCell>
                                                    <PanneName item={item} />
                                                </TableCell>

                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={getIndispoBadgeClass(
                                                            item.indispo,
                                                        )}
                                                    >
                                                        {formatNumber(item.indispo)}%
                                                    </Badge>
                                                </TableCell>

                                                <TableCell className="whitespace-nowrap font-medium">
                                                    {formatNumber(item.himTotal)} h
                                                </TableCell>

                                                <TableCell>
                                                    <EnginsHimList item={item} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
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
}: {
    data: RapportParetoData;
    periode: string;
}) {
    const mtbfData: ParetoMtbfItem[] = data.evolutionMtbf;

    const mtbfMoyen =
        mtbfData.length > 0
            ? mtbfData.reduce(
                (total, item) => total + item.mtbf,
                0,
            ) / mtbfData.length
            : null;

    const objectifMtbf = mtbfData.find(
        (item) => item.objectif_mtbf !== null,
    )?.objectif_mtbf ?? null;

    const topNi = [...data.indisponibilites]
        .filter((item) => item.niTotal > 0)
        .sort((a, b) => b.niTotal - a.niTotal)
        .slice(0, 10);

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    Évolution MTBF — {data.parcName} — {periode}
                </CardTitle>

                <CardDescription>
                    Évolution mensuelle du MTBF et comparaison avec
                    l’objectif MTBF du parc.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {data.enginsActifs === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                        <AlertCircle className="mx-auto mb-3 size-10 opacity-50" />

                        <p className="font-medium">
                            Aucun engin actif dans ce parc.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="h-[340px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsLineChart
                                    data={mtbfData}
                                    margin={{
                                        top: 20,
                                        right: 20,
                                        left: 5,
                                        bottom: 5,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />

                                    <XAxis
                                        dataKey="mois"
                                        tick={{ fontSize: 11 }}
                                    />

                                    <YAxis
                                        tickFormatter={(value) => `${value} h`}
                                    />

                                    <Tooltip
                                        formatter={(value, name) => [
                                            `${Number(value ?? 0).toFixed(2)} h`,
                                            name === "mtbf"
                                                ? "MTBF"
                                                : "Objectif MTBF",
                                        ]}
                                    />

                                    <Legend />

                                    <Line
                                        type="monotone"
                                        dataKey="mtbf"
                                        name="MTBF (h)"
                                        stroke="#8884d8"
                                        strokeWidth={2}
                                        activeDot={{ r: 6 }}
                                    >
                                        <LabelList
                                            dataKey="mtbf"
                                            position="top"
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
                                        >
                                            <LabelList
                                                dataKey="objectif_mtbf"
                                                position="top"
                                                content={<ObjectifLabel />}
                                            />
                                        </Line>
                                    )}
                                </RechartsLineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Engins actifs
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {data.enginsActifs}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        MTBF moyen annuel
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {mtbfMoyen === null
                                            ? "—"
                                            : `${formatNumber(mtbfMoyen)} h`}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Objectif MTBF
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {objectifMtbf === null
                                            ? "Non défini"
                                            : `${formatNumber(objectifMtbf)} h`}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}

                <div>
                    <h3 className="mb-3 text-center text-lg font-semibold">
                        Top 10 des pannes les plus fréquentes [NI]
                    </h3>

                    {topNi.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            Aucune intervention panne enregistrée pour ce mois.
                        </p>
                    ) : (
                        <div className="max-h-[500px] overflow-auto rounded-md border">
                            <Table>
                                <TableHeader className="bg-muted">
                                    <TableRow>
                                        <TableHead className="min-w-64">
                                            Panne
                                        </TableHead>

                                        <TableHead className="whitespace-nowrap">
                                            Occurrences
                                        </TableHead>

                                        <TableHead className="min-w-52">
                                            Engins affectés
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {topNi.map((item) => (
                                        <TableRow key={item.panneId}>
                                            <TableCell>
                                                <PanneName item={item} />
                                            </TableCell>

                                            <TableCell className="font-semibold">
                                                {item.niTotal}
                                            </TableCell>

                                            <TableCell>
                                                <EnginsNiList item={item} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
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
    return (
        <div className="space-y-4">
            <div>
                <p className="text-sm text-muted-foreground">
                    {data.typeParcName} / {data.parcName} — {periode}
                </p>
            </div>

            <Tabs defaultValue="indispo" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="indispo" className="gap-2">
                        <BarChart3 className="size-4" />
                        Pareto indisponibilités
                    </TabsTrigger>

                    <TabsTrigger value="mtbf" className="gap-2">
                        <LineChart className="size-4" />
                        Évolution MTBF
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="indispo">
                    <ParetoIndisponibilites
                        data={data}
                        periode={periode}
                    />
                </TabsContent>

                <TabsContent value="mtbf">
                    <EvolutionMtbf
                        data={data}
                        periode={periode}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}