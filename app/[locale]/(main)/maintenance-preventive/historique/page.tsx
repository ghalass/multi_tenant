import type { ReactElement } from "react";
import { ClipboardList } from "lucide-react";

import CanAccess from "@/components/can-access";
import DisplayError from "@/components/display-error";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";

import { getOptionsAffectationMaintenance } from "@/server/maintenance-preventive-affectations";
import { getHistoriqueMaintenancesPreventives } from "@/server/maintenance-preventive";

import { HistoriqueFilters } from "./historique-filters";
import { HistoriqueTable } from "./historique-table";
import Link from "next/link";

type PageSearchParams = {
    [key: string]: string | string[] | undefined;
};

function readParam(
    value: string | string[] | undefined,
): string | undefined {
    const result = Array.isArray(value) ? value[0] : value;
    return result?.trim() || undefined;
}

function buildPageHref(
    params: PageSearchParams,
    page: number,
): string {
    const query = new URLSearchParams();

    for (const key of [
        "typeparcId",
        "parcId",
        "enginId",
        "siteId",
        "dateDebut",
        "dateFin",
    ] as const) {
        const value = readParam(params[key]);

        if (value) {
            query.set(key, value);
        }
    }

    query.set("afficherHistorique", "1");
    query.set("page", String(page));

    return `?${query.toString()}`;
}

export default async function HistoriqueMaintenancePage({
    searchParams,
}: {
    searchParams: Promise<PageSearchParams>;
}): Promise<ReactElement> {
    const params = await searchParams;

    const filters = {
        typeparcId: readParam(params.typeparcId),
        parcId: readParam(params.parcId),
        enginId: readParam(params.enginId),
        siteId: readParam(params.siteId),
        dateDebut: readParam(params.dateDebut),
        dateFin: readParam(params.dateFin),
    };

    const pageValue = Number(
        readParam(params.page) ?? "1",
    );

    const requestedPage =
        Number.isSafeInteger(pageValue) && pageValue > 0
            ? pageValue
            : 1;

    const showResults =
        readParam(params.afficherHistorique) === "1" &&
        Boolean(filters.typeparcId);

    const [optionsResult, historiqueResult] = await Promise.all([
        getOptionsAffectationMaintenance(),

        showResults
            ? getHistoriqueMaintenancesPreventives({
                ...filters,
                page: requestedPage,
            })
            : Promise.resolve(undefined),
    ]);

    const options = optionsResult.success
        ? optionsResult.data ?? null
        : null;

    const historique = historiqueResult?.success
        ? historiqueResult.data
        : [];

    const pagination = historiqueResult?.success
        ? historiqueResult.pagination
        : null;

    return (
        <div className="space-y-5">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
                    <ClipboardList className="size-7 text-primary" />
                    Historique des maintenances préventives
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                    Consultez les interventions enregistrées, leurs
                    compteurs réels, leurs dates et leurs commentaires.
                </p>
            </div>

            <CanAccess
                resource={RESOURCE.MAINTENANCE_PREVENTIVE}
                action={ACTION.READ}
            >
                {!optionsResult.success && (
                    <DisplayError
                        className="mt-4"
                        error={optionsResult.message}
                    />
                )}

                {options && (
                    <HistoriqueFilters
                        key={[
                            filters.typeparcId ?? "",
                            filters.parcId ?? "",
                            filters.enginId ?? "",
                            filters.siteId ?? "",
                            filters.dateDebut ?? "",
                            filters.dateFin ?? "",
                        ].join("|")}
                        options={{
                            typeparcs: options.typeparcs,
                            parcs: options.parcs,
                            sites: options.sites,
                            engins: options.engins,
                        }}
                        initialFilters={filters}
                    />
                )}

                {!showResults ? (
                    <div className="rounded-lg border border-dashed p-8 text-center">
                        <ClipboardList className="mx-auto mb-3 size-8 text-muted-foreground" />

                        <h2 className="font-semibold">
                            Sélectionnez les critères de recherche
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Le type de parc est obligatoire. Vous pouvez
                            affiner par parc, site et période avant de
                            cliquer sur « Afficher l&apos;historique ».
                        </p>
                    </div>
                ) : !historiqueResult || !historiqueResult.success ? (
                    <DisplayError
                        className="mt-4"
                        error={
                            historiqueResult?.message ??
                            "Impossible de récupérer l'historique."
                        }
                    />
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            {pagination?.totalItems ?? 0} intervention(s) trouvée(s).
                        </p>

                        <HistoriqueTable data={historique} />

                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm text-muted-foreground">
                                    Page {pagination.page} sur {pagination.totalPages}
                                </p>

                                <nav
                                    aria-label="Pagination de l'historique"
                                    className="flex items-center gap-2"
                                >
                                    {pagination.page > 1 ? (
                                        <Link
                                            href={buildPageHref(
                                                params,
                                                pagination.page - 1,
                                            )}
                                            className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                                        >
                                            Précédent
                                        </Link>
                                    ) : (
                                        <span
                                            aria-disabled="true"
                                            className="inline-flex cursor-not-allowed items-center justify-center rounded-md border px-3 py-2 text-sm text-muted-foreground opacity-50"
                                        >
                                            Précédent
                                        </span>
                                    )}

                                    {pagination.page < pagination.totalPages ? (
                                        <Link
                                            href={buildPageHref(
                                                params,
                                                pagination.page + 1,
                                            )}
                                            className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                                        >
                                            Suivant
                                        </Link>
                                    ) : (
                                        <span
                                            aria-disabled="true"
                                            className="inline-flex cursor-not-allowed items-center justify-center rounded-md border px-3 py-2 text-sm text-muted-foreground opacity-50"
                                        >
                                            Suivant
                                        </span>
                                    )}
                                </nav>
                            </div>
                        )}
                    </div>
                )}
            </CanAccess>
        </div>
    );
}