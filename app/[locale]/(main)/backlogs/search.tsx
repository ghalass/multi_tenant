"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, Search as SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function BacklogSearch({
    filters,
    options,
}: {
    filters: BacklogFilters;
    options: BacklogOptions;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [values, setValues] = useState({
        search: filters.search ?? "",
        statut: filters.statut ?? "all",
        priorite: filters.priorite ?? "all",
        source: filters.source ?? "all",
        siteId: filters.siteId ?? "all",
        enginId: filters.enginId ?? "all",
        dateFrom: filters.dateFrom ?? "",
        dateTo: filters.dateTo ?? "",
        itemsPerPage: String(filters.itemsPerPage ?? 10),
    });

    const engins = options.engins.filter(
        (engin) =>
            values.siteId === "all" || engin.siteId === values.siteId,
    );

    function update<K extends keyof typeof values>(
        key: K,
        value: (typeof values)[K],
    ) {
        setValues((current) => ({ ...current, [key]: value }));
    }

    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const params = new URLSearchParams(searchParams.toString());

        const entries: [string, string][] = [
            ["search", values.search.trim()],
            ["statut", values.statut === "all" ? "" : values.statut],
            ["priorite", values.priorite === "all" ? "" : values.priorite],
            ["source", values.source === "all" ? "" : values.source],
            ["siteId", values.siteId === "all" ? "" : values.siteId],
            ["enginId", values.enginId === "all" ? "" : values.enginId],
            ["dateFrom", values.dateFrom],
            ["dateTo", values.dateTo],
            ["itemsPerPage", values.itemsPerPage],
        ];

        for (const [key, value] of entries) {
            if (value) params.set(key, value);
            else params.delete(key);
        }

        params.set("appliquer", "1");
        params.delete("currentPage");

        router.push(`${pathname}?${params.toString()}`);
    }

    function resetFilters() {
        const params = new URLSearchParams();
        params.set("appliquer", "1");

        setValues({
            search: "",
            statut: "all",
            priorite: "all",
            source: "all",
            siteId: "all",
            enginId: "all",
            dateFrom: "",
            dateTo: "",
            itemsPerPage: "10",
        });

        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <form onSubmit={applyFilters} className="my-4 space-y-4 rounded-md border p-4">
            <div className="flex flex-wrap items-end gap-3">
                <Input
                    className="w-64 max-w-full"
                    placeholder="N° backlog, description, engin..."
                    value={values.search}
                    onChange={(event) => update("search", event.target.value)}
                />

                <Select
                    value={values.statut}
                    onValueChange={(value) => update("statut", value)}
                >
                    <SelectTrigger>
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

                <Select
                    value={values.priorite}
                    onValueChange={(value) => update("priorite", value)}
                >
                    <SelectTrigger>
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

                <Select
                    value={values.source}
                    onValueChange={(value) => update("source", value)}
                >
                    <SelectTrigger>
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

                <Select
                    value={values.siteId}
                    onValueChange={(value) => {
                        update("siteId", value);
                        update("enginId", "all");
                    }}
                >
                    <SelectTrigger>
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

                <Select
                    value={values.enginId}
                    onValueChange={(value) => update("enginId", value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Tous les engins" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les engins</SelectItem>
                        {engins.map((engin) => (
                            <SelectItem key={engin.id} value={engin.id}>
                                {engin.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <label className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">
                        Détection à partir du
                    </span>
                    <Input
                        className="w-auto"
                        type="date"
                        value={values.dateFrom}
                        onChange={(event) => update("dateFrom", event.target.value)}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">
                        Détection jusqu'au
                    </span>
                    <Input
                        className="w-auto"
                        type="date"
                        value={values.dateTo}
                        onChange={(event) => update("dateTo", event.target.value)}
                    />
                </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm">
                    Afficher
                    <Select
                        value={values.itemsPerPage}
                        onValueChange={(value) => update("itemsPerPage", value)}
                    >
                        <SelectTrigger className="w-20">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[10, 20, 50, 100].map((count) => (
                                <SelectItem key={count} value={String(count)}>
                                    {count}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    lignes
                </label>

                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={resetFilters}>
                        <RotateCcw className="mr-2 size-4" />
                        Réinitialiser
                    </Button>

                    <Button type="submit">
                        <SearchIcon className="mr-2 size-4" />
                        Rechercher
                    </Button>
                </div>
            </div>
        </form>
    );
}