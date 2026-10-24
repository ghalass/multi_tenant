import { CalendarCheck } from "lucide-react"
import { getRapportRje, searchParamsRapportRje } from "@/server/rapports/rapport_rje"
import { getAllParcs } from "@/server/parcs";
import SelectParams from "./select-params";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import CanAccess from "@/components/can-access";
import { RESOURCE } from "@/lib/constantes";
import { ACTION } from "@/lib/enums";
import DisplayError from "@/components/display-error";
import { ExportExcel } from "@/components/export-excel";
import { dateFormater } from "@/lib/utils";
import { getAllSites } from "@/server/sites";

export default async function RapportRJE({ searchParams }: { searchParams: Promise<searchParamsRapportRje> }) {
    const { data: parcs = [] } = await getAllParcs();
    const { data: sites = [] } = await getAllSites();
    const filters = await searchParams;
    let response
    if (filters?.date && filters.parc) response = await getRapportRje(filters);
    const rje = response?.data || [];
    const meta = response?.meta;
    return (
        <>
            {/* En-tête */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                        <CalendarCheck className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                        Rapport Journalier des Engins
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Visualisez et analysez les performances quotidiennes des engins
                    </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 items-center">
                    <CanAccess resource={RESOURCE.RAPPORT} action={ACTION.EXPORT}>
                        <ExportExcel tableName="rapport-rje-table" fileName="Rapport RJE" />
                    </CanAccess>
                </div>
            </div>

            {!response?.success && <DisplayError className="mt-4" error={response?.message} />}
            <CanAccess resource={RESOURCE.RAPPORT} action={ACTION.READ}>
                <SelectParams parcs={parcs} sites={sites} />

                <div id="global-loader-slot" className="relative w-full">
                    <Table
                        id="rapport-rje-table"
                        className={"text-sm mt-2"}
                    >
                        <TableHeader className="bg-muted/50">
                            <TableRow >
                                <TableCell colSpan={15}>Rapport RJE : {dateFormater(filters?.date)}, Parc {rje[0]?.parcName}, Engins : {rje.length}</TableCell>
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
                                <TableRow key={index}>
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
                            <TableRow >
                                <TableCell colSpan={2}>Objectifs {rje[0]?.annee}</TableCell>
                                <TableCell>{rje[0]?.objectif_dispo}</TableCell>
                                <TableCell>{rje[0]?.objectif_tdm}</TableCell>
                                <TableCell>{rje[0]?.objectif_mtbf}</TableCell>
                            </TableRow>

                        </TableBody>
                    </Table>
                </div>
            </CanAccess>
        </>
    )
}
