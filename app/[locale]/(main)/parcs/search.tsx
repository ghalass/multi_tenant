
"use client";

import { useState, useTransition } from "react";
import {
    useSearchParams,
    usePathname,
    useRouter,
} from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { GlobalLoader } from "@/components/global-loader";

export default function SearchParcs(): import("react").JSX.Element {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();
    const [isPending, startTransition] = useTransition();
    const [clearPending, startClearTransition] = useTransition();
    const [search, setSearch] = useState(searchParams.get("name") ?? "");

    const handleSearch = useDebouncedCallback((value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (value.trim()) {
            params.set("name", value.trim());
        } else {
            params.delete("name");
        }

        params.delete("currentPage");

        startTransition(() => {
            replace(`${pathname}?${params.toString()}`);
        });
    }, 300);

    function clearSearch(): void {
        setSearch("");
        handleSearch.cancel();

        const params = new URLSearchParams(searchParams.toString());
        params.delete("name");
        params.delete("currentPage");

        startClearTransition(() => {
            replace(`${pathname}?${params.toString()}`);
        });
    }

    return (
        <>
            <GlobalLoader show={clearPending} />

            <div className="mb-5 mt-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                        value={search}
                        onChange={(event) => {
                            const value = event.target.value;
                            setSearch(value);
                            handleSearch(value);
                        }}
                        placeholder="Rechercher un parc..."
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
            </div>
        </>
    );
}
