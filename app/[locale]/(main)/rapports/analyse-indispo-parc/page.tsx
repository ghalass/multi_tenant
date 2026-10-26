
import { BarChart3 } from "lucide-react";

import CanAccess from "@/components/can-access";
import DisplayError from "@/components/display-error";
import { ExportExcel } from "@/components/export-excel";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";

import {
    getOptionsRapportAnalyseIndispoParc,
    getRapportAnalyseIndispoParc,
} from "@/server/rapports/rapport_analyse-indispo-parc";

import SelectParams from "./select-params";
import AnalyseIndispoParcTable from "./analyse-indispo-parc-table";

type PageProps = {
    searchParams: Promise<{
        [key: string]: string | string[] | undefined;
    }>;
};

export default async function RapportAnalyseIndispoParc({
    searchParams,
}: PageProps) {
    const params = await searchParams;

    const mois =
        typeof params.mois === "string" ? Number(params.mois) : NaN;

    const annee =
        typeof params.annee === "string" ? Number(params.annee) : NaN;

    const hasValidPeriod =
        Number.isInteger(mois) &&
        mois >= 1 &&
        mois <= 12 &&
        Number.isInteger(annee) &&
        annee >= 2000 &&
        annee <= 9999;

    const [optionsResponse, reportResponse] = await Promise.all([
        getOptionsRapportAnalyseIndispoParc(),
        hasValidPeriod
            ? getRapportAnalyseIndispoParc({ mois, annee })
            : Promise.resolve(undefined),
    ]);

    const options = optionsResponse.success
        ? (optionsResponse.data as {
            id: string;
            name: string;
            parcs: {
                id: string;
                name: string;
                nbreEngins: number;
            }[];
        }[])
        : [];

    const rapport = reportResponse?.success
        ? (reportResponse.data as any[])
        : [];

    const periode = hasValidPeriod
        ? `${String(mois).padStart(2, "0")}/${annee}`
        : "";

    return (
        <div className="space-y-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
                        <BarChart3 className="size-7 text-primary" />
                        Analyse d’indisponibilité par parc
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Analyse des pannes, des heures d’immobilisation et des
                        coefficients d’indisponibilité, par mois et en cumul
                        annuel.
                    </p>
                </div>

                <CanAccess
                    resource={RESOURCE.RAPPORT}
                    action={ACTION.EXPORT}
                >
                    <ExportExcel
                        tableName="rapport-analyse-indispo-parc-table"
                        fileName={`Analyse indisponibilite ${periode || "parc"}`}
                    />
                </CanAccess>
            </div>

            <CanAccess
                resource={RESOURCE.RAPPORT}
                action={ACTION.READ}
            >
                {!optionsResponse.success && (
                    <DisplayError
                        className="mt-4"
                        error={optionsResponse.message}
                    />
                )}

                <SelectParams />

                {reportResponse && !reportResponse.success && (
                    <DisplayError
                        className="mt-4"
                        error={reportResponse.message}
                    />
                )}

                {!hasValidPeriod && (
                    <div className="rounded-lg border border-dashed p-8 text-center">
                        <BarChart3 className="mx-auto mb-3 size-8 text-muted-foreground" />

                        <h2 className="font-semibold">
                            Sélectionnez les paramètres du rapport
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Choisissez un mois et une année, puis cliquez sur
                            « Générer le rapport ».
                        </p>
                    </div>
                )}

                {hasValidPeriod && reportResponse?.success && (
                    <AnalyseIndispoParcTable
                        data={rapport}
                        options={options}
                        periode={periode}
                    />
                )}
            </CanAccess>
        </div>
    );
}
