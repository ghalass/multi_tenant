"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GlobalLoader } from "@/components/global-loader";
import type { JSX } from "react";

export default function TypeParcsSearch(): JSX.Element {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const [search, setSearch] = useState(searchParams.get("name") ?? "");
    const [isPending, startTransition] = useTransition();
    const [clearPending, startClearTransition] = useTransition();

    const updateSearch = useDebouncedCallback((value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (value.trim()) {
            params.set("name", value.trim());
        } else {
            params.delete("name");
        }

        params.delete("currentPage");

        startTransition(() => {
            router.replace(
                params.size ? `${pathname}?${params.toString()}` : pathname
            );
        });
    }, 300);

    function clearSearch(): void {
        setSearch("");
        updateSearch.cancel();

        const params = new URLSearchParams(searchParams.toString());
        params.delete("name");
        params.delete("currentPage");

        startClearTransition(() => {
            router.replace(
                params.size ? `${pathname}?${params.toString()}` : pathname
            );
        });
    }

    return (
        <>
            <GlobalLoader show={clearPending} />

            <div className="relative mb-5 mt-2 w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        updateSearch(event.target.value);
                    }}
                    placeholder="Rechercher un type de parc..."
                    className="pl-9 pr-9"
                    disabled={isPending}
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
        </>
    );
}