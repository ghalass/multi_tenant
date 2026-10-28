import type { ReactElement } from "react";
import { Calculator } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import CanAccess from "@/components/can-access";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";

import { EnregistrerMaintenanceDialog } from "./enregistrer-maintenance-dialog";

type StatutEcheance =
    | "REFERENCE_MANQUANTE"
    | "COMPTEUR_INDISPONIBLE"
    | "A_VENIR"
    | "ECHEANCE_PROCHE"
    | "A_ECHEANCE"
    | "EN_RETARD";

type DetailsCompteur = {
    enginId: string;
    enginName: string;
    compteurCourant: number;
    source:
    | "DERNIER_RELEVE"
    | "COMPTEUR_INITIAL_ET_HRM";
    dateDernierReleve: string | null;
    compteurBase: number;
    hrmCumulees: number;
    nombreSaisiesHrmAjoutees: number;
    avertissement: string;
};

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
        site: {
            id: string;
            name: string;
        };
        parc: {
            id: string;
            name: string;
            typeparc: {
                id: string;
                name: string;
            };
        };
    };

    compteurDerniereMaintenance: number | null;
    dateDerniereMaintenance: string | null;
    compteurCourant: number | null;
    detailsCompteur: DetailsCompteur | null;
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

function formatNombre(value: number): string {
    return new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 2,
    }).format(value);
}

function formatDate(value: string | null): string {
    if (!value) {
        return "—";
    }

    const parts = value.slice(0, 10).split("-");

    if (parts.length !== 3) {
        return value;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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
        return `${formatHeures(
            item.heuresRetard ??
            Math.abs(item.heuresRestantes),
        )} de retard`;
    }

    if (item.heuresRestantes === 0) {
        return "À échéance";
    }

    return `${formatHeures(item.heuresRestantes)} restantes`;
}

function DetailsCompteurDialog({
    item,
}: {
    item: EcheanceItem;
}): ReactElement {
    const details = item.detailsCompteur;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                >
                    <Calculator className="mr-2 size-4" />
                    Détail du compteur
                </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>
                        Détail du compteur — {item.engin.name}
                    </DialogTitle>

                    <DialogDescription>
                        Plan de maintenance :{" "}
                        {item.planMaintenance.code} —{" "}
                        {item.planMaintenance.name}
                    </DialogDescription>
                </DialogHeader>

                {!details ? (
                    <div className="rounded-lg border border-dashed p-4">
                        <p className="font-medium">
                            Détails du calcul indisponibles
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Le compteur courant n&apos;a pas pu être
                            calculé pour cet engin. Vérifiez les données
                            de l&apos;engin et ses saisies HRM.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">
                                Source du calcul
                            </p>

                            <p className="mt-1 font-medium">
                                {details.source === "DERNIER_RELEVE"
                                    ? "Dernier relevé de compteur + HRM postérieures"
                                    : "Compteur initial du châssis + HRM enregistrées"}
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border p-3">
                                <p className="text-sm text-muted-foreground">
                                    Date du dernier relevé
                                </p>

                                <p className="mt-1 font-medium">
                                    {details.dateDernierReleve
                                        ? formatDate(
                                            details.dateDernierReleve,
                                        )
                                        : "Aucun relevé utilisé"}
                                </p>
                            </div>

                            <div className="rounded-lg border p-3">
                                <p className="text-sm text-muted-foreground">
                                    Compteur de base
                                </p>

                                <p className="mt-1 font-medium">
                                    {formatHeures(details.compteurBase)}
                                </p>
                            </div>

                            <div className="rounded-lg border p-3">
                                <p className="text-sm text-muted-foreground">
                                    HRM cumulées ajoutées
                                </p>

                                <p className="mt-1 font-medium">
                                    {formatHeures(details.hrmCumulees)}
                                </p>
                            </div>

                            <div className="rounded-lg border p-3">
                                <p className="text-sm text-muted-foreground">
                                    Saisies HRM examinées
                                </p>

                                <p className="mt-1 font-medium">
                                    {formatNombre(
                                        details.nombreSaisiesHrmAjoutees,
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">
                                Compteur courant calculé
                            </p>

                            <p className="mt-1 text-2xl font-semibold tabular-nums">
                                {formatHeures(
                                    details.compteurCourant,
                                )}
                            </p>

                            <p className="mt-2 text-xs text-muted-foreground">
                                Compteur de base + HRM cumulées ajoutées.
                            </p>
                        </div>

                        <div className="rounded-lg border p-4">
                            <p className="font-medium">
                                Limite du calcul
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                                {details.avertissement}
                            </p>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
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
                    Essayez un autre parc, site, engin ou statut.
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
                        <TableHead>Actions</TableHead>
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
                                        item.planMaintenance
                                            .intervalleHeures,
                                    )}
                                </div>
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                                {item.compteurDerniereMaintenance ===
                                    null ? (
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
                                                {formatDate(
                                                    item.dateDerniereMaintenance,
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </TableCell>

                            <TableCell
                                className="whitespace-nowrap"
                                title={
                                    item.avertissementCompteur ??
                                    undefined
                                }
                            >
                                {item.compteurCourant === null
                                    ? "Indisponible"
                                    : formatHeures(
                                        item.compteurCourant,
                                    )}
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                                {item.compteurEcheance === null
                                    ? "—"
                                    : formatHeures(
                                        item.compteurEcheance,
                                    )}
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                                {getEcartLabel(item)}
                            </TableCell>

                            <TableCell>
                                <Badge
                                    variant={getStatusVariant(
                                        item.statut,
                                    )}
                                >
                                    {STATUS_LABELS[item.statut]}
                                </Badge>
                            </TableCell>

                            <TableCell className="min-w-64">
                                <div className="flex flex-wrap gap-2">
                                    <DetailsCompteurDialog item={item} />

                                    <CanAccess
                                        resource={
                                            RESOURCE.MAINTENANCE_PREVENTIVE
                                        }
                                        action={ACTION.CREATE}
                                    >
                                        <EnregistrerMaintenanceDialog
                                            planMaintenanceId={
                                                item.planMaintenance.id
                                            }
                                            planCode={
                                                item.planMaintenance.code
                                            }
                                            planName={
                                                item.planMaintenance.name
                                            }
                                            enginId={item.engin.id}
                                            enginName={item.engin.name}
                                            compteurCourant={
                                                item.compteurCourant
                                            }
                                        />
                                    </CanAccess>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}