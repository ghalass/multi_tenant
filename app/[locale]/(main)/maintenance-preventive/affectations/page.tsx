import type { ReactElement } from "react";

import {
    getAffectationsPlansMaintenance,
    getOptionsAffectationMaintenance,
    getSuivisCompteursReference,
} from "@/server/maintenance-preventive-affectations";

import { AffectationPlanForm } from "./affectation-plan-form";
import { AffectationsTable } from "./affectations-table";
import { CompteursReferenceTable } from "./compteurs-reference-table";
import { CompteursReferenceFilters } from "./compteurs-reference-filters";

type PageProps = {
    searchParams: Promise<
        Record<string, string | string[] | undefined>
    >;
};

function readParam(
    value: string | string[] | undefined,
): string | undefined {
    const result = Array.isArray(value) ? value[0] : value;
    return result?.trim() || undefined;
}

export default async function AffectationsMaintenancePage({
    searchParams,
}: PageProps): Promise<ReactElement> {
    const params = await searchParams;

    const filters = {
        typeparcId: readParam(params.typeparcId),
        parcId: readParam(params.parcId),
        siteId: readParam(params.siteId),
    };

    // Les résultats ne sont chargés qu'après une demande explicite.
    const showCounterResults =
        readParam(params.afficherCompteurs) === "1" &&
        Boolean(filters.typeparcId);

    const [
        optionsResult,
        affectationsResult,
        suivisResult,
    ] = await Promise.all([
        getOptionsAffectationMaintenance(),
        getAffectationsPlansMaintenance(),
        showCounterResults
            ? getSuivisCompteursReference(filters)
            : Promise.resolve(null),
    ]);

    const options =
        optionsResult.success ? optionsResult.data ?? null : null;

    const affectations =
        affectationsResult.success
            ? affectationsResult.data ?? []
            : [];

    const suivis =
        suivisResult?.success ? suivisResult.data ?? [] : [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">
                    Affectations des plans de maintenance
                </h1>

                <p className="text-sm text-muted-foreground">
                    Gérez les affectations et les compteurs de référence
                    des engins.
                </p>
            </div>

            <section className="space-y-4 rounded-lg border p-4">
                <h2 className="text-lg font-semibold">
                    Nouvelle affectation
                </h2>

                {!options ? (
                    <p className="text-sm text-destructive">
                        {optionsResult.message ||
                            "Impossible de charger les options d'affectation."}
                    </p>
                ) : (
                    <AffectationPlanForm options={options} />
                )}
            </section>

            <section className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">
                        Affectations existantes
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        Les affectations suspendues sont conservées
                        pour préserver leur historique.
                    </p>
                </div>

                {!affectationsResult.success ? (
                    <p className="text-sm text-destructive">
                        {affectationsResult.message}
                    </p>
                ) : (
                    <AffectationsTable
                        affectations={affectations}
                    />
                )}
            </section>

            <section className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">
                        Compteurs de référence
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        Sélectionnez un type de parc, puis affinez
                        éventuellement par parc et par site.
                    </p>
                </div>

                {options ? (
                    <CompteursReferenceFilters
                        key={[
                            filters.typeparcId ?? "",
                            filters.parcId ?? "",
                            filters.siteId ?? "",
                        ].join("|")}
                        options={{
                            typeparcs: options.typeparcs,
                            parcs: options.parcs,
                            sites: options.sites,
                            engins: options.engins,
                        }}
                        initialFilters={filters}
                    />
                ) : (
                    <p className="text-sm text-destructive">
                        Impossible de charger les options de filtrage.
                    </p>
                )}

                {!showCounterResults ? (
                    <p className="text-sm text-muted-foreground">
                        Sélectionnez au minimum un type de parc, puis
                        cliquez sur « Afficher les compteurs ».
                    </p>
                ) : !suivisResult?.success ? (
                    <p className="text-sm text-destructive">
                        {suivisResult?.message ||
                            "Impossible de récupérer les compteurs."}
                    </p>
                ) : (
                    <>
                        <p className="text-sm text-muted-foreground">
                            {suivis.length} suivi(s) trouvé(s).
                        </p>

                        <CompteursReferenceTable suivis={suivis} />
                    </>
                )}
            </section>
        </div>
    );
}