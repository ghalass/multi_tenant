import { ClipboardList } from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import {
    getAllSaisieHim,
    getSaisieHimOptions,
    type SaisieHimSearchParams,
} from "@/server/saisie_him";

import { SaisieHimForm } from "./saisie-him-form";
import { DeleteSaisieHimForm } from "./delete-saisie-him-form";
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

type EnginOption = Option & {
    siteId: string;
    parcId: string;
    active: boolean;
};

type PanneOption = Option & {
    parcs: Option[];
};

type Options = {
    typeParcs: Option[];
    parcs: ParcOption[];
    engins: EnginOption[];
    sites: Option[];
    pannes: PanneOption[];
};

const EMPTY_OPTIONS: Options = {
    typeParcs: [],
    parcs: [],
    engins: [],
    sites: [],
    pannes: [],
};

export default async function SaisieHimPage({
    searchParams,
}: {
    searchParams: Promise<SaisieHimSearchParams>;
}) {
    const filters = await searchParams;
    const hasSearched = filters.search === "1";

    const [optionsResponse, response] = await Promise.all([
        getSaisieHimOptions(),
        hasSearched
            ? getAllSaisieHim(filters)
            : Promise.resolve(null),
    ]);

    const options: Options = optionsResponse.success
        ? (optionsResponse.data as Options)
        : EMPTY_OPTIONS;

    const saisies: any[] =
        response?.success ? response.data : [];

    return (
        <div className="container mx-auto py-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="flex items-center gap-2 text-3xl font-bold">
                    <ClipboardList className="h-8 w-8" />
                    Gestion des saisies HIM
                </h1>

                <div className="flex flex-wrap items-center gap-3">
                    <CanAccess
                        resource={RESOURCE.SAISIE_HIM}
                        action={ACTION.CREATE}
                    >
                        <SaisieHimForm
                            typeParcs={options.typeParcs}
                            parcs={options.parcs}
                            engins={options.engins}
                            sites={options.sites}
                            pannes={options.pannes}
                        />
                    </CanAccess>

                    {hasSearched && (
                        <CanAccess
                            resource={RESOURCE.SAISIE_HIM}
                            action={ACTION.EXPORT}
                        >
                            <ExportExcel
                                tableName="saisie-him-table"
                                fileName="Saisies_HIM"
                            />
                        </CanAccess>
                    )}
                </div>
            </div>

            <p className="mt-1 text-muted-foreground">
                Consultez et gérez les heures d'immobilisation, le nombre
                d'interventions et les observations des pannes.
            </p>

            {!optionsResponse.success && (
                <DisplayError
                    className="mt-4"
                    error={`${optionsResponse.message} Les listes nécessitent la permission de lecture des saisies HIM.`}
                />
            )}

            <Search
                typeParcs={options.typeParcs}
                parcs={options.parcs}
                engins={options.engins}
                sites={options.sites}
                pannes={options.pannes}
            />

            {!hasSearched && (
                <p className="rounded-md border p-6 text-center text-muted-foreground">
                    Sélectionnez vos filtres, puis cliquez sur « Afficher les saisies HIM ».
                    Aucune saisie n'est chargée au premier affichage.
                </p>
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
                        <Table id="saisie-him-table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Site</TableHead>
                                    <TableHead>Type de parc</TableHead>
                                    <TableHead>Parc</TableHead>
                                    <TableHead>Engin</TableHead>
                                    <TableHead>Panne</TableHead>
                                    <TableHead>HIM</TableHead>
                                    <TableHead>NI</TableHead>
                                    <TableHead>Observation</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {saisies.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={10}
                                            className="h-24 text-center"
                                        >
                                            Aucune saisie HIM trouvée pour ces critères.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    saisies.map((saisie) => {
                                        const hrm = saisie.saisiehrm;
                                        const engin = hrm.engin;
                                        const parc = engin.parc;

                                        const formSaisie = {
                                            id: saisie.id,
                                            du: new Date(hrm.du)
                                                .toISOString()
                                                .slice(0, 10),
                                            siteId: hrm.siteId,
                                            typeparcId: parc.typeparcId,
                                            parcId: parc.id,
                                            enginId: engin.id,
                                            panneId: saisie.panneId,
                                            him: saisie.him,
                                            ni: saisie.ni,
                                            obs: saisie.obs,
                                        };

                                        return (
                                            <TableRow key={saisie.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    {new Date(hrm.du).toLocaleDateString(
                                                        "fr-FR",
                                                        { timeZone: "UTC" },
                                                    )}
                                                </TableCell>

                                                <TableCell>{hrm.site?.name ?? "—"}</TableCell>
                                                <TableCell>{parc.typeparc?.name ?? "—"}</TableCell>
                                                <TableCell>{parc.name ?? "—"}</TableCell>
                                                <TableCell className="font-medium">
                                                    {engin.name ?? "—"}
                                                </TableCell>
                                                <TableCell>{saisie.panne?.name ?? "—"}</TableCell>
                                                <TableCell>{saisie.him}</TableCell>
                                                <TableCell>{saisie.ni}</TableCell>
                                                <TableCell className="max-w-xs whitespace-normal">
                                                    {saisie.obs || "—"}
                                                </TableCell>

                                                <TableCell className="flex justify-end gap-2">
                                                    <CanAccess
                                                        resource={RESOURCE.SAISIE_HIM}
                                                        action={ACTION.UPDATE}
                                                    >
                                                        <SaisieHimForm
                                                            saisie={formSaisie}
                                                            typeParcs={options.typeParcs}
                                                            parcs={options.parcs}
                                                            engins={options.engins}
                                                            sites={options.sites}
                                                            pannes={options.pannes}
                                                        />
                                                    </CanAccess>

                                                    <CanAccess
                                                        resource={RESOURCE.SAISIE_HIM}
                                                        action={ACTION.DELETE}
                                                    >
                                                        <DeleteSaisieHimForm
                                                            saisie={{
                                                                id: saisie.id,
                                                                du: new Date(hrm.du).toLocaleDateString(
                                                                    "fr-FR",
                                                                    { timeZone: "UTC" },
                                                                ),
                                                                engin: engin.name,
                                                                panne: saisie.panne?.name ?? "—",
                                                            }}
                                                        />
                                                    </CanAccess>
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
                </>
            )}
        </div>
    );
}