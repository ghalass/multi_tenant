import { ClipboardList } from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import CanAccess from "@/components/can-access";
import DisplayError from "@/components/display-error";
import Pagination from "@/components/pagination";
import { ExportExcel } from "@/components/export-excel";
import { Badge } from "@/components/ui/badge";

import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";

import {
    getBacklogOptions,
    getBacklogs,
} from "@/server/backlogs";

import type {
    BacklogFilters,
    BacklogOptions,
    BacklogRecord,
} from "@/lib/types/backlog";

import { BacklogForm } from "./backlog-form";
import { DeleteBacklogForm } from "./delete-backlog-form";
import { BacklogDetails } from "./backlog-details";
import BacklogSearch from "./search";

const EMPTY_OPTIONS: BacklogOptions = {
    typeparcs: [],
    parcs: [],
    sites: [],
    engins: [],
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstString(value: string | string[] | undefined): string | undefined {
    return typeof value === "string" ? value : undefined;
}

function formatDate(value?: Date | string | null) {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("fr-FR", {
        timeZone: "UTC",
    });
}

function formatStatus(value: string) {
    return value.replaceAll("_", " ").toLowerCase();
}

function statusClass(status: string) {
    switch (status) {
        case "EXECUTE":
            return "border-green-300 bg-green-500/10 text-green-700 dark:text-green-300";
        case "PROGRAMMEE":
            return "border-purple-300 bg-purple-500/10 text-purple-700 dark:text-purple-300";
        case "PDR_PRET":
            return "border-blue-300 bg-blue-500/10 text-blue-700 dark:text-blue-300";
        case "ATTENTE_PDR":
            return "border-yellow-300 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
        default:
            return "border-muted bg-muted text-muted-foreground";
    }
}

function priorityClass(priority: string) {
    switch (priority) {
        case "ELEVEE":
            return "border-red-300 bg-red-500/10 text-red-700 dark:text-red-300";
        case "MOYENNE":
            return "border-orange-300 bg-orange-500/10 text-orange-700 dark:text-orange-300";
        default:
            return "border-green-300 bg-green-500/10 text-green-700 dark:text-green-300";
    }
}

export default async function BacklogsPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const params = await searchParams;

    const filters: BacklogFilters = {
        search: firstString(params.search),
        statut: firstString(params.statut),
        priorite: firstString(params.priorite),
        source: firstString(params.source),
        siteId: firstString(params.siteId),
        typeparcId: firstString(params.typeparcId),
        parcId: firstString(params.parcId),
        enginId: firstString(params.enginId),
        dateFrom: firstString(params.dateFrom),
        dateTo: firstString(params.dateTo),
        currentPage: firstString(params.currentPage),
        itemsPerPage: firstString(params.itemsPerPage),
    };

    const hasSearched = firstString(params.appliquer) === "1";

    const [optionsResponse, response] = await Promise.all([
        getBacklogOptions(),
        hasSearched ? getBacklogs(filters) : Promise.resolve(null),
    ]);

    const options = optionsResponse.success
        ? optionsResponse.data
        : EMPTY_OPTIONS;

    const backlogs = (response?.data ?? []) as BacklogRecord[];

    return (
        <div className="container mx-auto space-y-4 py-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-3xl font-bold">
                        <ClipboardList className="size-8" />
                        Gestion des backlogs
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Suivez les anomalies, les besoins en PDR et l'avancement des actions.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <CanAccess resource={RESOURCE.BACKLOG} action={ACTION.CREATE}>
                        <BacklogForm
                            typeparcs={options.typeparcs}
                            parcs={options.parcs}
                            sites={options.sites}
                            engins={options.engins}
                        />
                    </CanAccess>

                    {hasSearched && response?.success && (
                        <CanAccess resource={RESOURCE.BACKLOG} action={ACTION.EXPORT}>
                            <ExportExcel
                                tableName="backlogs-table"
                                fileName="Backlogs"
                            />
                        </CanAccess>
                    )}
                </div>
            </div>

            {!optionsResponse.success && (
                <DisplayError
                    className="mt-4"
                    error={optionsResponse.message}
                />
            )}

            <CanAccess resource={RESOURCE.BACKLOG} action={ACTION.READ}>
                <BacklogSearch
                    filters={filters}
                    options={options}
                    totalItems={response?.meta?.totalItems}
                />

                {!hasSearched && (
                    <div className="rounded-md border border-dashed p-8 text-center">
                        <ClipboardList className="mx-auto mb-3 size-8 text-muted-foreground" />
                        <h2 className="font-semibold">Consulter les backlogs</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Appliquez les filtres puis cliquez sur « Rechercher ».
                        </p>
                    </div>
                )}

                {hasSearched && response && !response.success && (
                    <DisplayError
                        className="mt-4"
                        error={response.message}
                    />
                )}

                {hasSearched && response?.success && (
                    <>
                        <div className="rounded-md border">
                            <Table id="backlogs-table">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>N° backlog</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Engin / Site</TableHead>
                                        <TableHead>Date détection</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Priorité</TableHead>
                                        <TableHead>PDR</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {backlogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center">
                                                Aucun backlog trouvé pour ces critères.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        backlogs.map((backlog) => (
                                            <TableRow key={backlog.id}>
                                                <TableCell className="font-medium">
                                                    {backlog.numeroBacklog}
                                                </TableCell>

                                                <TableCell className="max-w-xs">
                                                    <p className="line-clamp-2">
                                                        {backlog.description}
                                                    </p>
                                                </TableCell>

                                                <TableCell>
                                                    <p className="font-medium">
                                                        {backlog.engin?.name ?? "—"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {backlog.site?.name ?? "—"}
                                                    </p>
                                                </TableCell>

                                                <TableCell>
                                                    {formatDate(backlog.dateDetection)}
                                                </TableCell>

                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={statusClass(backlog.statut)}
                                                    >
                                                        {formatStatus(backlog.statut)}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={priorityClass(backlog.priorite)}
                                                    >
                                                        {formatStatus(backlog.priorite)}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex justify-end gap-1">
                                                        <BacklogDetails backlog={backlog} />

                                                        <CanAccess
                                                            resource={RESOURCE.BACKLOG}
                                                            action={ACTION.UPDATE}
                                                        >
                                                            <BacklogForm
                                                                backlog={backlog}
                                                                typeparcs={options.typeparcs}
                                                                parcs={options.parcs}
                                                                sites={options.sites}
                                                                engins={options.engins}
                                                            />
                                                        </CanAccess>

                                                        <CanAccess
                                                            resource={RESOURCE.BACKLOG}
                                                            action={ACTION.DELETE}
                                                        >
                                                            <DeleteBacklogForm
                                                                id={backlog.id}
                                                                numeroBacklog={backlog.numeroBacklog}
                                                            />
                                                        </CanAccess>
                                                    </div>
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
                    </>
                )}
            </CanAccess>
        </div>
    );
}