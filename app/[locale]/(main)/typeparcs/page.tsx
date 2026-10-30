import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Boxes } from "lucide-react";
import { getAllTypeParcs, searchParams } from "@/server/typeparcs";
import { TypeParcForm } from "./typeparc-form";
import { DeleteTypeParcForm } from "./delete-typeparc-form";
import Search from "./search";
import Pagination from "@/components/pagination";
import DisplayError from "@/components/display-error";
import CanAccess from "@/components/can-access";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { ExportExcel } from "@/components/export-excel";
import type { JSX } from "react";

export default async function TypeParcsPage({
    searchParams,
}: {
    searchParams: Promise<searchParams>;
}): Promise<JSX.Element> {
    const filters = await searchParams;
    const response = await getAllTypeParcs(filters);
    const typeparcs = response?.data || [];
    const meta = response?.meta;

    return (
        <div className="container mx-auto py-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="flex items-center gap-2 text-3xl font-bold">
                    <Boxes className="h-8 w-8" />
                    Gestion des types de parcs
                </h1>

                <div className="flex items-center gap-3">
                    <CanAccess resource={RESOURCE.TYPEPARC} action={ACTION.CREATE}>
                        <TypeParcForm />
                    </CanAccess>

                    <CanAccess resource={RESOURCE.TYPEPARC} action={ACTION.EXPORT}>
                        <ExportExcel
                            tableName="typeparcs-table"
                            fileName="Types_de_parcs"
                        />
                    </CanAccess>
                </div>
            </div>

            <p className="mt-1 text-muted-foreground">
                Créez et gérez les types de parcs de votre tenant.
            </p>

            {!response?.success && (
                <DisplayError className="mt-4" error={response?.message} />
            )}

            <CanAccess resource={RESOURCE.TYPEPARC} action={ACTION.READ}>
                <div className="my-4">
                    <Search />
                </div>

                <div className="rounded-md border">
                    <div id="global-loader-slot" className="relative w-full">
                        <Table id="typeparcs-table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type de parc</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {typeparcs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">
                                            Aucun type de parc trouvé.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    typeparcs.map((typeParc: { id: string; name: string }) => (
                                        <TableRow key={typeParc.id}>
                                            <TableCell className="font-medium">
                                                {typeParc.name}
                                            </TableCell>

                                            <TableCell className="flex justify-end gap-4">
                                                <CanAccess
                                                    resource={RESOURCE.TYPEPARC}
                                                    action={ACTION.UPDATE}
                                                >
                                                    <TypeParcForm typeParc={typeParc} />
                                                </CanAccess>

                                                <CanAccess
                                                    resource={RESOURCE.TYPEPARC}
                                                    action={ACTION.DELETE}
                                                >
                                                    <DeleteTypeParcForm typeParc={typeParc} />
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