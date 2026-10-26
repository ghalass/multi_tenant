
"use client";

import { useState, useTransition } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Search as SearchIcon, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { GlobalLoader } from "@/components/global-loader";
import { ACTIVE } from "@/lib/constantes";

export default function Search() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();
    const [pending, startTransition] = useTransition();
    const [search, setSearch] = useState(searchParams.get("name") ?? "");

    const applyFilter = useDebouncedCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (value && value !== "all") params.set(key, value);
        else params.delete(key);

        params.delete("currentPage");

        startTransition(() => replace(`${pathname}?${params.toString()}`));
    }, 300);

    function clearSearch() {
        setSearch("");
        applyFilter.cancel();

        const params = new URLSearchParams(searchParams.toString());
        params.delete("name");
        params.delete("currentPage");

        startTransition(() => replace(`${pathname}?${params.toString()}`));
    }

    return (
        <>
            <GlobalLoader show={pending} />
            <div className="mb-5 mt-2 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            applyFilter("name", event.target.value);
                        }}
                        placeholder="Rechercher un engin..."
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
                    value={searchParams.get("active") || "all"}
                    onValueChange={(value) => applyFilter("active", value)}
                    disabled={pending}
                >
                    <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value={ACTIVE.YES}>Actifs</SelectItem>
                        <SelectItem value={ACTIVE.NO}>Inactifs</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </>
    );
}
