import { Wrench } from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Pagination from "@/components/pagination";
import DisplayError from "@/components/display-error";
import CanAccess from "@/components/can-access";
import type { JSX } from "react";

import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";

import { getPlansMaintenance } from "@/server/maintenance-preventive-plans";

import {
    PlanMaintenanceForm,
    type PlanMaintenanceItem,
} from "./plan-maintenance-form";
import { PlanMaintenanceActiveToggle } from "./plan-maintenance-active-toggle";
import PlansMaintenanceSearch from "./search";

type PageSearchParams = {
    search?: string;
    actif?: "tous" | "actifs" | "inactifs";
    currentPage?: string;
    itemsPerPage?: string;
};

function formatHeures(value: number): string {
    return `${new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 2,
    }).format(value)} h`;
}

export default async function PlansMaintenancePage({
    searchParams,
}: {
    searchParams: Promise<PageSearchParams>;
}): Promise<JSX.Element> {
    const filters = await searchParams;
    const response = await getPlansMaintenance(filters);
    const plans = response.data;

    return (
        <div className="container mx-auto py-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
                    <Wrench className="size-7 sm:size-8" />
                    Plans de maintenance préventive
                </h1>

                <CanAccess
                    resource={RESOURCE.MAINTENANCE_PREVENTIVE}
                    action={ACTION.CREATE}
                >
                    <PlanMaintenanceForm />
                </CanAccess>
            </div>

            <p className="mt-1 text-muted-foreground">
                Gérez les intervalles d&apos;entretien en heures et les seuils d&apos;alerte.
            </p>

            {!response.success && (
                <DisplayError className="mt-4" error={response.message} />
            )}

            <CanAccess
                resource={RESOURCE.MAINTENANCE_PREVENTIVE}
                action={ACTION.READ}
            >
                <PlansMaintenanceSearch
                    key={`${filters.search ?? ""}:${filters.actif ?? "tous"}`}
                    filters={filters}
                />

                <div className="rounded-md border">
                    <Table id="maintenance-plans-table">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Plan de maintenance</TableHead>
                                <TableHead>Intervalle</TableHead>
                                <TableHead>Alerte avant échéance</TableHead>
                                <TableHead>Affectations</TableHead>
                                <TableHead>Suivis enregistrés</TableHead>
                                <TableHead>État</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {plans.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="h-24 text-center"
                                    >
                                        Aucun plan de maintenance trouvé.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                plans.map((plan) => (
                                    <TableRow key={plan.id}>
                                        <TableCell className="whitespace-nowrap font-medium">
                                            {plan.code}
                                        </TableCell>

                                        <TableCell className="min-w-48">
                                            <div className="font-medium">{plan.name}</div>

                                            {plan.description && (
                                                <div className="max-w-xs truncate text-sm text-muted-foreground">
                                                    {plan.description}
                                                </div>
                                            )}
                                        </TableCell>

                                        <TableCell className="whitespace-nowrap">
                                            {formatHeures(plan.intervalleHeures)}
                                        </TableCell>

                                        <TableCell className="whitespace-nowrap">
                                            {formatHeures(plan.seuilAlerteHeures)}
                                        </TableCell>

                                        <TableCell>
                                            {plan._count.affectations}
                                        </TableCell>

                                        <TableCell>
                                            {plan._count.suivisEngins}
                                        </TableCell>

                                        <TableCell>
                                            <Badge
                                                variant={plan.active ? "default" : "outline"}
                                            >
                                                {plan.active ? "Actif" : "Inactif"}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                <CanAccess
                                                    resource={RESOURCE.MAINTENANCE_PREVENTIVE}
                                                    action={ACTION.UPDATE}
                                                >
                                                    <PlanMaintenanceForm
                                                        plan={plan as PlanMaintenanceItem}
                                                    />

                                                    <PlanMaintenanceActiveToggle
                                                        id={plan.id}
                                                        active={plan.active}
                                                        name={plan.name}
                                                    />
                                                </CanAccess>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {response.meta && (
                    <Pagination
                        totalPages={response.meta.totalPages}
                        currentPage={response.meta.currentPage}
                        totalItems={response.meta.totalItems}
                        itemsPerPage={response.meta.itemsPerPage}
                    />
                )}
            </CanAccess>
        </div>
    );
}