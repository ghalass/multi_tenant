import type { ReactElement } from "react";
import { CalendarCheck } from "lucide-react";

import CanAccess from "@/components/can-access";
import DisplayError from "@/components/display-error";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";

import { getOptionsAffectationMaintenance } from "@/server/maintenance-preventive-affectations";
import { getEcheancesMaintenancePreventive } from "@/server/maintenance-preventive";

import { EcheancesFilters } from "./echeances-filters";
import { EcheancesTable } from "./echeances-table";

type PageSearchParams = {
    [key: string]: string | string[] | undefined;
};

type StatutEcheance =
    | "REFERENCE_MANQUANTE"
    | "COMPTEUR_INDISPONIBLE"
    | "A_VENIR"
    | "ECHEANCE_PROCHE"
    | "A_ECHEANCE"
    | "EN_RETARD";

const STATUTS_VALIDES: StatutEcheance[] = [
    "REFERENCE_MANQUANTE",
    "COMPTEUR_INDISPONIBLE",
    "A_VENIR",
    "ECHEANCE_PROCHE",
    "A_ECHEANCE",
    "EN_RETARD",
];

function readParam(
    value: string | string[] | undefined,
): string | undefined {
    const result = Array.isArray(value) ? value[0] : value;
    return result?.trim() || undefined;
}

function isStatutEcheance(
    value: string | undefined,
): value is StatutEcheance {
    return (
        value !== undefined &&
        STATUTS_VALIDES.includes(value as StatutEcheance)
    );
}

export default async function EcheancesMaintenancePage({
    searchParams,
}: {
    searchParams: Promise<PageSearchParams>;
}): Promise<ReactElement> {
    const params = await searchParams;

    const typeparcId = readParam(params.typeparcId);
    const parcId = readParam(params.parcId);
    const siteId = readParam(params.siteId);
    const statutParam = readParam(params.statut);

    const statut = isStatutEcheance(statutParam)
        ? statutParam
        : undefined;

    const showResults =
        readParam(params.afficherEcheances) === "1" &&
        Boolean(typeparcId);

    const [optionsResult, echeancesResult] = await Promise.all([
        getOptionsAffectationMaintenance(),

        showResults
            ? getEcheancesMaintenancePreventive({
                typeparcId,
                ...(parcId ? { parcId } : {}),
                ...(siteId ? { siteId } : {}),
            })
            : Promise.resolve(undefined),
    ]);

    const options =
        optionsResult.success
            ? optionsResult.data ?? null
            : null;

    const toutesEcheances =
        echeancesResult?.success
            ? echeancesResult.data
            : [];

    const echeances = statut
        ? toutesEcheances.filter((item) => item.statut === statut)
        : toutesEcheances;

    return (
        <div className="space-y-5">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
                    <CalendarCheck className="size-7 text-primary" />
                    Échéances de maintenance préventive
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                    Suivez les prochaines maintenances, les échéances
                    proches et les retards calculés à partir des compteurs.
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

                {options ? (
                    <EcheancesFilters
                        key={[
                            typeparcId ?? "",
                            parcId ?? "",
                            siteId ?? "",
                            statut ?? "",
                        ].join("|")}
                        options={{
                            typeparcs: options.typeparcs,
                            parcs: options.parcs,
                            sites: options.sites,
                            engins: options.engins,
                        }}
                        initialFilters={{
                            typeparcId,
                            parcId,
                            siteId,
                            statut,
                        }}
                    />
                ) : null}

                {!showResults ? (
                    <div className="rounded-lg border border-dashed p-8 text-center">
                        <CalendarCheck className="mx-auto mb-3 size-8 text-muted-foreground" />

                        <h2 className="font-semibold">
                            Sélectionnez les paramètres
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Choisissez un type de parc, affinez
                            éventuellement par parc, site et statut,
                            puis cliquez sur « Afficher les échéances ».
                        </p>
                    </div>
                ) : !echeancesResult || !echeancesResult.success ? (
                    <DisplayError
                        className="mt-4"
                        error={
                            echeancesResult?.message ??
                            "Impossible de charger les échéances."
                        }
                    />
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            {echeances.length} échéance(s) affichée(s).
                        </p>

                        <EcheancesTable data={echeances} />
                    </div>
                )}
            </CanAccess>
        </div>
    );
}