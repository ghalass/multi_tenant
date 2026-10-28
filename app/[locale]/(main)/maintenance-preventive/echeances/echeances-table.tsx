import type { ReactElement } from "react";

import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type StatutEcheance =
    | "REFERENCE_MANQUANTE"
    | "COMPTEUR_INDISPONIBLE"
    | "A_VENIR"
    | "ECHEANCE_PROCHE"
    | "A_ECHEANCE"
    | "EN_RETARD";

type EcheanceItem = {
    suiviId: string;
    planMaintenance: {
        id: string;
        code: string;
        name: string;
        intervalleHeures: number;
        seuilAlerteHeures: number;
    };
    engin: {
        id: string;
        name: string;
        site: { id: string; name: string };
        parc: {
            id: string;
            name: string;
            typeparc: { id: string; name: string };
        };
    };
    compteurDerniereMaintenance: number | null;
    dateDerniereMaintenance: string | null;
    compteurCourant: number | null;
    compteurEcheance: number | null;
    heuresRestantes: number | null;
    heuresRetard: number | null;
    statut: StatutEcheance;
    avertissementCompteur: string | null;
};

type Props = {
    data: EcheanceItem[];
};

const STATUS_LABELS: Record<StatutEcheance, string> = {
    REFERENCE_MANQUANTE: "Référence manquante",
    COMPTEUR_INDISPONIBLE: "Compteur indisponible",
    A_VENIR: "À venir",
    ECHEANCE_PROCHE: "Échéance proche",
    A_ECHEANCE: "À échéance",
    EN_RETARD: "En retard",
};

function getStatusVariant(
    statut: StatutEcheance,
): "default" | "secondary" | "destructive" {
    if (
        statut === "EN_RETARD" ||
        statut === "REFERENCE_MANQUANTE" ||
        statut === "COMPTEUR_INDISPONIBLE"
    ) {
        return "destructive";
    }

    if (
        statut === "A_ECHEANCE" ||
        statut === "ECHEANCE_PROCHE"
    ) {
        return "default";
    }

    return "secondary";
}

function formatHeures(value: number): string {
    return `${new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 2,
    }).format(value)} h`;
}

function getEcartLabel(item: EcheanceItem): string {
    if (item.statut === "REFERENCE_MANQUANTE") {
        return "Référence à renseigner";
    }

    if (item.statut === "COMPTEUR_INDISPONIBLE") {
        return "Calcul impossible";
    }

    if (item.heuresRestantes === null) {
        return "—";
    }

    if (item.heuresRestantes < 0) {
        return `${formatHeures(item.heuresRetard ?? Math.abs(item.heuresRestantes))} de retard`;
    }

    if (item.heuresRestantes === 0) {
        return "À échéance";
    }

    return `${formatHeures(item.heuresRestantes)} restantes`;
}

export function EcheancesTable({
    data,
}: Props): ReactElement {
    if (data.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="font-medium">
                    Aucune échéance correspondant aux filtres.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Essayez un autre parc, site ou statut.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Engin / site</TableHead>
                        <TableHead>Type de parc</TableHead>
                        <TableHead>Parc</TableHead>
                        <TableHead>Plan de maintenance</TableHead>
                        <TableHead>Dernière maintenance</TableHead>
                        <TableHead>Compteur courant</TableHead>
                        <TableHead>Compteur d&apos;échéance</TableHead>
                        <TableHead>Écart</TableHead>
                        <TableHead>Statut</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {data.map((item) => (
                        <TableRow key={item.suiviId}>
                            <TableCell className="min-w-36">
                                <div className="font-medium">
                                    {item.engin.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {item.engin.site.name}
                                </div>
                            </TableCell>

                            <TableCell>
                                {item.engin.parc.typeparc.name}
                            </TableCell>

                            <TableCell>
                                {item.engin.parc.name}
                            </TableCell>

                            <TableCell className="min-w-44">
                                <div className="font-medium">
                                    {item.planMaintenance.code}
                                </div>
                                <div className="text-sm">
                                    {item.planMaintenance.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Intervalle :{" "}
                                    {formatHeures(
                                        item.planMaintenance.intervalleHeures,
                                    )}
                                </div>
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                                {item.compteurDerniereMaintenance === null ? (
                                    <span className="text-destructive">
                                        Non renseigné
                                    </span>
                                ) : (
                                    <>
                                        <div>
                                            {formatHeures(
                                                item.compteurDerniereMaintenance,
                                            )}
                                        </div>
                                        {item.dateDerniereMaintenance && (
                                            <div className="text-xs text-muted-foreground">
                                                {item.dateDerniereMaintenance}
                                            </div>
                                        )}
                                    </>
                                )}
                            </TableCell>

                            <TableCell
                                className="whitespace-nowrap"
                                title={
                                    item.avertissementCompteur ?? undefined
                                }
                            >
                                {item.compteurCourant === null
                                    ? "Indisponible"
                                    : formatHeures(item.compteurCourant)}
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                                {item.compteurEcheance === null
                                    ? "—"
                                    : formatHeures(item.compteurEcheance)}
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                                {getEcartLabel(item)}
                            </TableCell>

                            <TableCell>
                                <Badge
                                    variant={getStatusVariant(item.statut)}
                                >
                                    {STATUS_LABELS[item.statut]}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}