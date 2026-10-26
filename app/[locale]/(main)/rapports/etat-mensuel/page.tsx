
import { CalendarDays } from "lucide-react";

import CanAccess from "@/components/can-access";
import DisplayError from "@/components/display-error";
import { ExportExcel } from "@/components/export-excel";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import {
    getRapportEtatMensuel,
} from "@/server/rapports/rapport_etat-mensuel";

import SelectParams from "./select-params";
import EtatMensuelTable from "./etat-mensuel-table";

type PageProps = {
    searchParams: Promise<{
        [key: string]: string | string[] | undefined;
    }>;
};

export default async function RapportEtatMensuel({
    searchParams,
}: PageProps) {
    const filters = await searchParams;

    const moisParam =
        typeof filters.mois === "string"
            ? Number(filters.mois)
            : NaN;

    const anneeParam =
        typeof filters.annee === "string"
            ? Number(filters.annee)
            : NaN;

    const hasValidPeriod =
        Number.isInteger(moisParam) &&
        moisParam >= 1 &&
        moisParam <= 12 &&
        Number.isInteger(anneeParam) &&
        anneeParam >= 2000 &&
        anneeParam <= 9999;

    let response;

    if (hasValidPeriod) {
        response = await getRapportEtatMensuel({
            mois: moisParam,
            annee: anneeParam,
        });
    }

    const rapport = (response?.data ?? []) as any[];

    return (
        <div className="space-y-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
                        <CalendarDays className="size-7 text-primary" />
                        État Mensuel des Engins
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Analyse des performances par type de parc et par parc,
                        avec comparaison mensuelle et cumul annuel.
                    </p>
                </div>

                <CanAccess
                    resource={RESOURCE.RAPPORT}
                    action={ACTION.EXPORT}
                >
                    <ExportExcel
                        tableName="rapport-etat-mensuel-table"
                        fileName="Rapport Etat Mensuel"
                    />
                </CanAccess>
            </div>

            <CanAccess
                resource={RESOURCE.RAPPORT}
                action={ACTION.READ}
            >
                <SelectParams />

                {response && !response.success && (
                    <DisplayError
                        className="mt-4"
                        error={response.message}
                    />
                )}

                {!hasValidPeriod && (
                    <div className="rounded-lg border border-dashed p-8 text-center">
                        <CalendarDays className="mx-auto mb-3 size-8 text-muted-foreground" />

                        <h2 className="font-semibold">
                            Sélectionnez une période
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Choisissez un mois pour afficher les indicateurs
                            mensuels et le cumul depuis janvier.
                        </p>
                    </div>
                )}

                {hasValidPeriod && response?.success && (
                    <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                            Période :{" "}
                            <span className="font-medium text-foreground">
                                {String(moisParam).padStart(2, "0")}/{anneeParam}
                            </span>
                        </div>

                        <EtatMensuelTable data={rapport} />
                    </div>
                )}
            </CanAccess>
        </div>
    );
}
