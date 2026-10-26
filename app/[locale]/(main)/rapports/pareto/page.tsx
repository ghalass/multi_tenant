import { BarChart3, CalendarDays } from "lucide-react";

import CanAccess from "@/components/can-access";
import DisplayError from "@/components/display-error";

import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";

import {
    getOptionsRapportPareto,
    getRapportPareto,
    type RapportParetoData,
    type TypeParcParetoOption,
} from "@/server/rapports/rapport_pareto";

import SelectParams from "./select-params";
import ParetoResult from "./pareto-result";

type PageProps = {
    searchParams: Promise<{
        [key: string]: string | string[] | undefined;
    }>;
};

export default async function RapportPareto({
    searchParams,
}: PageProps) {
    const params = await searchParams;

    const moisParam =
        typeof params.mois === "string"
            ? Number(params.mois)
            : NaN;

    const anneeParam =
        typeof params.annee === "string"
            ? Number(params.annee)
            : NaN;

    const typeParcId =
        typeof params.typeParcId === "string"
            ? params.typeParcId
            : "";

    const parcId =
        typeof params.parcId === "string"
            ? params.parcId
            : "";

    const siteId =
        typeof params.siteId === "string"
            ? params.siteId
            : "";

    const enginId =
        typeof params.enginId === "string"
            ? params.enginId
            : "";

    const hasValidPeriod =
        Number.isInteger(moisParam) &&
        moisParam >= 1 &&
        moisParam <= 12 &&
        Number.isInteger(anneeParam) &&
        anneeParam >= 2000 &&
        anneeParam <= 9999;

    const hasValidFilters =
        hasValidPeriod &&
        Boolean(typeParcId) &&
        Boolean(parcId);

    const [optionsResponse, reportResponse] = await Promise.all([
        getOptionsRapportPareto(),

        hasValidFilters
            ? getRapportPareto({
                mois: moisParam,
                annee: anneeParam,
                typeParcId,
                parcId,
                siteId: siteId || undefined,
                enginId: enginId || undefined,
            })
            : Promise.resolve(undefined),
    ]);

    const typeParcs = optionsResponse.success
        ? (optionsResponse.data ?? []) as TypeParcParetoOption[]
        : [];

    const rapport = (
        reportResponse?.success
            ? reportResponse.data?.[0]
            : undefined
    ) as RapportParetoData | undefined;

    const periode = hasValidPeriod
        ? `${String(moisParam).padStart(2, "0")}/${anneeParam}`
        : "";

    return (
        <div className="space-y-2">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
                    <BarChart3 className="size-7 text-primary" />
                    Rapport Pareto
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                    Analyse des indisponibilités par panne et évolution du MTBF.
                </p>
            </div>

            <CanAccess
                resource={RESOURCE.RAPPORT}
                action={ACTION.READ}
            >
                {!optionsResponse.success && (
                    <DisplayError
                        className="mt-2"
                        error={optionsResponse.message}
                    />
                )}

                <SelectParams typeParcs={typeParcs} />

                {reportResponse && !reportResponse.success && (
                    <DisplayError
                        className="mt-2"
                        error={reportResponse.message}
                    />
                )}

                {!hasValidFilters && (
                    <div className="rounded-lg border border-dashed p-6 text-center">
                        <CalendarDays className="mx-auto mb-2 size-8 text-muted-foreground" />

                        <h2 className="font-semibold">
                            Sélectionnez les paramètres d’analyse
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Choisissez le mois, l’année, le type de parc et le parc.
                            Le site et l’engin sont facultatifs.
                        </p>
                    </div>
                )}

                {hasValidFilters &&
                    reportResponse?.success &&
                    rapport && (
                        <ParetoResult
                            key={`${parcId}-${siteId}-${enginId}-${anneeParam}-${moisParam}`}
                            data={rapport}
                            periode={periode}
                        />
                    )}
            </CanAccess>
        </div>
    );
}