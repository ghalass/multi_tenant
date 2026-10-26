import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Gauge } from "lucide-react";
import {
    getAllSaisieHrm,
    getSaisieHrmOptions,
    type SaisieHrmSearchParams,
} from "@/server/saisie_hrm";
import { SaisieHrmForm } from "./saisie-hrm-form";
import { DeleteSaisieHrmForm } from "./delete-saisie-hrm-form";
import Search from "./search";
import Pagination from "@/components/pagination";
import DisplayError from "@/components/display-error";
import CanAccess from "@/components/can-access";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { ExportExcel } from "@/components/export-excel";

export default async function SaisieHrmPage({
    searchParams,
}: {
    searchParams: Promise<SaisieHrmSearchParams>;
}) {
    const filters = await searchParams;

    const [response, optionsResponse] = await Promise.all([
        getAllSaisieHrm(filters),
        getSaisieHrmOptions(),
    ]);

    const saisies = response.data ?? [];
    const options = optionsResponse.success
        ? optionsResponse.data
        : { engins: [], sites: [] };

    return (
        <div className="container mx-auto py-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="flex items-center gap-2 text-3xl font-bold">
                    <Gauge className="h-8 w-8" />
                    Gestion des saisies HRM
                </h1>

                <div className="flex items-center gap-3">
                    <CanAccess resource={RESOURCE.SAISIE_HRM} action={ACTION.CREATE}>
                        <SaisieHrmForm
                            engins={options.engins}
                            sites={options.sites}
                        />
                    </CanAccess>

                    <CanAccess resource={RESOURCE.SAISIE_HRM} action={ACTION.EXPORT}>
                        <ExportExcel
                            tableName="saisie-hrm-table"
                            fileName="Saisies_HRM"
                        />
                    </CanAccess>
                </div>
            </div>

            <p className="mt-1 text-muted-foreground">
                Gérez les dates, les engins, les sites, les heures de marche et les compteurs.
            </p>

            {!response.success && (
                <DisplayError className="mt-4" error={response.message} />
            )}

            {optionsResponse.success &&
                (options.engins.length === 0 || options.sites.length === 0) && (
                    <DisplayError
                        className="mt-4"
                        error="Créez d'abord au moins un engin actif et un site actif."
                    />
                )}

            <CanAccess resource={RESOURCE.SAISIE_HRM} action={ACTION.READ}>
                <div className="my-4">
                    <Search />
                </div>

                <div className="rounded-md border">
                    <Table id="saisie-hrm-table">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Engin</TableHead>
                                <TableHead>Site</TableHead>
                                <TableHead>HRM</TableHead>
                                <TableHead>Compteur</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {saisies.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Aucune saisie HRM trouvée.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                saisies.map((saisie: any) => (
                                    <TableRow key={saisie.id}>
                                        <TableCell>
                                            {new Date(saisie.du).toLocaleDateString("fr-FR", {
                                                timeZone: "UTC",
                                            })}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {saisie.engin?.name ?? "—"}
                                        </TableCell>
                                        <TableCell>{saisie.site?.name ?? "—"}</TableCell>
                                        <TableCell>{saisie.hrm}</TableCell>
                                        <TableCell>{saisie.compteur ?? "—"}</TableCell>
                                        <TableCell className="flex justify-end gap-3">
                                            <CanAccess
                                                resource={RESOURCE.SAISIE_HRM}
                                                action={ACTION.UPDATE}
                                            >
                                                <SaisieHrmForm
                                                    saisie={{
                                                        id: saisie.id,
                                                        du: new Date(saisie.du)
                                                            .toISOString()
                                                            .slice(0, 10),
                                                        enginId: saisie.enginId,
                                                        siteId: saisie.siteId,
                                                        hrm: saisie.hrm,
                                                        compteur: saisie.compteur,
                                                    }}
                                                    engins={options.engins}
                                                    sites={options.sites}
                                                />
                                            </CanAccess>

                                            <CanAccess
                                                resource={RESOURCE.SAISIE_HRM}
                                                action={ACTION.DELETE}
                                            >
                                                <DeleteSaisieHrmForm
                                                    saisie={{
                                                        id: saisie.id,
                                                        du: new Date(saisie.du)
                                                            .toISOString()
                                                            .slice(0, 10),
                                                        engin: saisie.engin?.name ?? "—",
                                                    }}
                                                />
                                            </CanAccess>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {response.meta && (
                    <Pagination
                        totalPages={response.meta.totalPages}
                        currentPage={response.meta.currentPage}
                        totalItems={response.meta.totalItems}
                        itemsPerPage={response.meta.itemsPerPage}
                    />
                )}
            </CanAccess>
        </div>
    );
}