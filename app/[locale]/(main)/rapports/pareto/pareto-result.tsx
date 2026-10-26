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
    Image,
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
import { toast } from "sonner";

import type {
    ParetoIndisponibiliteItem,
    ParetoMtbfItem,
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

/**
 * Rend un nom compatible avec un nom de fichier Windows.
 */
function safeFilename(value: string): string {
    return value
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
        .replace(/\s+/g, "_")
        .slice(0, 100);
}

/**
 * Exporte un graphique Recharts en image PNG, sans dépendance
 * supplémentaire. Le SVG est converti en image puis dessiné
 * sur un canvas à une résolution 2x.
 */
async function downloadChartAsPng(
    chartContainerId: string,
    filename: string,
): Promise<void> {
    let svgUrl: string | undefined;

    try {
        const container = document.getElementById(chartContainerId);
        const sourceSvg = container?.querySelector("svg");

        if (!sourceSvg) {
            toast.error("Le graphique n'est pas disponible pour l'export.");
            return;
        }

        const rect = sourceSvg.getBoundingClientRect();

        const width = Math.max(
            1,
            Math.round(
                rect.width ||
                Number(sourceSvg.getAttribute("width")) ||
                1000,
            ),
        );

        const height = Math.max(
            1,
            Math.round(
                rect.height ||
                Number(sourceSvg.getAttribute("height")) ||
                500,
            ),
        );

        const clonedSvg = sourceSvg.cloneNode(true) as SVGSVGElement;

        clonedSvg.setAttribute(
            "xmlns",
            "http://www.w3.org/2000/svg",
        );

        clonedSvg.setAttribute(
            "width",
            String(width * 2),
        );

        clonedSvg.setAttribute(
            "height",
            String(height * 2),
        );

        if (!clonedSvg.getAttribute("viewBox")) {
            clonedSvg.setAttribute(
                "viewBox",
                `0 0 ${width} ${height}`,
            );
        }

        /*
         * Intègre les styles SVG calculés dans le fichier exporté.
         * Cela conserve notamment les polices, couleurs et traits.
         */
        const originalElements: SVGElement[] = [
            sourceSvg,
            ...Array.from(
                sourceSvg.querySelectorAll<SVGElement>("*"),
            ),
        ];

        const clonedElements: SVGElement[] = [
            clonedSvg,
            ...Array.from(
                clonedSvg.querySelectorAll<SVGElement>("*"),
            ),
        ];

        const styleProperties = [
            "font-family",
            "font-size",
            "font-weight",
            "font-style",
            "fill",
            "stroke",
            "stroke-width",
            "stroke-dasharray",
            "opacity",
            "text-anchor",
            "dominant-baseline",
            "color",
        ];

        originalElements.forEach((originalElement, index) => {
            const clonedElement = clonedElements[index];

            if (!clonedElement) return;

            const computed = window.getComputedStyle(
                originalElement,
            );

            for (const property of styleProperties) {
                const value = computed.getPropertyValue(property);

                if (value) {
                    clonedElement.style.setProperty(
                        property,
                        value,
                    );
                }
            }
        });

        const svgBlob = new Blob(
            [new XMLSerializer().serializeToString(clonedSvg)],
            {
                type: "image/svg+xml;charset=utf-8",
            },
        );

        svgUrl = URL.createObjectURL(svgBlob);

        const image = new window.Image();

        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () =>
                reject(
                    new Error(
                        "Impossible de convertir le graphique en image.",
                    ),
                );

            image.src = svgUrl!;
        });

        const scale = 2;
        const canvas = document.createElement("canvas");

        canvas.width = width * scale;
        canvas.height = height * scale;

        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error(
                "Impossible de préparer l'image du graphique.",
            );
        }

        // Fond blanc pour éviter une image PNG transparente.
        context.fillStyle = "#ffffff";
        context.fillRect(
            0,
            0,
            canvas.width,
            canvas.height,
        );

        context.drawImage(
            image,
            0,
            0,
            canvas.width,
            canvas.height,
        );

        const pngBlob = await new Promise<Blob>(
            (resolve, reject) => {
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(
                                new Error(
                                    "La création du fichier PNG a échoué.",
                                ),
                            );
                        }
                    },
                    "image/png",
                );
            },
        );

        const pngUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement("a");

        link.href = pngUrl;
        link.download = `${filename}.png`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        window.setTimeout(() => {
            URL.revokeObjectURL(pngUrl);
        }, 1000);

        toast.success("Le graphique a été enregistré en PNG.");
    } catch (error) {
        console.error("Erreur export PNG :", error);

        toast.error(
            error instanceof Error
                ? error.message
                : "Impossible d'enregistrer le graphique.",
        );
    } finally {
        if (svgUrl) {
            URL.revokeObjectURL(svgUrl);
        }
    }
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
            y={y - 5}
            fill="#666"
            textAnchor="middle"
            fontSize={10}
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
            y={y - 9}
            fill="#8884d8"
            textAnchor="middle"
            fontSize={9}
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
            y={y + 13}
            fill="#16a34a"
            textAnchor="middle"
            fontSize={9}
        >
            {Number(value).toFixed(0)} h
        </text>
    );
}

