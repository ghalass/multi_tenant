"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { enregistrerMaintenanceRealisee } from "@/server/maintenance-preventive";

type Props = {
    planMaintenanceId: string;
    planCode: string;
    planName: string;
    enginId: string;
    enginName: string;
    compteurCourant: number | null;
};

function getTodayLocal(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatHeures(value: number): string {
    return `${new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 2,
    }).format(value)} h`;
}

export function EnregistrerMaintenanceDialog({
    planMaintenanceId,
    planCode,
    planName,
    enginId,
    enginName,
    compteurCourant,
}: Props): ReactElement {
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [dateMaintenance, setDateMaintenance] = useState(getTodayLocal());
    const [compteur, setCompteur] = useState("");
    const [commentaire, setCommentaire] = useState("");
    const [pending, setPending] = useState(false);

    function handleOpenChange(nextOpen: boolean): void {
        if (pending) {
            return;
        }

        setOpen(nextOpen);

        if (nextOpen) {
            setDateMaintenance(getTodayLocal());
            setCompteur("");
            setCommentaire("");
        }
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();

        if (!dateMaintenance) {
            toast.error("La date de maintenance est obligatoire.");
            return;
        }

        if (compteur.trim() === "") {
            toast.error("Saisissez le compteur réel relevé.");
            return;
        }

        const compteurValue = Number(compteur);

        if (!Number.isFinite(compteurValue) || compteurValue < 0) {
            toast.error("Le compteur doit être positif ou nul.");
            return;
        }

        if (compteurCourant === null) {
            toast.error(
                "Le compteur courant est indisponible. Vérifiez les relevés HRM.",
            );
            return;
        }

        setPending(true);

        try {
            const result = await enregistrerMaintenanceRealisee({
                planMaintenanceId,
                enginId,
                dateMaintenance,
                compteur: compteurValue,
                commentaire,
            });

            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success(result.message);
            setOpen(false);
            router.refresh();
        } catch {
            toast.error(
                "Impossible d'enregistrer la maintenance réalisée.",
            );
        } finally {
            setPending(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={compteurCourant === null}
                    title={
                        compteurCourant === null
                            ? "Compteur courant indisponible"
                            : "Enregistrer une maintenance réalisée"
                    }
                >
                    Enregistrer la maintenance
                </Button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Enregistrer une maintenance réalisée
                    </DialogTitle>

                    <DialogDescription>
                        Confirmez la date et le compteur relevé lors
                        de l&apos;intervention. Cette opération ajoutera
                        une entrée à l&apos;historique et actualisera
                        la référence du suivi.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-1 rounded-md border p-3 text-sm">
                    <p>
                        <span className="font-medium">Engin :</span>{" "}
                        {enginName}
                    </p>

                    <p>
                        <span className="font-medium">Plan :</span>{" "}
                        {planCode} — {planName}
                    </p>

                    <p>
                        <span className="font-medium">
                            Compteur courant calculé :
                        </span>{" "}
                        {compteurCourant === null
                            ? "Indisponible"
                            : formatHeures(compteurCourant)}
                    </p>
                </div>

                <form
                    id={`maintenance-realisee-form-${enginId}-${planMaintenanceId}`}
                    onSubmit={handleSubmit}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <label
                            htmlFor={`date-maintenance-${enginId}-${planMaintenanceId}`}
                            className="text-sm font-medium"
                        >
                            Date de maintenance
                        </label>

                        <Input
                            id={`date-maintenance-${enginId}-${planMaintenanceId}`}
                            type="date"
                            value={dateMaintenance}
                            max={getTodayLocal()}
                            onChange={(event) =>
                                setDateMaintenance(event.target.value)
                            }
                            required
                            disabled={pending}
                        />
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor={`compteur-maintenance-${enginId}-${planMaintenanceId}`}
                            className="text-sm font-medium"
                        >
                            Compteur réel relevé (heures)
                        </label>

                        <Input
                            id={`compteur-maintenance-${enginId}-${planMaintenanceId}`}
                            type="number"
                            min="0"
                            step="0.1"
                            value={compteur}
                            onChange={(event) =>
                                setCompteur(event.target.value)
                            }
                            placeholder="Saisir le compteur validé"
                            required
                            disabled={pending}
                        />

                        <p className="text-xs text-muted-foreground">
                            Le compteur doit être cohérent avec le
                            compteur courant et la dernière référence
                            enregistrée.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor={`commentaire-maintenance-${enginId}-${planMaintenanceId}`}
                            className="text-sm font-medium"
                        >
                            Commentaire (facultatif)
                        </label>

                        <Textarea
                            id={`commentaire-maintenance-${enginId}-${planMaintenanceId}`}
                            value={commentaire}
                            onChange={(event) =>
                                setCommentaire(event.target.value)
                            }
                            maxLength={2000}
                            placeholder="Observations sur l'intervention..."
                            disabled={pending}
                        />
                    </div>
                </form>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        onClick={() => handleOpenChange(false)}
                    >
                        Annuler
                    </Button>

                    <Button
                        type="submit"
                        form={`maintenance-realisee-form-${enginId}-${planMaintenanceId}`}
                        disabled={pending || compteur.trim() === ""}
                    >
                        {pending
                            ? "Enregistrement..."
                            : "Confirmer la maintenance"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}