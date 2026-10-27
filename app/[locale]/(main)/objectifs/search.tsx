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

export default function SearchObjectifs({
    sites,
    parcs,
}: {
    sites: Option[];
    parcs: Option[];
}): JSX.Element {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [annee, setAnnee] = useState(searchParams.get("annee") ?? "");

    const updateFilter = useDebouncedCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== "all") params.set(key, value);
        else params.delete(key);
        params.delete("currentPage");
        startTransition(() => router.replace(`${pathname}?${params.toString()}`));
    }, 300);

    return (
        <div className="mb-5 mt-2 grid gap-3 sm:grid-cols-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="number"
                    min={1900}
                    max={9999}
                    placeholder="Filtrer par année..."
                    value={annee}
                    onChange={(event) => {
                        const value = event.target.value;
                        setAnnee(value);
                        updateFilter("annee", value);
                    }}
                    disabled={pending}
                    className="pl-9"
                />
            </div>

            <Select
                value={searchParams.get("siteId") ?? "all"}
                onValueChange={(value) => updateFilter("siteId", value)}
                disabled={pending}
            >
                <SelectTrigger><SelectValue placeholder="Tous les sites" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tous les sites</SelectItem>
                    {sites.map((site) => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}
                </SelectContent>
            </Select>

            <Select
                value={searchParams.get("parcId") ?? "all"}
                onValueChange={(value) => updateFilter("parcId", value)}
                disabled={pending}
            >
                <SelectTrigger><SelectValue placeholder="Tous les parcs" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tous les parcs</SelectItem>
                    {parcs.map((parc) => <SelectItem key={parc.id} value={parc.id}>{parc.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    );
}
