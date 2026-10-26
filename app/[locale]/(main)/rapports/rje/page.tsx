import { CalendarCheck } from "lucide-react";

import CanAccess from "@/components/can-access";
import DisplayError from "@/components/display-error";
import { ExportExcel } from "@/components/export-excel";

import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { dateFormater } from "@/lib/utils";

import {
    getOptionsRapportRje,
    getRapportRje,
    type searchParamsRapportRje,
} from "@/server/rapports/rapport_rje";

import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import SelectParams from "./select-params";

type PageProps = {
    searchParams: Promise<{
        [key: string]: string | string[] | undefined;
    }>;
};

export default async function RapportRJE({
    searchParams,
}: PageProps) {
    const params = await searchParams;

    const date =
        typeof params.date === "string" ? params.date : "";

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

    const parsedDate = date
        ? new Date(`${date}T00:00:00.000Z`)
        : null;

    const hasValidDate =
        Boolean(date) &&
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        parsedDate !== null &&
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === date;

    const hasValidFilters =
        hasValidDate &&
        Boolean(typeParcId) &&
        Boolean(parcId);

    const [optionsResponse, reportResponse] = await Promise.all([
        getOptionsRapportRje(),

        hasValidFilters
            ? getRapportRje({
                date,
                typeParcId,
                parcId,
                siteId: siteId || undefined,
            } satisfies searchParamsRapportRje)
            : Promise.resolve(undefined),
    ]);

    const options = optionsResponse.success
        ? optionsResponse.data
        : {
            typeParcs: [],
            sites: [],
        };

    const rje =
        reportResponse?.success
            ? (reportResponse.data ?? []) as any[]
            : [];

    return (
        <div className="space-y-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
                        <CalendarCheck className="size-7 text-primary" />
                        Rapport journalier des engins
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Consultez les indicateurs journaliers, mensuels et annuels
                        des engins du parc sélectionné.
                    </p>
                </div>

                {hasValidFilters && reportResponse?.success && (
                    <CanAccess
                        resource={RESOURCE.RAPPORT}
                        action={ACTION.EXPORT}
                    >
                        <ExportExcel
                            tableName="rapport-rje-table"
                            fileName="Rapport RJE"
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

                <SelectParams
                    typeParcs={options.typeParcs}
                    sites={options.sites}
                />

                {reportResponse && !reportResponse.success && (
                    <DisplayError
                        className="mt-4"
                        error={reportResponse.message}
                    />
                )}

                {!hasValidFilters && (
                    <div className="rounded-lg border border-dashed p-8 text-center">
                        <CalendarCheck className="mx-auto mb-3 size-8 text-muted-foreground" />

                        <h2 className="font-semibold">
                            Sélectionnez les paramètres du rapport
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Choisissez une date, un type de parc et un parc.
                            Le site est facultatif. Cliquez ensuite sur
                            « Générer le rapport ».
                        </p>
                    </div>
                )}

                {hasValidFilters && reportResponse?.success && (
                    <div id="global-loader-slot" className="relative w-full">
                        <Table
                            id="rapport-rje-table"
                            className="mt-2 text-sm"
                        >
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableCell colSpan={23}>
                                        Rapport RJE : {dateFormater(date)}
                                        {" — "}
                                        Type de parc : {rje[0]?.typeParcName ?? "—"}
                                        {" — "}
                                        Parc : {rje[0]?.parcName ?? "—"}
                                        {" — "}
                                        Engins : {rje.length}
                                    </TableCell>
                                </TableRow>

                                <TableRow>
                                    <TableCell>Engins ({rje.length})</TableCell>
                                    <TableCell>Site</TableCell>

                                    <TableCell>DISPO_J</TableCell>
                                    <TableCell>TDM_J</TableCell>
                                    <TableCell>MTBF_J</TableCell>

                                    <TableCell>DISPO_M</TableCell>
                                    <TableCell>TDM_M</TableCell>
                                    <TableCell>MTBF_M</TableCell>

                                    <TableCell>DISPO_A</TableCell>
                                    <TableCell>TDM_A</TableCell>
                                    <TableCell>MTBF_A</TableCell>

                                    <TableCell>NHO_J</TableCell>
                                    <TableCell>HIM_J</TableCell>
                                    <TableCell>HRM_J</TableCell>

                                    <TableCell>NHO_M</TableCell>
                                    <TableCell>HIM_M</TableCell>
                                    <TableCell>HRM_M</TableCell>

                                    <TableCell>NHO_A</TableCell>
                                    <TableCell>HIM_A</TableCell>
                                    <TableCell>HRM_A</TableCell>

                                    <TableCell>NI_J</TableCell>
                                    <TableCell>NI_M</TableCell>
                                    <TableCell>NI_A</TableCell>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {rje.map((row, index) => (
                                    <TableRow key={`${row.engin}-${index}`}>
                                        <TableCell>{row.engin}</TableCell>
                                        <TableCell>{row.siteName}</TableCell>

                                        <TableCell>{row.dispo_j}</TableCell>
                                        <TableCell>{row.tdm_j}</TableCell>
                                        <TableCell>{row.mtbf_j}</TableCell>

                                        <TableCell>{row.dispo_m}</TableCell>
                                        <TableCell>{row.tdm_m}</TableCell>
                                        <TableCell>{row.mtbf_m}</TableCell>

                                        <TableCell>{row.dispo_a}</TableCell>
                                        <TableCell>{row.tdm_a}</TableCell>
                                        <TableCell>{row.mtbf_a}</TableCell>

                                        <TableCell>{row.nho_j}</TableCell>
                                        <TableCell>{row.him_j}</TableCell>
                                        <TableCell>{row.hrm_j}</TableCell>

                                        <TableCell>{row.nho_m}</TableCell>
                                        <TableCell>{row.him_m}</TableCell>
                                        <TableCell>{row.hrm_m}</TableCell>

                                        <TableCell>{row.nho_a}</TableCell>
                                        <TableCell>{row.him_a}</TableCell>
                                        <TableCell>{row.hrm_a}</TableCell>

                                        <TableCell>{row.ni_j}</TableCell>
                                        <TableCell>{row.ni_m}</TableCell>
                                        <TableCell>{row.ni_a}</TableCell>
                                    </TableRow>
                                ))}

                                {rje.length > 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2}>
                                            Objectifs {rje[0]?.annee}
                                        </TableCell>

                                        <TableCell>
                                            {rje[0]?.objectif_dispo ?? "—"}
                                        </TableCell>

                                        <TableCell>
                                            {rje[0]?.objectif_tdm ?? "—"}
                                        </TableCell>

                                        <TableCell>
                                            {rje[0]?.objectif_mtbf ?? "—"}
                                        </TableCell>
                                    </TableRow>
                                )}

                                {rje.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={23}
                                            className="py-8 text-center text-muted-foreground"
                                        >
                                            Aucun engin correspondant aux critères
                                            sélectionnés.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CanAccess>
        </div>
    );
}