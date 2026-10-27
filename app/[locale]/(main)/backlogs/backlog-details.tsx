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
import {
    Table, TableBody, TableCell, TableRow,
} from "@/components/ui/table";
import { ExportExcel } from "@/components/export-excel";

import type { BacklogRecord } from "@/lib/types/backlog";

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

                <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 font-semibold">
                            <History className="size-4" />
                            Historique des statuts
                        </h3>
                        <ExportExcel
                            tableName="backlog-status-history-table"
                            fileName={`Historique_statuts_${backlog.numeroBacklog}`}
                        />
                    </div>

                    <div className="overflow-x-auto rounded-md border">
                        <Table id="backlog-status-history-table">
                            <TableBody>
                                <TableRow>
                                    <TableCell colSpan={4}>
                                        N° backlog : {backlog.numeroBacklog} — Engin : {backlog.engin?.name ?? "—"} — Site : {backlog.site?.name ?? "—"} — Source : {backlog.source} — Priorité : {formatStatus(backlog.priorite)}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={4} className="whitespace-pre-wrap">
                                        Description : {backlog.description}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={4} className="whitespace-pre-wrap">
                                        Observations : {backlog.observations || "—"}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={4}>
                                        Équipe : {backlog.equipe || "—"}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/50 font-semibold">
                                    <TableCell>Date</TableCell>
                                    <TableCell>Ancien statut</TableCell>
                                    <TableCell>Nouveau statut</TableCell>
                                    <TableCell>Commentaire</TableCell>
                                </TableRow>
                                {history.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                                            Aucun changement de statut enregistré.
                                        </TableCell>
                                    </TableRow>
                                ) : history.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            {new Date(item.dateChangement).toLocaleString("fr-FR")}
                                        </TableCell>
                                        <TableCell>{formatStatus(item.ancienStatut)}</TableCell>
                                        <TableCell>{formatStatus(item.nouveauStatut)}</TableCell>
                                        <TableCell className="whitespace-pre-wrap">
                                            {item.commentaire || "—"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}