// app/(main)/users/search.tsx
"use client";

import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { useEffect, useState, useTransition } from "react";
import { Role } from "@/lib/generated/prisma/client";
import { GlobalLoader } from "@/components/global-loader";
import type { JSX } from "react";

export default function Filters({ roles = [] }: { roles?: Role[] }): JSX.Element {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const [isPending, startTransition] = useTransition();
    const [clearPending, startClearTransition] = useTransition();

    // ✅ Utiliser la même clé "name" partout
    const [search, setSearch] = useState(searchParams.get("name") ?? "");

    useEffect(() => {
        startTransition(() => {
            setSearch(searchParams.get("name") ?? "");
        });
    }, [searchParams]);

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

    const clearSearch = (): void => {
        setSearch("");
        const params = new URLSearchParams(searchParams);
        params.delete("name");
        params.delete("page");
        startClearTransition(() => {
            replace(`${pathname}?${params.toString()}`);
        });
    };

    return (
        <>
            <GlobalLoader show={clearPending} />
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:gap-4 mb-5">
                {/* Recherche par nom/email */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Rechercher par nom ou email..."
                        className="pl-9 pr-9"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            handleFilterChange("name", e.target.value);
                        }}
                        disabled={isPending}
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            aria-label="Effacer la recherche"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            disabled={isPending}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Filtre par statut */}
                <Select
                    onValueChange={(value) =>
                        handleFilterChange("active", value === "all" ? "" : value)
                    }
                    defaultValue={searchParams.get("active")?.toString() || "all"}
                    disabled={isPending}
                >
                    <SelectTrigger className="w-full sm:w-45">
                        <SelectValue placeholder="Filtrer par statut" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="inactive">Inactif</SelectItem>
                    </SelectContent>
                </Select>

                {/* 🔑 Filtre par rôle */}
                {roles.length > 0 && (
                    <Select
                        onValueChange={(value) =>
                            handleFilterChange("role", value === "all" ? "" : value)
                        }
                        defaultValue={searchParams.get("role")?.toString() || "all"}
                        disabled={isPending}
                    >
                        <SelectTrigger className="w-full sm:w-45">
                            <SelectValue placeholder="Filtrer par rôle" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les rôles</SelectItem>
                            {roles.map((role) => (
                                <SelectItem key={role.name} value={role.name}>
                                    {role.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
        </>
    );
}