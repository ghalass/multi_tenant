import { HardDrive } from "lucide-react";
import SelectParams from "./select-params";
import CanAccess from "@/components/can-access";
import { RESOURCE } from "@/lib/constantes";
import { ACTION } from "@/lib/enums";
import DisplayError from "@/components/display-error";
import { ExportExcel } from "@/components/export-excel";
import {
    getRapportUnitePhysique,
    searchParamsRapportUnitePhysique,
} from "@/server/rapports/rapport_unite-physique";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import React from "react";
import { getAllSites } from "@/server/sites";

export default async function RapportUnitePhysique({
    searchParams,
}: {
    searchParams: Promise<searchParamsRapportUnitePhysique>;
}) {
    const filters = await searchParams;
    const { data: sites } = await getAllSites();

    let response;
    if (filters?.mois && filters.annee) response = await getRapportUnitePhysique(filters);

    const rapport = response?.data || [];
    const meta = response?.meta;

    // Helper : récupère les stats d'un site, avec fallback zéro
    const getSiteStats = (
        statsObj: Record<string, { hrm: number; him: number; nbre: number }> | undefined,
        siteName: string
    ) => statsObj?.[siteName] ?? { hrm: 0, him: 0, nbre: 0 };

    return (
        <>
            {/* En-tête */}
            <div className="flex flex-col sm:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                        <HardDrive className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                        Rapport Unité Physique des Engins
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Visualisez et analysez les performances quotidiennes des engins
                    </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 items-center">
                    <CanAccess resource={RESOURCE.RAPPORT} action={ACTION.EXPORT}>
                        <ExportExcel tableName="rapport-unite-physique-table" fileName="Rapport Unité Physique" />
                    </CanAccess>
                </div>
            </div>

            {!response?.success && <DisplayError className="mt-4" error={response?.message} />}

            <CanAccess resource={RESOURCE.RAPPORT} action={ACTION.READ}>
                <SelectParams />

                <div id="global-loader-slot" className="relative w-full overflow-x-auto">
                    <Table id="rapport-unite-physique-table" className="text-sm mt-2">
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableCell colSpan={6 + (sites?.length ?? 0) * 2}>
                                    Rapport Unité Physique des Engins
                                </TableCell>
                            </TableRow>

                            <TableRow>
                                <TableCell className="uppercase">Type de Parc</TableCell>
                                <TableCell>NBR</TableCell>

                                <TableCell>HRM_M</TableCell>
                                <TableCell>HIM_M</TableCell>

                                <TableCell>HRM_C</TableCell>
                                <TableCell>HIM_C</TableCell>

                                {sites?.map((site) => (
                                    <React.Fragment key={site.id}>
                                        <TableCell>NBR_{site.name}</TableCell>
                                        <TableCell>HRM_{site.name}</TableCell>
                                    </React.Fragment>
                                ))}
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {rapport.map((row: any, index: number) => (
                                <React.Fragment key={row.typeParcId ?? index}>
                                    {/* Ligne typeParc (totaux) */}
                                    <TableRow className="font-bold uppercase bg-muted/30">
                                        <TableCell>{row.typeParcName}</TableCell>
                                        <TableCell>{row.totalTypeParc?.nbreEngins ?? 0}</TableCell>

                                        <TableCell>{row.totalTypeParc?.aggregatesMois?.totalHRM ?? 0}</TableCell>
                                        <TableCell>{row.totalTypeParc?.aggregatesMois?.totalHIM ?? 0}</TableCell>

                                        <TableCell>{row.totalTypeParc?.aggregatesAnnee?.totalHRM ?? 0}</TableCell>
                                        <TableCell>{row.totalTypeParc?.aggregatesAnnee?.totalHIM ?? 0}</TableCell>

                                        {sites?.map((site) => {
                                            const stats = getSiteStats(row.totalTypeParc?.siteStatsMois, site.name);
                                            return (
                                                <React.Fragment key={site.id}>
                                                    <TableCell>{stats.nbre}</TableCell>
                                                    <TableCell>{stats.hrm}</TableCell>
                                                </React.Fragment>
                                            );
                                        })}
                                    </TableRow>

                                    {/* Lignes parc */}
                                    {row.parcs.map((parc: any) => (
                                        <TableRow key={parc.parcId}>
                                            <TableCell className="pl-6">{parc.parcName}</TableCell>
                                            <TableCell>{parc.nbreEngins ?? 0}</TableCell>

                                            <TableCell>{parc.aggregatesMois?.totalHRM ?? 0}</TableCell>
                                            <TableCell>{parc.aggregatesMois?.totalHIM ?? 0}</TableCell>

                                            <TableCell>{parc.aggregatesAnnee?.totalHRM ?? 0}</TableCell>
                                            <TableCell>{parc.aggregatesAnnee?.totalHIM ?? 0}</TableCell>

                                            {sites?.map((site) => {
                                                const stats = getSiteStats(parc.siteStatsMois, site.name);
                                                return (
                                                    <React.Fragment key={site.id}>
                                                        <TableCell>{stats.nbre}</TableCell>
                                                        <TableCell>{stats.hrm}</TableCell>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CanAccess>

            {/* <DisplayData data={rapport} /> */}
        </>
    );
}