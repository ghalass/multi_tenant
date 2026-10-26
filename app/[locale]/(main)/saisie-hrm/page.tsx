import Link from "next/link";
import { Gauge, ClipboardPlus } from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

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

type Options = {
    typeparcs: { id: string; name: string }[];
    parcs: { id: string; name: string; typeparcId: string }[];
    engins: {
        id: string;
        name: string;
        parcId: string;
        siteId: string;
    }[];
    sites: { id: string; name: string }[];
};

const EMPTY_OPTIONS: Options = {
    typeparcs: [],
    parcs: [],
    engins: [],
    sites: [],
};

export default async function SaisieHrmPage({
    searchParams,
}: {
    searchParams: Promise<SaisieHrmSearchParams>;
}) {
    const filters = await searchParams;
    const hasSearched = filters.search === "1";

    const [optionsResponse, response] = await Promise.all([
        getSaisieHrmOptions(),
        hasSearched
            ? getAllSaisieHrm(filters)
            : Promise.resolve(null),
    ]);

    const options: Options = optionsResponse.success
        ? (optionsResponse.data as Options)
        : EMPTY_OPTIONS;

    const saisies = response?.data ?? [];

    return (
        <div className="container mx-auto py-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="flex items-center gap-2 text-3xl font-bold">
                    <Gauge className="h-8 w-8" />
                    Consultation des saisies HRM
                </h1>

                <div className="flex flex-wrap items-center gap-3">
                    <Button asChild>
                        <Link href="/saisie-hrm/saisie">
                            <ClipboardPlus className="mr-2 size-4" />
                            Saisie journalière
                        </Link>
                    </Button>

                    {hasSearched && (
                        <CanAccess
                            resource={RESOURCE.SAISIE_HRM}
                            action={ACTION.EXPORT}
                        >
                            <ExportExcel
                                tableName="saisie-hrm-table"
                                fileName="Saisies_HRM"
                            />
                        </CanAccess>
                    )}
                </div>
            </div>

            <p className="mt-1 text-muted-foreground">
                Recherchez les saisies par type de parc, parc, engin et période.
            </p>

            {!optionsResponse.success && (
                <DisplayError
                    className="mt-4"
                    error={optionsResponse.message}
                />
            )}

            {response && !response.success && (
                <DisplayError className="mt-4" error={response.message} />
            )}

            <CanAccess resource={RESOURCE.SAISIE_HRM} action={ACTION.READ}>
                <Search
                    mode="list"
                    typeparcs={options.typeparcs}
                    parcs={options.parcs}
                    engins={options.engins}
                />

                {!hasSearched ? (
                    <p className="rounded-md border p-6 text-center text-muted-foreground">
                        Sélectionnez vos filtres, puis cliquez sur « Afficher les saisies ».
                        Aucune donnée n'est chargée avant cette action.
                    </p>
                ) : (
                    <>
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
                                            <TableCell
                                                colSpan={6}
                                                className="h-24 text-center"
                                            >
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

                                                <TableCell>
                                                    {saisie.site?.name ?? "—"}
                                                </TableCell>

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

                        {response?.meta && (
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