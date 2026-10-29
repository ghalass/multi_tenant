
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Truck } from "lucide-react";
import {
    getAllEngins,
    getEnginOptions,
    type EnginsSearchParams,
} from "@/server/engins";
import { CreateEnginForm, UpdateEnginForm } from "./engin-form";
import { DeleteEnginForm } from "./delete-engin-form";
import Search from "./search";
import Pagination from "@/components/pagination";
import DisplayError from "@/components/display-error";
import CanAccess from "@/components/can-access";
import { ACTION } from "@/lib/enums";
import { ACTIVE, RESOURCE } from "@/lib/constantes";
import { ExportExcel } from "@/components/export-excel";
import { Badge } from "@/components/ui/badge";

type Option = {
    id: string;
    name: string;
};

type ParcOption = Option & {
    typeparcId: string;
};

export default async function EnginsPage({
    searchParams,
}: {
    searchParams: Promise<EnginsSearchParams>;
}) {
    const filters = await searchParams;

    const [response, optionsResponse] = await Promise.all([
        getAllEngins(filters),
        getEnginOptions(),
    ]);

    const engins = response.data ?? [];

    const options = optionsResponse.success
        ? optionsResponse.data as {
            sites: Option[];
            typeparcs: Option[];
            parcs: ParcOption[];
        }
        : {
            sites: [],
            typeparcs: [],
            parcs: [],
        };

    return (
        <div className="container mx-auto py-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="flex items-center gap-2 text-3xl font-bold">
                    <Truck className="h-8 w-8" />
                    Gestion des engins
                </h1>

                <div className="flex items-center gap-4">
                    <CanAccess
                        resource={RESOURCE.ENGIN}
                        action={ACTION.CREATE}
                    >
                        <CreateEnginForm
                            sites={options.sites}
                            parcs={options.parcs}
                        />
                    </CanAccess>

                    <CanAccess
                        resource={RESOURCE.ENGIN}
                        action={ACTION.EXPORT}
                    >
                        <ExportExcel
                            tableName="engins-table"
                            fileName="Engins"
                        />
                    </CanAccess>
                </div>
            </div>

            <p className="mt-1 text-muted-foreground">
                Gérez les engins, leurs parcs, leurs sites et leurs heures
                châssis initiales.
            </p>

            {!response.success && (
                <DisplayError
                    className="mt-4"
                    error={response.message}
                />
            )}

            {optionsResponse.success &&
                (
                    options.sites.length === 0 ||
                    options.parcs.length === 0
                ) && (
                    <DisplayError
                        className="mt-4"
                        error="Créez d'abord au moins un site actif et un parc."
                    />
                )}

            <CanAccess
                resource={RESOURCE.ENGIN}
                action={ACTION.READ}
            >
                <div className="my-4">
                    <Search
                        sites={options.sites}
                        typeparcs={options.typeparcs}
                        parcs={options.parcs}
                    />
                </div>

                <div className="rounded-md border">
                    <Table id="engins-table">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Engin</TableHead>
                                <TableHead>Parc</TableHead>
                                <TableHead>Site</TableHead>
                                <TableHead>
                                    Heures châssis initiales
                                </TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Tenant</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {engins.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="h-24 text-center"
                                    >
                                        Aucun engin trouvé.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                engins.map((engin: any) => (
                                    <TableRow key={engin.id}>
                                        <TableCell className="font-medium">
                                            {engin.name}
                                        </TableCell>

                                        <TableCell>
                                            {engin.parc?.name ?? "N/A"}
                                        </TableCell>

                                        <TableCell>
                                            {engin.site?.name ?? "N/A"}
                                        </TableCell>

                                        <TableCell>
                                            {engin.initialHeureChassis ?? 0}
                                        </TableCell>

                                        <TableCell>
                                            <Badge
                                                variant={
                                                    engin.active
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {engin.active
                                                    ? ACTIVE.YES
                                                    : ACTIVE.NO}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            {engin.tenant?.name ?? "N/A"}
                                        </TableCell>

                                        <TableCell className="flex justify-end gap-4">
                                            <CanAccess
                                                resource={RESOURCE.ENGIN}
                                                action={ACTION.UPDATE}
                                            >
                                                <UpdateEnginForm
                                                    engin={engin}
                                                    sites={options.sites}
                                                    parcs={options.parcs}
                                                />
                                            </CanAccess>

                                            <CanAccess
                                                resource={RESOURCE.ENGIN}
                                                action={ACTION.DELETE}
                                            >
                                                <DeleteEnginForm
                                                    engin={engin}
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
