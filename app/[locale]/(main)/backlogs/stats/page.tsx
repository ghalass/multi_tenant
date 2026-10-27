import { BarChart3, ClipboardList, PackageCheck, Wrench } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CanAccess from "@/components/can-access";
import DisplayError from "@/components/display-error";

import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { getBacklogStats } from "@/server/backlogs";

function readable(value: string) {
    return value.replaceAll("_", " ").toLowerCase();
}

export default async function BacklogStatsPage() {
    const response = await getBacklogStats();

    if (!response.success) {
        return (
            <div className="container mx-auto py-4">
                <DisplayError error={response.message} />
            </div>
        );
    }

    const stats = response.data;

    return (
        <CanAccess resource={RESOURCE.BACKLOG} action={ACTION.READ}>
            <div className="container mx-auto space-y-6 py-2">
                <div>
                    <h1 className="flex items-center gap-2 text-3xl font-bold">
                        <BarChart3 className="size-8" />
                        Tableau de bord des backlogs
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        Vue synthétique des backlogs du tenant courant.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total des backlogs
                            </CardTitle>
                            <ClipboardList className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{stats.total}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                En attente PDR
                            </CardTitle>
                            <Wrench className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">
                                {stats.parStatut.ATTENTE_PDR ?? 0}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                PDR prêts
                            </CardTitle>
                            <PackageCheck className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">
                                {stats.parStatut.PDR_PRET ?? 0}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Exécutés
                            </CardTitle>
                            <PackageCheck className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">
                                {stats.parStatut.EXECUTE ?? 0}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Répartition par statut</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {Object.entries(stats.parStatut).map(([status, count]) => (
                                <div
                                    key={status}
                                    className="flex items-center justify-between gap-3"
                                >
                                    <span className="text-sm">{readable(status)}</span>
                                    <Badge variant="secondary">{count}</Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Répartition par priorité</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {Object.entries(stats.parPriorite).map(([priority, count]) => (
                                <div
                                    key={priority}
                                    className="flex items-center justify-between gap-3"
                                >
                                    <span className="text-sm">{readable(priority)}</span>
                                    <Badge variant="secondary">{count}</Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Répartition par source</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {Object.entries(stats.parSource).map(([source, count]) => (
                                <div
                                    key={source}
                                    className="flex items-center justify-between gap-3"
                                >
                                    <span className="text-sm">{readable(source)}</span>
                                    <Badge variant="secondary">{count}</Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </CanAccess>
    );
}