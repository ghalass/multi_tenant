"use client";

import { useState, useTransition, type JSX } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Option = { id: string; name: string };
type ParcOption = Option & { typeparcId: string };

export default function SearchObjectifs({
    sites,
    typeparcs,
    parcs,
}: {
    sites: Option[];
    typeparcs: Option[];
    parcs: ParcOption[];
}): JSX.Element {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const currentYear = String(new Date().getFullYear());
    const queryAnnee = searchParams.get("annee");
    const [anneeDraft, setAnneeDraft] = useState(() => ({
        query: queryAnnee,
        value: queryAnnee ?? currentYear,
    }));
    const annee = anneeDraft.query === queryAnnee
        ? anneeDraft.value
        : queryAnnee ?? currentYear;
    const typeParcId = searchParams.get("typeParcId") ?? "";
    const parcId = searchParams.get("parcId") ?? "";
    const filteredParcs = parcs.filter((parc) => parc.typeparcId === typeParcId);

    const updateFilter = useDebouncedCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== "all") params.set(key, value);
        else params.delete(key);
        params.delete("currentPage");
        startTransition(() => router.replace(`${pathname}?${params.toString()}`));
    }, 300);

    function updateSelectFilter(
        key: "typeParcId" | "parcId" | "siteId",
        value: string,
    ): void {
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== "all") params.set(key, value);
        else params.delete(key);
        if (key === "typeParcId") {
            params.delete("parcId");
            params.delete("siteId");
        } else if (key === "parcId") {
            params.delete("siteId");
        }
        params.delete("currentPage");
        startTransition(() => router.replace(`${pathname}?${params.toString()}`));
    }

    return (
        <div className="mb-5 mt-2 flex flex-wrap items-end gap-3">
            <div className="relative grid w-full gap-2 sm:w-36 sm:flex-none">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="number"
                    min={1900}
                    max={9999}
                    placeholder="Filtrer par année..."
                    value={annee}
                    onChange={(event) => {
                        const value = event.target.value;
                        setAnneeDraft({ query: queryAnnee, value });
                        updateFilter("annee", value);
                    }}
                    disabled={pending}
                    className="pl-9"
                />
            </div>

            <div className="grid w-full gap-2 sm:w-48 sm:flex-none">
                <Select
                    value={typeParcId || "all"}
                    onValueChange={(value) => updateSelectFilter("typeParcId", value)}
                    disabled={pending}
                >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Tous les types de parc" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        {typeparcs.map((typeparc) => <SelectItem key={typeparc.id} value={typeparc.id}>{typeparc.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid w-full gap-2 sm:w-48 sm:flex-none">
                <Select
                    value={parcId || "all"}
                    onValueChange={(value) => updateSelectFilter("parcId", value)}
                    disabled={pending || !typeParcId}
                >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Tous les parcs" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les parcs</SelectItem>
                        {filteredParcs.map((parc) => <SelectItem key={parc.id} value={parc.id}>{parc.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid w-full gap-2 sm:w-48 sm:flex-none">
                <Select
                    value={searchParams.get("siteId") ?? "all"}
                    onValueChange={(value) => updateSelectFilter("siteId", value)}
                    disabled={pending || !parcId}
                >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Tous les sites" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les sites</SelectItem>
                        {sites.map((site) => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
