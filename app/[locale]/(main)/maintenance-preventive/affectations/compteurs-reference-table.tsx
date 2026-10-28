"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { renseignerCompteurDerniereMaintenance } from "@/server/maintenance-preventive-affectations";

type SuiviCompteurReference = {
    id: string;
    planMaintenanceId: string;
    enginId: string;
    compteurDerniereMaintenance: number | null;
    dateDerniereMaintenance: Date | null;
    planMaintenance: {
        id: string;
        code: string;
        name: string;
    };
    engin: {
        id: string;
        name: string;
    };
};

type Props = {
    suivis: SuiviCompteurReference[];
};

type RowProps = {
    suivi: SuiviCompteurReference;
};

function CompteurReferenceRow({
    suivi,
}: RowProps): ReactElement {
    const router = useRouter();

    const [compteur, setCompteur] = useState(
        suivi.compteurDerniereMaintenance?.toString() ?? "",
    );

    const [date, setDate] = useState(
        suivi.dateDerniereMaintenance
            ? new Date(suivi.dateDerniereMaintenance)
                .toISOString()
                .slice(0, 10)
            : "",
    );

    const [pending, setPending] = useState(false);
    const [feedback, setFeedback] = useState<{
        success: boolean;
        message: string;
    } | null>(null);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();
        setFeedback(null);

        const compteurValue = Number(compteur);

        if (
            compteur.trim() === "" ||
            !Number.isFinite(compteurValue) ||
            compteurValue < 0
        ) {
            setFeedback({
                success: false,
                message: "Saisissez un compteur positif ou nul.",
            });
            return;
        }

        setPending(true);

        try {
            const result =
                await renseignerCompteurDerniereMaintenance({
                    planMaintenanceId: suivi.planMaintenanceId,
                    enginId: suivi.enginId,
                    compteur: compteurValue,
                    date: date || null,
                });

            setFeedback({
                success: result.success,
                message: result.message,
            });

            if (result.success) {
                router.refresh();
            }
        } catch {
            setFeedback({
                success: false,
                message:
                    "Une erreur est survenue lors de l'enregistrement.",
            });
        } finally {
            setPending(false);
        }
    }

    return (
        <TableRow>
            <TableCell>
                <div className="font-medium">
                    {suivi.planMaintenance.code}
                </div>
                <div className="text-sm text-muted-foreground">
                    {suivi.planMaintenance.name}
                </div>
            </TableCell>

            <TableCell>{suivi.engin.name}</TableCell>

            <TableCell>
                <Badge
                    variant={
                        suivi.compteurDerniereMaintenance === null
                            ? "destructive"
                            : "secondary"
                    }
                >
                    {suivi.compteurDerniereMaintenance === null
                        ? "À renseigner"
                        : "Renseigné"}
                </Badge>

                {suivi.compteurDerniereMaintenance !== null && (
                    <div className="mt-1 text-sm">
                        {suivi.compteurDerniereMaintenance} h
                    </div>
                )}
            </TableCell>

            <TableCell>
                <form
                    onSubmit={handleSubmit}
                    className="flex min-w-[280px] flex-col gap-2"
                >
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={compteur}
                            onChange={(event) =>
                                setCompteur(event.target.value)
                            }
                            placeholder="Compteur en heures"
                            aria-label={`Compteur de référence pour ${suivi.engin.name}`}
                            required
                            disabled={pending}
                        />

                        <span className="text-sm text-muted-foreground">
                            h
                        </span>
                    </div>

                    <Input
                        type="date"
                        value={date}
                        onChange={(event) =>
                            setDate(event.target.value)
                        }
                        aria-label={`Date de dernière maintenance pour ${suivi.engin.name}`}
                        disabled={pending}
                    />

                    <Button
                        type="submit"
                        size="sm"
                        disabled={pending || compteur.trim() === ""}
                    >
                        {pending ? "Enregistrement..." : "Enregistrer"}
                    </Button>

                    {feedback && (
                        <p
                            role="status"
                            className={`text-xs ${feedback.success
                                    ? "text-green-600"
                                    : "text-destructive"
                                }`}
                        >
                            {feedback.message}
                        </p>
                    )}
                </form>
            </TableCell>
        </TableRow>
    );
}

export function CompteursReferenceTable({
    suivis,
}: Props): ReactElement {
    if (suivis.length === 0) {
        return (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                Aucun suivi actif. Créez d&apos;abord une affectation
                de plan de maintenance.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Plan de maintenance</TableHead>
                        <TableHead>Engin</TableHead>
                        <TableHead>Référence actuelle</TableHead>
                        <TableHead>
                            Compteur et date de dernière maintenance
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {suivis.map((suivi) => (
                        <CompteurReferenceRow
                            key={suivi.id}
                            suivi={suivi}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}