"use client";

import { useState, type ReactElement } from "react"; import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { PorteeAffectationMaintenance } from "@/lib/generated/prisma/enums";
import { setAffectationPlanMaintenanceActive } from "@/server/maintenance-preventive-affectations";

type AffectationItem = {
    id: string;
    active: boolean;
    portee: PorteeAffectationMaintenance;
    planMaintenance: {
        id: string;
        code: string;
        name: string;
        active: boolean;
    };
    typeparc: {
        id: string;
        name: string;
    } | null;
    parc: {
        id: string;
        name: string;
        typeparc: {
            id: string;
            name: string;
        } | null;
    } | null;
    site: {
        id: string;
        name: string;
    } | null;
    engin: {
        id: string;
        name: string;
    } | null;
};

type Props = {
    affectations: AffectationItem[];
};

const PORTÉE_LABELS: Record<PorteeAffectationMaintenance, string> = {
    [PorteeAffectationMaintenance.TYPEPARC]: "Type de parc",
    [PorteeAffectationMaintenance.PARC]: "Parc",
    [PorteeAffectationMaintenance.SITE]: "Site",
    [PorteeAffectationMaintenance.ENGIN]: "Engin",
};

function getCibleLabel(affectation: AffectationItem): string {
    switch (affectation.portee) {
        case PorteeAffectationMaintenance.TYPEPARC:
            return affectation.typeparc?.name ?? "—";

        case PorteeAffectationMaintenance.PARC:
            return affectation.parc?.name ?? "—";

        case PorteeAffectationMaintenance.SITE:
            return affectation.site?.name ?? "—";

        case PorteeAffectationMaintenance.ENGIN:
            return affectation.engin?.name ?? "—";

        default:
            return "—";
    }
}

export function AffectationsTable({
    affectations,
}: Props): ReactElement {
    const router = useRouter();

    const [pendingId, setPendingId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{
        id: string;
        success: boolean;
        message: string;
    } | null>(null);

    async function handleToggle(
        affectation: AffectationItem,
    ): Promise<void> {
        setPendingId(affectation.id);
        setFeedback(null);

        try {
            const result = await setAffectationPlanMaintenanceActive(
                affectation.id,
                !affectation.active,
            );

            setFeedback({
                id: affectation.id,
                success: result.success,
                message: result.message,
            });

            if (result.success) {
                router.refresh();
            }
        } catch {
            setFeedback({
                id: affectation.id,
                success: false,
                message: "Une erreur est survenue.",
            });
        } finally {
            setPendingId(null);
        }
    }

    if (affectations.length === 0) {
        return (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                Aucune affectation enregistrée.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Plan</TableHead>
                        <TableHead>Portée</TableHead>
                        <TableHead>Cible</TableHead>
                        <TableHead>État</TableHead>
                        <TableHead className="text-right">
                            Action
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {affectations.map((affectation) => (
                        <TableRow key={affectation.id}>
                            <TableCell>
                                <div className="font-medium">
                                    {affectation.planMaintenance.code}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {affectation.planMaintenance.name}
                                </div>

                                {!affectation.planMaintenance.active && (
                                    <div className="mt-1 text-xs text-destructive">
                                        Plan désactivé
                                    </div>
                                )}
                            </TableCell>

                            <TableCell>
                                {PORTÉE_LABELS[affectation.portee]}
                            </TableCell>

                            <TableCell>
                                {getCibleLabel(affectation)}
                            </TableCell>

                            <TableCell>
                                <Badge
                                    variant={
                                        affectation.active
                                            ? "default"
                                            : "secondary"
                                    }
                                >
                                    {affectation.active
                                        ? "Active"
                                        : "Suspendue"}
                                </Badge>
                            </TableCell>

                            <TableCell className="text-right">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={pendingId !== null}
                                    onClick={() =>
                                        handleToggle(affectation)
                                    }
                                >
                                    {pendingId === affectation.id
                                        ? "Traitement..."
                                        : affectation.active
                                            ? "Suspendre"
                                            : "Activer"}
                                </Button>

                                {feedback?.id === affectation.id && (
                                    <p
                                        role="status"
                                        className={`mt-2 text-xs ${feedback.success
                                            ? "text-green-600"
                                            : "text-destructive"
                                            }`}
                                    >
                                        {feedback.message}
                                    </p>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}