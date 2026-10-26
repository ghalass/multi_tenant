"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Search as SearchIcon, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlobalLoader } from "@/components/global-loader";

export default function Search() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const [pending, startTransition] = useTransition();
    const [search, setSearch] = useState(searchParams.get("name") ?? "");

    function updateParams(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString());

        if (value.trim()) params.set(key, value.trim());
        else params.delete(key);

        params.delete("currentPage");

        startTransition(() => {
            router.replace(
                params.size ? `${pathname}?${params.toString()}` : pathname,
            );
        });
    }

    const debouncedSearch = useDebouncedCallback((value: string) => {
        updateParams("name", value);
    }, 300);

    function clearSearch() {
        setSearch("");
        debouncedSearch.cancel();
        updateParams("name", "");
    }

    return (
        <>
            <GlobalLoader show={pending} />

            <div className="mb-5 mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            debouncedSearch(event.target.value);
                        }}
                        placeholder="Rechercher par engin..."
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

                <div className="flex flex-col gap-1">
                    <label htmlFor="hrm-date-du" className="text-sm">
                        Du
                    </label>
                    <Input
                        id="hrm-date-du"
                        type="date"
                        value={searchParams.get("dateDu") ?? ""}
                        onChange={(event) => updateParams("dateDu", event.target.value)}
                        disabled={pending}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="hrm-date-au" className="text-sm">
                        Au
                    </label>
                    <Input
                        id="hrm-date-au"
                        type="date"
                        min={searchParams.get("dateDu") || undefined}
                        value={searchParams.get("dateAu") ?? ""}
                        onChange={(event) => updateParams("dateAu", event.target.value)}
                        disabled={pending}
                    />
                </div>

                {(searchParams.has("dateDu") || searchParams.has("dateAu")) && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.delete("dateDu");
                            params.delete("dateAu");
                            params.delete("currentPage");

                            startTransition(() => {
                                router.replace(
                                    params.size ? `${pathname}?${params.toString()}` : pathname,
                                );
                            });
                        }}
                        disabled={pending}
                    >
                        Effacer les dates
                    </Button>
                )}
            </div>
        </>
    );
}