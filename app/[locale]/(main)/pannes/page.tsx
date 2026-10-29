
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
    getAllPannes,
    getPanneOptions,
    type PannesSearchParams,
} from "@/server/pannes";
import { PanneForm } from "./panne-form";
import { DeletePanneForm } from "./delete-panne-form";
import Search from "./search";
import Pagination from "@/components/pagination";
import DisplayError from "@/components/display-error";
import CanAccess from "@/components/can-access";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { ExportExcel } from "@/components/export-excel";

type Option = {
    id: string;
    name: string;
};

type ParcOption = Option & {
    typeparcId: string;
};

export default async function PannesPage({
    searchParams,
}: {
    searchParams: Promise<PannesSearchParams>;
}) {
    const filters = await searchParams;

    const [response, optionsResponse] = await Promise.all([
        getAllPannes(filters),
        getPanneOptions(),
    ]);

    const pannes = response.data ?? [];

    const options = optionsResponse.success
        ? optionsResponse.data as {
            typepannes: Option[];
            typeparcs: Option[];
            parcs: ParcOption[];
        }
        : {
            typepannes: [],
            typeparcs: [],
            parcs: [],
        };

    return (
        <div className="container mx-auto py-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="flex items-center gap-2 text-3xl font-bold">
                    <Wrench className="h-8 w-8" />
                    Gestion des pannes
                </h1>

                <div className="flex items-center gap-3">
                    <CanAccess
                        resource={RESOURCE.PANNE}
                        action={ACTION.CREATE}
                    >
                        <PanneForm
                            typepannes={options.typepannes}
                            parcs={options.parcs}
                        />
                    </CanAccess>

                    <CanAccess
                        resource={RESOURCE.PANNE}
                        action={ACTION.EXPORT}
                    >
                        <ExportExcel
                            tableName="pannes-table"
                            fileName="Pannes"
                        />
                    </CanAccess>
                </div>
            </div>

            <p className="mt-1 text-muted-foreground">
                Gérez les pannes, leur type et les parcs concernés.
            </p>

            {!response.success && (
                <DisplayError
                    className="mt-4"
                    error={response.message}
                />
            )}

            <CanAccess
                resource={RESOURCE.PANNE}
                action={ACTION.READ}
            >
                <div className="my-4">
                    <Search
                        typepannes={options.typepannes}
                        typeparcs={options.typeparcs}
                        parcs={options.parcs}
                    />
                </div>

                <div className="rounded-md border">
                    <Table id="pannes-table">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Panne</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Type de panne</TableHead>
                                <TableHead>Parcs</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {pannes.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="h-24 text-center"
                                    >
                                        Aucune panne trouvée.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pannes.map((panne: any) => (
                                    <TableRow key={panne.id}>
                                        <TableCell className="font-medium">
                                            {panne.name}
                                        </TableCell>

                                        <TableCell className="max-w-xs whitespace-normal">
                                            {panne.description || "—"}
                                        </TableCell>

                                        <TableCell>
                                            {panne.typepanne?.name ?? "—"}
                                        </TableCell>

                                        <TableCell className="max-w-xs whitespace-normal">
                                            {panne.parcs
                                                .map((parc: Option) => parc.name)
                                                .join(", ") || "—"}
                                        </TableCell>

                                        <TableCell className="flex justify-end gap-2">
                                            <CanAccess
                                                resource={RESOURCE.PANNE}
                                                action={ACTION.UPDATE}
                                            >
                                                <PanneForm
                                                    panne={panne}
                                                    typepannes={options.typepannes}
                                                    parcs={options.parcs}
                                                />
                                            </CanAccess>

                                            <CanAccess
                                                resource={RESOURCE.PANNE}
                                                action={ACTION.DELETE}
                                            >
                                                <DeletePanneForm
                                                    panne={panne}
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
