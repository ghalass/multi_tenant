import { CalendarDays, HardDrive } from "lucide-react";

import CanAccess from "@/components/can-access";
import DisplayError from "@/components/display-error";
import { ExportExcel } from "@/components/export-excel";

import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";

import {
    getOptionsRapportEtatGeneral,
    getRapportEtatGeneral,
    type TypeParcEtatGeneral,
} from "@/server/rapports/rapport_etat-general";

import SelectParams from "./select-params";
import EtatGeneralTable from "./etat-general-table";

type PageProps = {
    searchParams: Promise<{
        [key: string]: string | string[] | undefined;
    }>;
};

export default async function RapportEtatGeneral({
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
        getOptionsRapportEtatGeneral(),

        hasValidFilters
            ? getRapportEtatGeneral({
                mois: moisParam,
                annee: anneeParam,
                typeParcId,
                parcId,
            })
            : Promise.resolve(undefined),
    ]);

    const typeParcs = optionsResponse.success
        ? (optionsResponse.data ?? [])
        : [];

    const rapport = (
        reportResponse?.success
            ? reportResponse.data ?? []
            : []
    ) as TypeParcEtatGeneral[];

    const periode = hasValidPeriod
        ? `${String(moisParam).padStart(2, "0")}/${anneeParam}`
        : "";

    return (
        <div className="space-y-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
                        <HardDrive className="size-7 text-primary" />
                        État général des engins
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Heures de marche et heures châssis mensuelles,
                        par engin et par parc.
                    </p>
                </div>

                {hasValidFilters &&
                    reportResponse?.success &&
                    rapport.length > 0 && (
                        <CanAccess
                            resource={RESOURCE.RAPPORT}
                            action={ACTION.EXPORT}
                        >
                            <ExportExcel
                                tableName="rapport-etat-general-export-table"
                                fileName="Rapport Etat General"
                            />
                        </CanAccess>
                    )}
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
                            Choisissez le mois, l’année, le type de parc
                            et le parc, puis cliquez sur « Générer le rapport ».
                        </p>
                    </div>
                )}

                {hasValidFilters && reportResponse?.success && (
                    <EtatGeneralTable
                        data={rapport}
                        periode={periode}
                    />
                )}
            </CanAccess>
        </div>
    );
}