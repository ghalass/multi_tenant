// app/(main)/[tenantId]/roles/search.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Search as SearchIcon, X } from "lucide-react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { useState, useTransition } from "react";
import { GlobalLoader } from "@/components/global-loader";

export default function Search() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();
    const [isPending, startTransition] = useTransition();

    // ✅ Plus de useEffect : on initialise une seule fois
    const [search, setSearch] = useState(searchParams.get("name") ?? "");

    const handleFilterChange = useDebouncedCallback(
        (key: string, value: string) => {
            const params = new URLSearchParams(searchParams);

            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }

            params.delete("page");

            startTransition(() => {
                replace(`${pathname}?${params.toString()}`);
            });
        },
        300
    );

    const clearSearch = () => {
        setSearch("");
        const params = new URLSearchParams(searchParams);
        params.delete("name");
        params.delete("page");
        startTransition(() => {
            replace(`${pathname}?${params.toString()}`);
        });
    };

    return (
        <>
            <GlobalLoader show={isPending} />

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:gap-4 mb-5">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Rechercher par nom ou description..."
                        className="pl-9 pr-9"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            handleFilterChange("name", e.target.value);
                        }}
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            aria-label="Effacer la recherche"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}