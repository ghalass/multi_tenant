import { CalendarDays } from "lucide-react";

import CanAccess from "@/components/can-access";
import DisplayError from "@/components/display-error";
import { ExportExcel } from "@/components/export-excel";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import {
    getOptionsRapportEtatMensuel,
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
        typeof filters.mois === "string" ? Number(filters.mois) : NaN;

    const anneeParam =
        typeof filters.annee === "string" ? Number(filters.annee) : NaN;

    const typeParcId =
        typeof filters.typeParcId === "string" ? filters.typeParcId : "";

    const parcId =
        typeof filters.parcId === "string" ? filters.parcId : "";

    const hasValidPeriod =
        Number.isInteger(moisParam) &&
        moisParam >= 1 &&
        moisParam <= 12 &&
        Number.isInteger(anneeParam) &&
        anneeParam >= 2000 &&
        anneeParam <= 9999;

    const hasValidFilters =
        hasValidPeriod && Boolean(typeParcId) && Boolean(parcId);

    const [optionsResponse, reportResponse] = await Promise.all([
        getOptionsRapportEtatMensuel(),
        hasValidFilters
            ? getRapportEtatMensuel({
                mois: moisParam,
                annee: anneeParam,
                typeParcId,
                parcId,
            })
            : Promise.resolve(undefined),
    ]);

    const typeParcs = optionsResponse.success
        ? (optionsResponse.data as {
            id: string;
            name: string;
            parcs: {
                id: string;
                name: string;
                engins: { id: string; name: string }[];
            }[];
        }[])
        : [];

    const rapport = (reportResponse?.data ?? []) as any[];
    const periode = `${String(moisParam).padStart(2, "0")}/${anneeParam}`;

    return (
        <div className="space-y-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
                        <CalendarDays className="size-7 text-primary" />
                        État mensuel des engins
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Indicateurs du parc et résultats individuels de chaque
                        engin, pour le mois sélectionné et le cumul annuel.
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
                {!optionsResponse.success && (
                    <DisplayError
                        className="mt-4"
                        error={optionsResponse.message}
                    />
                )}

                <SelectParams typeParcs={typeParcs} />

                {reportResponse && !reportResponse.success && (
                    <DisplayError
                        className="mt-4"
                        error={reportResponse.message}
                    />
                )}

                {!hasValidFilters && (
                    <div className="rounded-lg border border-dashed p-8 text-center">
                        <CalendarDays className="mx-auto mb-3 size-8 text-muted-foreground" />

                        <h2 className="font-semibold">
                            Sélectionnez les paramètres du rapport
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Choisissez un mois, une année, un type de parc et
                            un parc, puis cliquez sur « Générer le rapport ».
                        </p>
                    </div>
                )}

                {hasValidFilters && reportResponse?.success && (
                    <div className="space-y-2">
                        <EtatMensuelTable data={rapport} periode={periode} />
                    </div>
                )}
            </CanAccess>
        </div>
    );
}