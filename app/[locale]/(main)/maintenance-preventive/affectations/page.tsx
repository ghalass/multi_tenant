import {
    getAffectationsPlansMaintenance,
    getOptionsAffectationMaintenance,
} from "@/server/maintenance-preventive-affectations";
import type { ReactElement } from "react";

import { AffectationPlanForm } from "./affectation-plan-form";
import { AffectationsTable } from "./affectations-table";

export default async function AffectationsMaintenancePage(): Promise<ReactElement> {
    const [optionsResult, affectationsResult] = await Promise.all([
        getOptionsAffectationMaintenance(),
        getAffectationsPlansMaintenance(),
    ]);

    const options =
        optionsResult.success ? optionsResult.data ?? null : null;

    const affectations =
        affectationsResult.success
            ? affectationsResult.data ?? []
            : [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">
                    Affectations des plans de maintenance
                </h1>
                <p className="text-sm text-muted-foreground">
                    Affecter un plan à un type de parc, un parc, un site
                    ou un engin.
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
                        Les affectations suspendues sont conservées pour
                        préserver leur historique.
                    </p>
                </div>

                {!affectationsResult.success ? (
                    <p className="text-sm text-destructive">
                        {affectationsResult.message}
                    </p>
                ) : (
                    <AffectationsTable affectations={affectations} />
                )}
            </section>
        </div>
    );
}