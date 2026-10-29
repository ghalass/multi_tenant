
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

type PanneParcItem = {
    description: string | null;
    parc: Option & {
        typeparcId: string;
    };
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

    const lignes = response.data ?? [];

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
                                <TableHead>Descriptions par parc</TableHead>
                                <TableHead>Type de panne</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>


                        <TableBody>
                            {lignes.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="h-24 text-center"
                                    >
                                        Aucune panne trouvée.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                lignes.map((ligne: any, index: number) => {
                                    const panne = ligne.panne;

                                    // Afficher les actions une seule fois par panne
                                    // sur la page, sans fusionner les cellules.
                                    const afficherActions =
                                        index === 0 ||
                                        lignes[index - 1].panneId !== ligne.panneId;

                                    return (
                                        <TableRow
                                            key={`${ligne.panneId}-${ligne.parcId}`}
                                        >
                                            <TableCell className="font-medium">
                                                {panne.name}
                                            </TableCell>

                                            <TableCell className="min-w-64 max-w-md whitespace-normal">
                                                <p className="font-medium">
                                                    {ligne.parc.name}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {ligne.description || "Aucune description"}
                                                </p>
                                            </TableCell>

                                            <TableCell>
                                                {panne.typepanne?.name ?? "—"}
                                            </TableCell>

                                            <TableCell>
                                                {afficherActions && (
                                                    <div className="flex justify-end gap-2">
                                                        <CanAccess
                                                            resource={RESOURCE.PANNE}
                                                            action={ACTION.UPDATE}
                                                        >
                                                            <PanneForm
                                                                panne={{
                                                                    id: panne.id,
                                                                    name: panne.name,
                                                                    typepanneId: panne.typepanneId,
                                                                    parcs: panne.parcs.map(
                                                                        (item: PanneParcItem) => ({
                                                                            id: item.parc.id,
                                                                            name: item.parc.name,
                                                                            description: item.description,
                                                                        }),
                                                                    ),
                                                                }}
                                                                typepannes={options.typepannes}
                                                                parcs={options.parcs}
                                                            />
                                                        </CanAccess>

                                                        <CanAccess
                                                            resource={RESOURCE.PANNE}
                                                            action={ACTION.DELETE}
                                                        >
                                                            <DeletePanneForm panne={panne} />
                                                        </CanAccess>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
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
