
"use client";

import { useState, useTransition } from "react";
import {
    useSearchParams,
    usePathname,
    useRouter,
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
import { ACTIVE } from "@/lib/constantes";

type Option = {
    id: string;
    name: string;
};

type ParcOption = Option & {
    typeparcId: string;
};

type Props = {
    sites: Option[];
    typeparcs: Option[];
    parcs: ParcOption[];
};

export default function Search({
    sites,
    typeparcs,
    parcs,
}: Props): import("react").JSX.Element {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const [pending, startTransition] = useTransition();
    const [clearPending, startClearTransition] = useTransition();

    const [search, setSearch] = useState(
        searchParams.get("name") ?? "",
    );

    function updateFilters(changes: Record<string, string>): void {
        const params = new URLSearchParams(searchParams.toString());

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
            replace(query ? `${pathname}?${query}` : pathname);
        });
    }

    const applyFilter = useDebouncedCallback(
        (key: string, value: string) => {
            updateFilters({ [key]: value });
        },
        300,
    );

    function handleTypeparcChange(value: string): void {
        applyFilter.cancel();

        // Le parc choisi précédemment n'est plus nécessairement valide.
        updateFilters({
            typeparcId: value,
            parcId: "",
        });
    }

    function clearSearch(): void {
        setSearch("");
        applyFilter.cancel();

        const params = new URLSearchParams(searchParams.toString());

        params.delete("name");
        params.delete("currentPage");

        const query = params.toString();

        startClearTransition(() => {
            replace(query ? `${pathname}?${query}` : pathname);
        });
    }

    const selectedTypeparcId =
        searchParams.get("typeparcId") ?? "all";

    const filteredParcs = selectedTypeparcId === "all"
        ? []
        : parcs.filter(
            (parc) => parc.typeparcId === selectedTypeparcId,
        );

    const selectedParcId =
        searchParams.get("parcId") ?? "all";

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
                            applyFilter("name", value);
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
                    value={searchParams.get("siteId") ?? "all"}
                    onValueChange={(value) =>
                        updateFilters({ siteId: value })
                    }
                    disabled={pending}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Site" />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value="all">
                            Tous les sites
                        </SelectItem>

                        {sites.map((site) => (
                            <SelectItem
                                key={site.id}
                                value={site.id}
                            >
                                {site.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={selectedTypeparcId}
                    onValueChange={handleTypeparcChange}
                    disabled={pending}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Type de parc" />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value="all">
                            Tous les types de parc
                        </SelectItem>

                        {typeparcs.map((typeparc) => (
                            <SelectItem
                                key={typeparc.id}
                                value={typeparc.id}
                            >
                                {typeparc.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={selectedParcId}
                    onValueChange={(value) =>
                        updateFilters({ parcId: value })
                    }
                    disabled={
                        pending ||
                        selectedTypeparcId === "all"
                    }
                >
                    <SelectTrigger>
                        <SelectValue
                            placeholder={
                                selectedTypeparcId === "all"
                                    ? "Choisir d'abord un type de parc"
                                    : "Parc"
                            }
                        />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value="all">
                            Tous les parcs de ce type
                        </SelectItem>

                        {filteredParcs.map((parc) => (
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
                    value={searchParams.get("active") ?? "all"}
                    onValueChange={(value) =>
                        updateFilters({ active: value })
                    }
                    disabled={pending}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Statut" />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value="all">
                            Tous les statuts
                        </SelectItem>

                        <SelectItem value={ACTIVE.YES}>
                            Actifs
                        </SelectItem>

                        <SelectItem value={ACTIVE.NO}>
                            Inactifs
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </>
    );
}
