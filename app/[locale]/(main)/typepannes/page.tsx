import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Wrench } from "lucide-react";
import {
    getAllTypePannes,
    type TypePannesSearchParams,
} from "@/server/typepannes";
import { TypePanneForm } from "./typepanne-form";
import { DeleteTypePanneForm } from "./delete-typepanne-form";
import Search from "./search";
import Pagination from "@/components/pagination";
import DisplayError from "@/components/display-error";
import CanAccess from "@/components/can-access";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { ExportExcel } from "@/components/export-excel";
import type { JSX } from "react";

export default async function TypePannesPage({
    searchParams,
}: {
    searchParams: Promise<TypePannesSearchParams>;
}): Promise<JSX.Element> {
    const filters = await searchParams;
    const response = await getAllTypePannes(filters);
    const typepannes = response.data ?? [];
    const meta = response.meta;

    return (
        <div className="container mx-auto py-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="flex items-center gap-2 text-3xl font-bold">
                    <Wrench className="h-8 w-8" />
                    Gestion des types de pannes
                </h1>

                <div className="flex items-center gap-3">
                    <CanAccess resource={RESOURCE.TYPEPANNE} action={ACTION.CREATE}>
                        <TypePanneForm />
                    </CanAccess>

                    <CanAccess resource={RESOURCE.TYPEPANNE} action={ACTION.EXPORT}>
                        <ExportExcel
                            tableName="typepannes-table"
                            fileName="Types_de_pannes"
                        />
                    </CanAccess>
                </div>
            </div>

            <p className="mt-1 text-muted-foreground">
                Créez et gérez les types de pannes de votre tenant.
            </p>

            {!response.success && (
                <DisplayError className="mt-4" error={response.message} />
            )}

            <CanAccess resource={RESOURCE.TYPEPANNE} action={ACTION.READ}>
                <div className="my-4">
                    <Search />
                </div>

                <div className="rounded-md border">
                    <Table id="typepannes-table">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type de panne</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Tenant</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {typepannes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        Aucun type de panne trouvé.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                typepannes.map((typepanne) => (
                                    <TableRow key={typepanne.id}>
                                        <TableCell className="font-medium">
                                            {typepanne.name}
                                        </TableCell>
                                        <TableCell className="max-w-xs whitespace-normal">
                                            {typepanne.description || "—"}
                                        </TableCell>
                                        <TableCell>{typepanne.tenant?.name ?? "—"}</TableCell>
                                        <TableCell className="flex justify-end gap-2">
                                            <CanAccess
                                                resource={RESOURCE.TYPEPANNE}
                                                action={ACTION.UPDATE}
                                            >
                                                <TypePanneForm typePanne={typepanne} />
                                            </CanAccess>
                                            <CanAccess
                                                resource={RESOURCE.TYPEPANNE}
                                                action={ACTION.DELETE}
                                            >
                                                <DeleteTypePanneForm typePanne={typepanne} />
                                            </CanAccess>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
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