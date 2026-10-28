import type { ReactElement } from "react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export type HistoriqueMaintenanceItem = {
    id: string;
    planMaintenanceId: string;
    enginId: string;
    dateMaintenance: string;
    compteur: number;
    commentaire: string | null;
    createdAt: string;
    planMaintenance: {
        id: string;
        code: string;
        name: string;
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
};

type Props = {
    data: HistoriqueMaintenanceItem[];
};

function formatDate(value: string): string {
    const parts = value.slice(0, 10).split("-");

    if (parts.length !== 3) {
        return value;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatHeures(value: number): string {
    return `${new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 2,
    }).format(value)} h`;
}

export function HistoriqueTable({
    data,
}: Props): ReactElement {
    if (data.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="font-medium">
                    Aucune maintenance trouvée.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Modifiez les filtres ou la période de recherche.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Engin / site</TableHead>
                        <TableHead>Type de parc</TableHead>
                        <TableHead>Parc</TableHead>
                        <TableHead>Plan de maintenance</TableHead>
                        <TableHead>Compteur</TableHead>
                        <TableHead>Commentaire</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {data.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="whitespace-nowrap">
                                {formatDate(item.dateMaintenance)}
                            </TableCell>

                            <TableCell className="min-w-32">
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

                            <TableCell className="min-w-40">
                                <div className="font-medium">
                                    {item.planMaintenance.code}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {item.planMaintenance.name}
                                </div>
                            </TableCell>

                            <TableCell className="whitespace-nowrap font-medium">
                                {formatHeures(item.compteur)}
                            </TableCell>

                            <TableCell className="min-w-48 max-w-sm whitespace-pre-wrap">
                                {item.commentaire || "—"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}