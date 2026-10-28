"use client";

import { JSX, useState, useTransition, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, Search } from "lucide-react";

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

type ActiveFilter = "tous" | "actifs" | "inactifs";

function normalizeActive(value?: string): ActiveFilter {
    return value === "actifs" || value === "inactifs"
        ? value
        : "tous";
}

export default function PlansMaintenanceSearch({
    filters,
}: {
    filters: {
        search?: string;
        actif?: string;
    };
}): JSX.Element {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [pending, startTransition] = useTransition();

    const [search, setSearch] = useState(filters.search ?? "");
    const [actif, setActif] = useState<ActiveFilter>(
        normalizeActive(filters.actif),
    );

    function applyFilters(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        const params = new URLSearchParams(searchParams.toString());
        const normalizedSearch = search.trim();

        if (normalizedSearch) {
            params.set("search", normalizedSearch);
        } else {
            params.delete("search");
        }

        if (actif !== "tous") {
            params.set("actif", actif);
        } else {
            params.delete("actif");
        }

        params.delete("currentPage");

        startTransition(() => {
            router.push(
                params.size ? `${pathname}?${params.toString()}` : pathname,
            );
        });
    }

    function resetFilters(): void {
        setSearch("");
        setActif("tous");

        startTransition(() => {
            router.push(pathname);
        });
    }

    return (
        <form
            onSubmit={applyFilters}
            className="my-4 flex flex-wrap items-end gap-3 rounded-md border p-4"
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

            <div className="min-w-48 flex-[1_1_260px] space-y-1">
                <label htmlFor="maintenance-plan-search" className="text-sm font-medium">
                    Rechercher
                </label>

                <Input
                    id="maintenance-plan-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Code, nom ou description..."
                    disabled={pending}
                />
            </div>

            <div className="min-w-40 flex-[1_1_180px] space-y-1">
                <label htmlFor="maintenance-plan-active" className="text-sm font-medium">
                    État
                </label>

                <Select
                    value={actif}
                    onValueChange={(value) => setActif(value as ActiveFilter)}
                    disabled={pending}
                >
                    <SelectTrigger id="maintenance-plan-active" className="w-full">
                        <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value="tous">Tous les plans</SelectItem>
                        <SelectItem value="actifs">Plans actifs</SelectItem>
                        <SelectItem value="inactifs">Plans inactifs</SelectItem>
                    </SelectContent>
                </Select>
            </div>

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
                    <Search className="mr-2 size-4" />
                    Rechercher
                </Button>
            </div>
        </form>
    );
}