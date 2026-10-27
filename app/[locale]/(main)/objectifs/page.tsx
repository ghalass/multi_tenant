import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Target } from "lucide-react";
import { getAllObjectifs, getObjectifOptions, ObjectifsSearchParams } from "@/server/objectifs";
import { CreateObjectifForm, UpdateObjectifForm } from "./objectif-form";
import { DeleteObjectifForm } from "./delete-objectif-form";
import SearchObjectifs from "./search";
import Pagination from "@/components/pagination";
import DisplayError from "@/components/display-error";
import CanAccess from "@/components/can-access";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { ExportExcel } from "@/components/export-excel";
import type { JSX } from "react";

const metricColumns = [
    { key: "dispo", label: "Disponibilité (%)" },
    { key: "mtbf", label: "MTBF (h)" },
    { key: "tdm", label: "TDM (%)" },
    { key: "spe_huile", label: "Huile" },
    { key: "spe_go", label: "Gasoil" },
    { key: "spe_graisse", label: "Graisse" },
] as const;

const formatMetric = (value: number | null): string =>
    value == null ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);

export default async function ObjectifsPage({
    searchParams,
}: {
    searchParams: Promise<ObjectifsSearchParams>;
}): Promise<JSX.Element> {
    const filters = await searchParams;
    const [response, optionsResponse] = await Promise.all([
        getAllObjectifs(filters),
        getObjectifOptions(),
    ]);

    const objectifs = response.data;
    const options = optionsResponse.success && optionsResponse.data
        ? optionsResponse.data
        : { sites: [], typeparcs: [], parcs: [] };

    return (
        <div className="container mx-auto py-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="flex items-center gap-2 text-3xl font-bold">
                    <Target className="h-8 w-8" />
                    Gestion des objectifs
                </h1>
                <div className="flex items-center gap-4">
                    <CanAccess resource={RESOURCE.OBJECTIF} action={ACTION.CREATE}>
                        <CreateObjectifForm
                            sites={options.sites}
                            typeparcs={options.typeparcs}
                            parcs={options.parcs}
                        />
                    </CanAccess>
                    <CanAccess resource={RESOURCE.OBJECTIF} action={ACTION.EXPORT}>
                        <ExportExcel tableName="objectifs-table" fileName="Objectifs" />
                    </CanAccess>
                </div>
            </div>

            <p className="mt-1 text-muted-foreground">
                Gérez les indicateurs annuels par site et par parc.
            </p>

            {!response.success && <DisplayError className="mt-4" error={response.message} />}
            {!optionsResponse.success && (
                <DisplayError className="mt-4" error={optionsResponse.message} />
            )}
            {optionsResponse.success && (options.sites.length === 0 || options.parcs.length === 0) && (
                <DisplayError className="mt-4" error="Créez d'abord au moins un site et un parc." />
            )}

            <CanAccess resource={RESOURCE.OBJECTIF} action={ACTION.READ}>
                <SearchObjectifs sites={options.sites} parcs={options.parcs} />

                <div className="rounded-md border">
                    <Table id="objectifs-table">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Année</TableHead>
                                <TableHead>Site</TableHead>
                                <TableHead>Parc</TableHead>
                                {metricColumns.map(({ key, label }) => <TableHead key={key}>{label}</TableHead>)}
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {objectifs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-24 text-center">
                                        Aucun objectif trouvé.
                                    </TableCell>
                                </TableRow>
                            ) : objectifs.map((objectif) => (
                                <TableRow key={objectif.id}>
                                    <TableCell className="font-medium">{objectif.annee}</TableCell>
                                    <TableCell>{objectif.site.name}</TableCell>
                                    <TableCell>{objectif.parc.name}</TableCell>
                                    {metricColumns.map(({ key }) => (
                                        <TableCell key={key}>{formatMetric(objectif[key])}</TableCell>
                                    ))}
                                    <TableCell className="flex justify-end gap-4">
                                        <CanAccess resource={RESOURCE.OBJECTIF} action={ACTION.UPDATE}>
                                            <UpdateObjectifForm
                                                objectif={objectif}
                                                sites={options.sites}
                                                typeparcs={options.typeparcs}
                                                parcs={options.parcs}
                                            />
                                        </CanAccess>
                                        <CanAccess resource={RESOURCE.OBJECTIF} action={ACTION.DELETE}>
                                            <DeleteObjectifForm
                                                objectif={{
                                                    id: objectif.id,
                                                    annee: objectif.annee,
                                                    site: objectif.site.name,
                                                    parc: objectif.parc.name,
                                                }}
                                            />
                                        </CanAccess>
                                    </TableCell>
                                </TableRow>
                            ))}
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
