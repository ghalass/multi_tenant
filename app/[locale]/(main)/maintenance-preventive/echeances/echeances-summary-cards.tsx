"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactElement } from "react";

type StatutEcheance =
    | "REFERENCE_MANQUANTE"
    | "COMPTEUR_INDISPONIBLE"
    | "A_VENIR"
    | "ECHEANCE_PROCHE"
    | "A_ECHEANCE"
    | "EN_RETARD";

type StatutCounts = Record<StatutEcheance, number>;

type Filters = {
    typeparcId: string;
    parcId?: string;
    siteId?: string;
    enginId?: string;
    statut?: StatutEcheance;
};

type Props = {
    counts: StatutCounts;
    filters: Filters;
};

const STATUS_CARDS: {
    value: StatutEcheance;
    label: string;
    description: string;
}[] = [
        {
            value: "EN_RETARD",
            label: "En retard",
            description: "Maintenance à traiter en priorité",
        },
        {
            value: "A_ECHEANCE",
            label: "À échéance",
            description: "Maintenance arrivée à échéance",
        },
        {
            value: "ECHEANCE_PROCHE",
            label: "Échéance proche",
            description: "Maintenance à anticiper",
        },
        {
            value: "A_VENIR",
            label: "À venir",
            description: "Maintenance pas encore proche",
        },
        {
            value: "REFERENCE_MANQUANTE",
            label: "Référence manquante",
            description: "Compteur de référence à renseigner",
        },
        {
            value: "COMPTEUR_INDISPONIBLE",
            label: "Compteur indisponible",
            description: "Données de compteur à vérifier",
        },
    ];

export function EcheancesSummaryCards({
    counts,
    filters,
}: Props): ReactElement {
    const router = useRouter();
    const pathname = usePathname();

    function handleStatusClick(
        selectedStatus: StatutEcheance,
    ): void {
        const params = new URLSearchParams();

        params.set("afficherEcheances", "1");
        params.set("typeparcId", filters.typeparcId);

        if (filters.parcId) {
            params.set("parcId", filters.parcId);
        }

        if (filters.siteId) {
            params.set("siteId", filters.siteId);
        }

        if (filters.enginId) {
            params.set("enginId", filters.enginId);
        }

        // Cliquer sur le statut déjà actif enlève ce filtre.
        if (filters.statut !== selectedStatus) {
            params.set("statut", selectedStatus);
        }

        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <section className="space-y-3">
            <div>
                <h2 className="text-lg font-semibold">
                    Synthèse des échéances
                </h2>

                <p className="text-sm text-muted-foreground">
                    Cliquez sur une carte pour filtrer le tableau
                    par statut. Cliquez une seconde fois sur le
                    statut actif pour afficher toutes les échéances.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {STATUS_CARDS.map((card) => {
                    const isActive =
                        filters.statut === card.value;

                    return (
                        <button
                            key={card.value}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() =>
                                handleStatusClick(card.value)
                            }
                            className={[
                                "flex w-full flex-col items-start gap-1",
                                "rounded-lg border p-4 text-left",
                                "transition-colors hover:bg-accent/50",
                                "focus-visible:outline-none",
                                "focus-visible:ring-2 focus-visible:ring-ring",
                                isActive
                                    ? "border-primary ring-1 ring-primary"
                                    : "border-border",
                            ].join(" ")}
                        >
                            <span className="text-sm font-medium text-muted-foreground">
                                {card.label}
                            </span>

                            <span className="text-3xl font-semibold tabular-nums">
                                {counts[card.value]}
                            </span>

                            <span className="text-sm text-muted-foreground">
                                {card.description}
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}