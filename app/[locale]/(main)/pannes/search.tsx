
"use client";

import { useState, useTransition } from "react";
import {
    usePathname,
    useRouter,
    useSearchParams,
} from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Search as SearchIcon, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { GlobalLoader } from "@/components/global-loader";

type Option = {
    id: string;
    name: string;
};

type Props = {
    typepannes: Option[];
    parcs: Option[];
};

export default function PannesSearch({
    typepannes,
    parcs,
}: Props) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const [search, setSearch] = useState(
        searchParams.get("name") ?? "",
    );

    const [pending, startTransition] = useTransition();
    const [clearPending, startClearTransition] = useTransition();

    function updateFilters(changes: Record<string, string>) {
        const params = new URLSearchParams(
            searchParams.toString(),
        );

        for (const [key, value] of Object.entries(changes)) {
            if (value && value !== "all") {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        }

        params.delete("currentPage");

        const query = params.toString();

        startTransition(() => {
            router.replace(
                query ? `${pathname}?${query}` : pathname,
            );
        });
    }

    const updateSearch = useDebouncedCallback(
        (value: string) => {
            updateFilters({
                name: value.trim(),
            });
        },
        300,
    );

    function clearSearch() {
        setSearch("");
        updateSearch.cancel();

        const params = new URLSearchParams(
            searchParams.toString(),
        );

        params.delete("name");
        params.delete("currentPage");

        const query = params.toString();

        startClearTransition(() => {
            router.replace(
                query ? `${pathname}?${query}` : pathname,
            );
        });
    }

    return (
        <>
            <GlobalLoader show={clearPending} />

            <div className="mb-5 mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="relative">
                    <SearchIcon
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    />

                    <Input
                        value={search}
                        onChange={(event) => {
                            const value = event.target.value;

                            setSearch(value);
                            updateSearch(value);
                        }}
                        placeholder="Rechercher une panne..."
                        className="pl-9 pr-9"
                        disabled={pending}
                    />

                    {search && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            aria-label="Effacer la recherche"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-accent"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <Select
                    value={searchParams.get("parcId") ?? "all"}
                    onValueChange={(value) =>
                        updateFilters({ parcId: value })
                    }
                    disabled={pending}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Parc" />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value="all">
                            Tous les parcs
                        </SelectItem>

                        {parcs.map((parc) => (
                            <SelectItem
                                key={parc.id}
                                value={parc.id}
                            >
                                {parc.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={
                        searchParams.get("typepanneId") ?? "all"
                    }
                    onValueChange={(value) =>
                        updateFilters({ typepanneId: value })
                    }
                    disabled={pending}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Type de panne" />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value="all">
                            Tous les types de panne
                        </SelectItem>

                        {typepannes.map((typepanne) => (
                            <SelectItem
                                key={typepanne.id}
                                value={typepanne.id}
                            >
                                {typepanne.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </>
    );
}