/**
 * Nom + description en texte simple :
 * aucun pictogramme ni infobulle.
 */
function PanneName({
    item,
}: {
    item: ParetoIndisponibiliteItem;
}) {
    return (
        <div className="line-clamp-2 max-w-[320px] break-words text-xs leading-4">
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

    const exportTitle = `Pareto_Top10_HIM_${filenameSuffix}`;

    return (
        <Card>
            <CardHeader className="space-y-1 p-4 pb-2">
                <CardTitle className="text-base">
                    Pareto des indisponibilités — {data.parcName} — {periode}
                </CardTitle>

                <CardDescription className="text-xs">
                    Top 10 des pannes les plus pénalisantes en heures
                    d’immobilisation (HIM).
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-4 pt-2">
                {topHim.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        <AlertCircle className="mx-auto mb-2 size-8 opacity-50" />

                        <p>
                            Aucune heure d’immobilisation trouvée pour ce mois.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    exportExcel(
                                        "pareto-top-him-export-table",
                                        exportTitle,
                                    )
                                }
                            >
                                <Download className="mr-2 size-4" />
                                Exporter Top 10 HIM
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    void downloadChartAsPng(
                                        "pareto-indispo-chart",
                                        `Pareto_Indisponibilites_${filenameSuffix}`,
                                    )
                                }
                            >
                                <Image className="mr-2 size-4" />
                                Enregistrer le graphique
                            </Button>
                        </div>

                        <div
                            id="pareto-indispo-chart"
                            className="h-[290px] w-full"
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
                            <h3 className="text-sm font-semibold">
                                Top 10 des pannes les plus pénalisantes [HIM]
                            </h3>

                            <div className="max-h-[450px] overflow-auto rounded-md border">
                                <Table>
                                    <TableHeader className="bg-muted">
                                        <TableRow>
                                            <TableHead className="min-w-48 px-2 py-2 text-xs">
                                                Panne
                                            </TableHead>

                                            <TableHead className="whitespace-nowrap px-2 py-2 text-xs">
                                                Indispo.
                                            </TableHead>

                                            <TableHead className="whitespace-nowrap px-2 py-2 text-xs">
                                                HIM
                                            </TableHead>

                                            <TableHead className="min-w-40 px-2 py-2 text-xs">
                                                Engins affectés
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {topHim.map((item) => (
                                            <TableRow key={item.panneId}>
                                                <TableCell className="px-2 py-1.5">
                                                    <PanneName item={item} />
                                                </TableCell>

                                                <TableCell className="whitespace-nowrap px-2 py-1.5">
                                                    <Badge
                                                        variant="outline"
                                                        className={`px-1.5 py-0 text-[11px] ${getIndispoBadgeClass(item.indispo)}`}
                                                    >
                                                        {formatNumber(item.indispo)}%
                                                    </Badge>
                                                </TableCell>

                                                <TableCell className="whitespace-nowrap px-2 py-1.5 text-xs font-medium">
                                                    {formatNumber(item.himTotal)} h
                                                </TableCell>

                                                <TableCell className="px-2 py-1.5">
                                                    <EnginsHimList item={item} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/*
                         * Tableau séparé pour Excel. Il reste dans le DOM
                         * hors écran, sans display:none, afin que innerText
                         * soit disponible pour lib/xlsxFn.ts.
                         */}
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
    const mtbfData: ParetoMtbfItem[] = data.evolutionMtbf;

    const objectifMtbf =
        mtbfData.find(
            (item) => item.objectif_mtbf !== null,
        )?.objectif_mtbf ?? null;

    /*
     * Le Top 10 NI est classé d'après la somme des NI du mois
     * sélectionné, indépendamment du classement HIM.
     */
    const topNi = [...data.indisponibilites]
        .filter((item) => item.niTotal > 0)
        .sort((a, b) => b.niTotal - a.niTotal)
        .slice(0, 10);

    const exportTitle = `Pareto_Top10_NI_${filenameSuffix}`;

    return (
        <Card>
            <CardHeader className="space-y-1 p-4 pb-2">
                <CardTitle className="text-base">
                    Évolution MTBF — {data.parcName} — {periode}
                </CardTitle>

                <CardDescription className="text-xs">
                    MTBF mensuel calculé par HRM/NI, avec l’objectif MTBF
                    de référence.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-4 pt-2">
                <div className="flex flex-wrap justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            void downloadChartAsPng(
                                "pareto-mtbf-chart",
                                `Evolution_MTBF_${filenameSuffix}`,
                            )
                        }
                    >
                        <Image className="mr-2 size-4" />
                        Enregistrer le graphique
                    </Button>
                </div>

                <div
                    id="pareto-mtbf-chart"
                    className="h-[290px] w-full"
                >
                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                    >
                        <RechartsLineChart
                            data={mtbfData}
                            margin={{
                                top: 18,
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
                                    name === "mtbf"
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
                                    dot={false}
                                >
                                    <LabelList
                                        dataKey="objectif_mtbf"
                                        position="bottom"
                                        content={<ObjectifLabel />}
                                    />
                                </Line>
                            )}
                        </RechartsLineChart>
                    </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Card>
                        <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-xs font-medium">
                                Engins actifs
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="p-3 pt-0">
                            <div className="text-xl font-semibold">
                                {data.enginsActifs}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-xs font-medium">
                                MTBF annuel
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="p-3 pt-0">
                            <div className="text-xl font-semibold">
                                {data.mtbfAnnuel === null
                                    ? "—"
                                    : `${formatNumber(data.mtbfAnnuel)} h`}
                            </div>

                            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                                HRM : {formatNumber(data.hrmTotalAnnee)} h
                                {" / "}
                                NI : {data.niTotalAnnee}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-xs font-medium">
                                Objectif MTBF
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="p-3 pt-0">
                            <div className="text-xl font-semibold">
                                {objectifMtbf === null
                                    ? "Non défini"
                                    : `${formatNumber(objectifMtbf)} h`}
                            </div>

                            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                                {data.siteName
                                    ? `Objectif du site ${data.siteName}`
                                    : "Moyenne des objectifs des sites concernés"}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-2">
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
                                    exportTitle,
                                )
                            }
                        >
                            <Download className="mr-2 size-4" />
                            Exporter Top 10 NI
                        </Button>
                    </div>

                    {topNi.length === 0 ? (
                        <p className="py-5 text-center text-sm text-muted-foreground">
                            Aucune intervention panne enregistrée pour ce mois.
                        </p>
                    ) : (
                        <div className="max-h-[450px] overflow-auto rounded-md border">
                            <Table>
                                <TableHeader className="bg-muted">
                                    <TableRow>
                                        <TableHead className="min-w-48 px-2 py-2 text-xs">
                                            Panne
                                        </TableHead>

                                        <TableHead className="whitespace-nowrap px-2 py-2 text-xs">
                                            Occurrences
                                        </TableHead>

                                        <TableHead className="min-w-40 px-2 py-2 text-xs">
                                            Engins affectés
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {topNi.map((item) => (
                                        <TableRow key={item.panneId}>
                                            <TableCell className="px-2 py-1.5">
                                                <PanneName item={item} />
                                            </TableCell>

                                            <TableCell className="px-2 py-1.5 text-xs font-semibold">
                                                {item.niTotal}
                                            </TableCell>

                                            <TableCell className="px-2 py-1.5">
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
            periode.replace("/", "-"),
        ].join("_"),
    );

    const titrePerimetre = data.siteName
        ? `${data.typeParcName} / ${data.parcName} / ${data.siteName}`
        : `${data.typeParcName} / ${data.parcName} / Tous les sites`;

    return (
        <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
                {titrePerimetre} — {periode}
            </p>

            <Tabs defaultValue="indispo" className="space-y-3">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                        value="indispo"
                        className="gap-2 text-xs sm:text-sm"
                    >
                        <BarChart3 className="size-4" />
                        Pareto indisponibilités
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

                <TabsContent value="mtbf">
                    <EvolutionMtbf
                        data={data}
                        periode={periode}
                        filenameSuffix={filenameSuffix}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}