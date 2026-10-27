import type { JSX } from "react";
import { BarChart3, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CanAccess from "@/components/can-access";
import DisplayError from "@/components/display-error";

import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { getBacklogStatsByPeriod } from "@/server/backlogs";

import BacklogStatsCharts from "./backlog-stats-charts";

type SearchParams = Record<string, string | string[] | undefined>;

function firstString(
    value: string | string[] | undefined,
): string | undefined {
    return typeof value === "string" ? value : undefined;
}

export default async function BacklogStatsPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> {
    const params = await searchParams;
    const global = firstString(params.global) === "1";
    const dateFrom = global ? "" : firstString(params.dateFrom) ?? "";
    const dateTo = global ? "" : firstString(params.dateTo) ?? "";
    const canAnalyze = global || Boolean(dateFrom && dateTo);
    const periodResponse = canAnalyze
        ? await getBacklogStatsByPeriod(
            global ? undefined : dateFrom,
            global ? undefined : dateTo,
        )
        : undefined;

    return (
        <CanAccess resource={RESOURCE.BACKLOG} action={ACTION.READ}>
            <div className="container mx-auto space-y-3 py-2">
                <div>
                    <h1 className="flex items-center gap-2 text-3xl font-bold">
                        <BarChart3 className="size-8" />
                        Tableau de bord des backlogs
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        Statistiques des backlogs du tenant courant.
                    </p>
                </div>

                <section className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="size-5 text-muted-foreground" />
                        <h2 className="font-semibold">Période d’analyse</h2>
                    </div>
                    <form
                        method="get"
                        className="flex flex-wrap items-end gap-3"
                    >
                        <label className="grid gap-1 text-sm">
                            <span>Date du</span>
                            <Input
                                className="w-auto"
                                type="date"
                                name="dateFrom"
                                defaultValue={dateFrom}
                                required
                            />
                        </label>
                        <label className="grid gap-1 text-sm">
                            <span>Au</span>
                            <Input
                                className="w-auto"
                                type="date"
                                name="dateTo"
                                defaultValue={dateTo}
                                required
                            />
                        </label>
                        <Button type="submit">Analyser la période</Button>
                        <Button
                            type="submit"
                            name="global"
                            value="1"
                            variant="outline"
                            formNoValidate
                        >
                            Calcul global
                        </Button>
                    </form>
                    {periodResponse && !periodResponse.success ? (
                        <DisplayError error={periodResponse.message} />
                    ) : periodResponse?.success ? (
                        <p className="text-sm text-muted-foreground">
                            {periodResponse.data.global
                                ? "Analyse globale, sans filtre de date."
                                : `Analyse du ${dateFrom} au ${dateTo}.`}
                            {" "}L’évolution est regroupée par{" "}
                            {periodResponse.data.pas === "jour"
                                ? "jour"
                                : "mois"}.
                        </p>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Choisissez les dates de début et de fin, ou lancez un calcul global.
                        </p>
                    )}
                </section>

                {periodResponse?.success && (
                    <BacklogStatsCharts stats={periodResponse.data} />
                )}
            </div>
        </CanAccess>
    );
}