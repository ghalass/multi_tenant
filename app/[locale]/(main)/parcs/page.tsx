
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Truck } from "lucide-react";
import { getAllParcs, getParcTypeOptions, type SearchParamsParcs } from "@/server/parcs";
import { CreateParcForm, UpdateParcForm } from "./parc-form";
import { DeleteParcForm } from "./delete-parc-form";
import Search from "./search";
import Pagination from "@/components/pagination";
import DisplayError from "@/components/display-error";
import CanAccess from "@/components/can-access";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { ExportExcel } from "@/components/export-excel";

export default async function ParcsPage({
    searchParams,
}: {
    searchParams: Promise<SearchParamsParcs>;
}): Promise<import("react").JSX.Element> {
    const filters = await searchParams;
    const [response, typeResponse] = await Promise.all([
        getAllParcs(filters),
        getParcTypeOptions(),
    ]);

    const parcs = response.data || [];
    const typeparcs = typeResponse.data || [];
    const meta = response.meta;

    return (
        <div className="container mx-auto py-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="flex items-center gap-2 text-3xl font-bold">
                    <Truck className="h-8 w-8" />
                    Gestion des parcs
                </h1>

                <div className="flex items-center gap-4">
                    <CanAccess resource={RESOURCE.PARC} action={ACTION.CREATE}>
                        <CreateParcForm typeparcs={typeparcs} />
                    </CanAccess>

                    <CanAccess resource={RESOURCE.PARC} action={ACTION.EXPORT}>
                        <ExportExcel tableName="parcs-table" fileName="Parcs" />
                    </CanAccess>
                </div>
            </div>

            <p className="mt-1 text-muted-foreground">
                Créez et gérez les parcs et leurs types.
            </p>

            {!response.success && (
                <DisplayError className="mt-4" error={response.message} />
            )}

            {typeparcs.length === 0 && (
                <DisplayError
                    className="mt-4"
                    error="Aucun type de parc disponible. Créez d'abord un type de parc."
                />
            )}

            <CanAccess resource={RESOURCE.PARC} action={ACTION.READ}>
                <div className="my-4">
                    <Search />
                </div>

                <div className="rounded-md border">
                    <div id="global-loader-slot" className="relative w-full">
                        <Table id="parcs-table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Parc</TableHead>
                                    <TableHead>Type de parc</TableHead>
                                    <TableHead>Tenant</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {parcs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            Aucun parc trouvé.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    parcs.map((parc) => (
                                        <TableRow key={parc.id}>
                                            <TableCell className="font-medium">
                                                {parc.name}
                                            </TableCell>
                                            <TableCell>
                                                {parc.typeparc?.name || "N/A"}
                                            </TableCell>
                                            <TableCell>
                                                {parc.tenant?.name || "N/A"}
                                            </TableCell>
                                            <TableCell className="flex justify-end gap-4">
                                                <CanAccess
                                                    resource={RESOURCE.PARC}
                                                    action={ACTION.UPDATE}
                                                >
                                                    <UpdateParcForm
                                                        parc={parc}
                                                        typeparcs={typeparcs}
                                                    />
                                                </CanAccess>

                                                <CanAccess
                                                    resource={RESOURCE.PARC}
                                                    action={ACTION.DELETE}
                                                >
                                                    <DeleteParcForm parc={parc} />
                                                </CanAccess>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {meta && (
                    <Pagination
                        totalPages={meta.totalPages}
                        currentPage={meta.currentPage}
                        totalItems={meta.totalItems}
                        itemsPerPage={meta.itemsPerPage}
                    />
                )}
            </CanAccess>
        </div>
    );
}
