"use client";

import { Eye, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import type { BacklogRecord } from "@/lib/types/backlog";

function formatDate(value?: Date | string | null) {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("fr-FR", {
        timeZone: "UTC",
    });
}

function formatStatus(value: string) {
    return value.replaceAll("_", " ").toLowerCase();
}

export function BacklogDetails({
    backlog,
}: {
    backlog: BacklogRecord;
}) {
    const history = backlog.historiqueStatutBacklogs ?? [];

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Voir le backlog">
                    <Eye className="size-4" />
                </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        Backlog {backlog.numeroBacklog}
                    </DialogTitle>
                    <DialogDescription>
                        Informations et historique des changements de statut.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <p className="text-xs text-muted-foreground">Date de détection</p>
                        <p className="font-medium">{formatDate(backlog.dateDetection)}</p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground">Date d'exécution</p>
                        <p className="font-medium">{formatDate(backlog.dateExecution)}</p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground">Engin</p>
                        <p className="font-medium">{backlog.engin?.name ?? "—"}</p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground">Site</p>
                        <p className="font-medium">{backlog.site?.name ?? "—"}</p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground">Source</p>
                        <p className="font-medium">{backlog.source}</p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground">Priorité</p>
                        <p className="font-medium">{formatStatus(backlog.priorite)}</p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground">Statut</p>
                        <p className="font-medium">{formatStatus(backlog.statut)}</p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground">Équipe</p>
                        <p className="font-medium">{backlog.equipe ?? "—"}</p>
                    </div>
                </div>

                <div>
                    <p className="mb-1 text-xs text-muted-foreground">Description</p>
                    <p className="whitespace-pre-wrap rounded-md border p-3 text-sm">
                        {backlog.description}
                    </p>
                </div>

                <div>
                    <p className="mb-1 text-xs text-muted-foreground">Observations</p>
                    <p className="whitespace-pre-wrap text-sm">
                        {backlog.observations || "—"}
                    </p>
                </div>

                <div className="space-y-3 border-t pt-4">
                    <h3 className="flex items-center gap-2 font-semibold">
                        <History className="size-4" />
                        Historique des statuts
                    </h3>

                    {history.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Aucun changement de statut enregistré.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {history.map((item) => (
                                <div key={item.id} className="rounded-md border p-3">
                                    <p className="font-medium">
                                        {formatStatus(item.ancienStatut)}
                                        {" → "}
                                        {formatStatus(item.nouveauStatut)}
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                        {new Date(item.dateChangement).toLocaleString("fr-FR")}
                                    </p>

                                    {item.commentaire && (
                                        <p className="mt-2 whitespace-pre-wrap text-sm">
                                            {item.commentaire}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}