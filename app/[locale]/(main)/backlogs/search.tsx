"use client";

import {
    useEffect,
    useState,
    useTransition,
    type FormEvent,
} from "react";
import {
    usePathname,
    useRouter,
    useSearchParams,
} from "next/navigation";
import { RotateCcw, Search as SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    PrioriteBacklog,
    SourceBacklog,
    StatutBacklog,
} from "@/lib/generated/prisma/enums";

import type {
    BacklogFilters,
    BacklogOptions,
} from "@/lib/types/backlog";

function normalizeItemsPerPage(
    value: string | null | undefined,
    totalItems?: number,
): string {
    if (value === null || value === undefined || value === "") {
        return "10";
    }

    const parsed = Number(value);

    if (parsed === 0) {
        return "all";
    }

    if (
        Number.isFinite(parsed) &&
        parsed > 0 &&
        totalItems !== undefined &&
        totalItems > 0 &&
        parsed >= totalItems
    ) {
        return "all";
    }

    return Number.isFinite(parsed) && parsed > 0
        ? String(parsed)
        : "10";
}

export default function BacklogSearch({
    filters,
    options,
    totalItems,
}: {
    filters: BacklogFilters;
    options: BacklogOptions;
    totalItems?: number;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [pending, startTransition] = useTransition();

    const [values, setValues] = useState({
        search: filters.search ?? "",
        statut: filters.statut || "all",
        priorite: filters.priorite || "all",
        source: filters.source || "all",
        typeparcId: filters.typeparcId || "all",
        parcId: filters.parcId || "all",
        siteId: filters.siteId || "all",
        enginId: filters.enginId || "all",
        dateFrom: filters.dateFrom ?? "",
        dateTo: filters.dateTo ?? "",
        itemsPerPage: normalizeItemsPerPage(
            filters.itemsPerPage === undefined
                ? undefined
                : String(filters.itemsPerPage),
            totalItems,
        ),
    });

    // Synchroniser les sélections lorsque la pagination modifie l'URL.
    useEffect(() => {
        const pageSize = searchParams.get("itemsPerPage");

        setValues({
            search: searchParams.get("search") ?? "",
            statut: searchParams.get("statut") || "all",
            priorite: searchParams.get("priorite") || "all",
            source: searchParams.get("source") || "all",
            typeparcId: searchParams.get("typeparcId") || "all",
            parcId: searchParams.get("parcId") || "all",
            siteId: searchParams.get("siteId") || "all",
            enginId: searchParams.get("enginId") || "all",
            dateFrom: searchParams.get("dateFrom") ?? "",
            dateTo: searchParams.get("dateTo") ?? "",
            itemsPerPage: normalizeItemsPerPage(
                pageSize,
                totalItems,
            ),
        });
    }, [searchParams, totalItems]);

    function update<K extends keyof typeof values>(
        key: K,
        value: (typeof values)[K],
    ) {
        setValues((current) => ({
            ...current,
            [key]: value,
        }));
    }

    // Parcs appartenant au type de parc sélectionné.
    const filteredParcs = options.parcs.filter(
        (parc) =>
            values.typeparcId === "all" ||
            parc.typeparcId === values.typeparcId,
    );

    // Engins filtrés par type de parc, parc et site.
    const filteredEngins = options.engins.filter((engin) => {
        const parc = options.parcs.find(
            (item) => item.id === engin.parcId,
        );

        const matchesTypeparc =
            values.typeparcId === "all" ||
            parc?.typeparcId === values.typeparcId;

        const matchesParc =
            values.parcId === "all" ||
            engin.parcId === values.parcId;

        const matchesSite =
            values.siteId === "all" ||
            engin.siteId === values.siteId;

        return matchesTypeparc && matchesParc && matchesSite;
    });

    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const params = new URLSearchParams(searchParams.toString());

        const entries: [string, string][] = [
            ["search", values.search.trim()],
            [
                "statut",
                values.statut === "all" ? "" : values.statut,
            ],
            [
                "priorite",
                values.priorite === "all" ? "" : values.priorite,
            ],
            [
                "source",
                values.source === "all" ? "" : values.source,
            ],
            [
                "typeparcId",
                values.typeparcId === "all"
                    ? ""
                    : values.typeparcId,
            ],
            [
                "parcId",
                values.parcId === "all" ? "" : values.parcId,
            ],
            [
                "siteId",
                values.siteId === "all" ? "" : values.siteId,
            ],
            [
                "enginId",
                values.enginId === "all" ? "" : values.enginId,
            ],
            ["dateFrom", values.dateFrom],
            ["dateTo", values.dateTo],
            [
                "itemsPerPage",
                values.itemsPerPage === "all"
                    ? "0"
                    : values.itemsPerPage,
            ],
        ];

        for (const [key, value] of entries) {
            if (value !== "") {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        }

        params.set("appliquer", "1");
        params.delete("currentPage");

        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    }

    function resetFilters() {
        setValues({
            search: "",
            statut: "all",
            priorite: "all",
            source: "all",
            typeparcId: "all",
            parcId: "all",
            siteId: "all",
            enginId: "all",
            dateFrom: "",
            dateTo: "",
            itemsPerPage: "10",
        });

        startTransition(() => {
            router.push(pathname);
        });
    }

    return (
        <form
            onSubmit={applyFilters}
            className="my-4 space-y-4 rounded-md border p-4"
        >
            {pending && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-background/60"
                    role="status"
                    aria-label="Recherche en cours"
                >
                    <Spinner className="size-8 text-primary" />
                </div>
            )}
            <div className="flex flex-wrap items-end gap-3">
                {/* Recherche textuelle */}
                <div className="min-w-48 flex-[1_1_220px] space-y-1">
                    <label htmlFor="backlog-search" className="text-sm font-medium">
                        Recherche
                    </label>

                    <Input
                        id="backlog-search"
                        placeholder="N° backlog, description, engin..."
                        value={values.search}
                        onChange={(event) =>
                            update("search", event.target.value)
                        }
                    />
                </div>

                {/* Statut */}
                <div className="min-w-40 flex-[1_1_160px] space-y-1">
                    <label htmlFor="backlog-statut" className="text-sm font-medium">
                        Statut
                    </label>

                    <Select
                        value={values.statut}
                        onValueChange={(value) => update("statut", value)}
                    >
                        <SelectTrigger id="backlog-statut" className="w-full">
                            <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>

                            {Object.values(StatutBacklog).map((value) => (
                                <SelectItem key={value} value={value}>
                                    {value.replaceAll("_", " ").toLowerCase()}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Priorité */}
                <div className="min-w-40 flex-[1_1_160px] space-y-1">
                    <label htmlFor="backlog-priorite" className="text-sm font-medium">
                        Priorité
                    </label>

                    <Select
                        value={values.priorite}
                        onValueChange={(value) => update("priorite", value)}
                    >
                        <SelectTrigger id="backlog-priorite" className="w-full">
                            <SelectValue placeholder="Toutes les priorités" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="all">Toutes les priorités</SelectItem>

                            {Object.values(PrioriteBacklog).map((value) => (
                                <SelectItem key={value} value={value}>
                                    {value.toLowerCase()}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Source */}
                <div className="min-w-40 flex-[1_1_160px] space-y-1">
                    <label htmlFor="backlog-source" className="text-sm font-medium">
                        Source
                    </label>

                    <Select
                        value={values.source}
                        onValueChange={(value) => update("source", value)}
                    >
                        <SelectTrigger id="backlog-source" className="w-full">
                            <SelectValue placeholder="Toutes les sources" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="all">Toutes les sources</SelectItem>

                            {Object.values(SourceBacklog).map((value) => (
                                <SelectItem key={value} value={value}>
                                    {value}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Type de parc */}
                <div className="min-w-44 flex-[1_1_180px] space-y-1">
                    <label htmlFor="backlog-typeparc" className="text-sm font-medium">
                        Type de parc
                    </label>

                    <Select
                        value={values.typeparcId}
                        onValueChange={(value) => {
                            update("typeparcId", value);
                            update("parcId", "all");
                            update("enginId", "all");
                        }}
                    >
                        <SelectTrigger id="backlog-typeparc" className="w-full">
                            <SelectValue placeholder="Tous les types de parc" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="all">
                                Tous les types de parc
                            </SelectItem>

                            {options.typeparcs.map((typeparc) => (
                                <SelectItem key={typeparc.id} value={typeparc.id}>
                                    {typeparc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Parc */}
                <div className="min-w-44 flex-[1_1_180px] space-y-1">
                    <label htmlFor="backlog-parc" className="text-sm font-medium">
                        Parc
                    </label>

                    <Select
                        value={values.parcId}
                        onValueChange={(value) => {
                            update("parcId", value);
                            update("enginId", "all");
                        }}
                        disabled={filteredParcs.length === 0}
                    >
                        <SelectTrigger id="backlog-parc" className="w-full">
                            <SelectValue placeholder="Tous les parcs" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="all">Tous les parcs</SelectItem>

                            {filteredParcs.map((parc) => (
                                <SelectItem key={parc.id} value={parc.id}>
                                    {parc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Site : filtre complémentaire conservé */}
                <div className="min-w-40 flex-[1_1_160px] space-y-1">
                    <label htmlFor="backlog-site" className="text-sm font-medium">
                        Site
                    </label>

                    <Select
                        value={values.siteId}
                        onValueChange={(value) => {
                            update("siteId", value);
                            update("enginId", "all");
                        }}
                    >
                        <SelectTrigger id="backlog-site" className="w-full">
                            <SelectValue placeholder="Tous les sites" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="all">Tous les sites</SelectItem>

                            {options.sites.map((site) => (
                                <SelectItem key={site.id} value={site.id}>
                                    {site.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Engin */}
                <div className="min-w-44 flex-[1_1_180px] space-y-1">
                    <label htmlFor="backlog-engin" className="text-sm font-medium">
                        Engin
                    </label>

                    <Select
                        value={values.enginId}
                        onValueChange={(value) => update("enginId", value)}
                        disabled={filteredEngins.length === 0}
                    >
                        <SelectTrigger id="backlog-engin" className="w-full">
                            <SelectValue placeholder="Tous les engins" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="all">Tous les engins</SelectItem>

                            {filteredEngins.map((engin) => (
                                <SelectItem key={engin.id} value={engin.id}>
                                    {engin.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Dates */}
                <div className="min-w-40 flex-[1_1_160px] space-y-1">
                    <label htmlFor="backlog-date-from" className="text-sm font-medium">
                        Détection à partir du
                    </label>

                    <Input
                        id="backlog-date-from"
                        type="date"
                        value={values.dateFrom}
                        max={values.dateTo || undefined}
                        onChange={(event) =>
                            update("dateFrom", event.target.value)
                        }
                    />
                </div>

                <div className="min-w-40 flex-[1_1_160px] space-y-1">
                    <label htmlFor="backlog-date-to" className="text-sm font-medium">
                        Détection jusqu'au
                    </label>

                    <Input
                        id="backlog-date-to"
                        type="date"
                        value={values.dateTo}
                        min={values.dateFrom || undefined}
                        onChange={(event) =>
                            update("dateTo", event.target.value)
                        }
                    />
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Nombre de lignes */}
                <label className="flex items-center gap-2 text-sm">
                    Afficher

                    <Select
                        value={values.itemsPerPage}
                        onValueChange={(value) =>
                            update("itemsPerPage", value)
                        }
                    >
                        <SelectTrigger className="w-36">
                            <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                            {[10, 20, 50, 100].map((count) => (
                                <SelectItem key={count} value={String(count)}>
                                    {count}
                                </SelectItem>
                            ))}

                            <SelectItem value="all">
                                Tout afficher
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    lignes
                </label>

                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={resetFilters}
                        disabled={pending}
                    >
                        <RotateCcw className="mr-2 size-4" />
                        Réinitialiser
                    </Button>

                    <Button type="submit" disabled={pending}>
                        <SearchIcon className="mr-2 size-4" />
                        Rechercher
                    </Button>
                </div>
            </div>
        </form>
    );
}