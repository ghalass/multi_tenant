"use client";

import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const ALL_VALUE = "__tous__";

type Filters = {
    typeparcId?: string;
    parcId?: string;
    siteId?: string;
};

type FilterOptions = {
    typeparcs: {
        id: string;
        name: string;
    }[];
    parcs: {
        id: string;
        name: string;
        typeparcId: string;
    }[];
    sites: {
        id: string;
        name: string;
    }[];
    engins: {
        id: string;
        name: string;
        parcId: string;
        siteId: string | null;
    }[];
};

type Props = {
    options: FilterOptions;
    initialFilters: Filters;
};

export function CompteursReferenceFilters({
    options,
    initialFilters,
}: Props): ReactElement {
    const router = useRouter();
    const pathname = usePathname();

    const [typeparcId, setTypeparcId] = useState(
        initialFilters.typeparcId ?? "",
    );
    const [parcId, setParcId] = useState(initialFilters.parcId ?? "");
    const [siteId, setSiteId] = useState(initialFilters.siteId ?? "");

    const parcById = useMemo(
        () => new Map(options.parcs.map((parc) => [parc.id, parc])),
        [options.parcs],
    );

    const filteredParcs = useMemo(
        () =>
            options.parcs.filter(
                (parc) =>
                    !typeparcId || parc.typeparcId === typeparcId,
            ),
        [options.parcs, typeparcId],
    );

    const filteredEngins = useMemo(
        () =>
            options.engins.filter((engin) => {
                const parc = parcById.get(engin.parcId);

                return (
                    (!typeparcId ||
                        parc?.typeparcId === typeparcId) &&
                    (!parcId || engin.parcId === parcId)
                );
            }),
        [options.engins, parcById, typeparcId, parcId],
    );

    const availableSiteIds = useMemo(
        () =>
            new Set(
                filteredEngins
                    .map((engin) => engin.siteId)
                    .filter((id): id is string => Boolean(id)),
            ),
        [filteredEngins],
    );

    const filteredSites = useMemo(
        () =>
            options.sites.filter((site) =>
                availableSiteIds.has(site.id),
            ),
        [options.sites, availableSiteIds],
    );

    function handleTypeparcChange(value: string): void {
        setTypeparcId(value === ALL_VALUE ? "" : value);
        setParcId("");
        setSiteId("");
    }

    function handleParcChange(value: string): void {
        setParcId(value === ALL_VALUE ? "" : value);
        setSiteId("");
    }

    function handleSiteChange(value: string): void {
        setSiteId(value === ALL_VALUE ? "" : value);
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        if (!typeparcId) {
            return;
        }

        const params = new URLSearchParams();

        params.set("afficherCompteurs", "1");
        params.set("typeparcId", typeparcId);

        if (parcId) {
            params.set("parcId", parcId);
        }

        if (siteId) {
            params.set("siteId", siteId);
        }

        router.push(`${pathname}?${params.toString()}`);
    }

    function handleReset(): void {
        setTypeparcId("");
        setParcId("");
        setSiteId("");

        router.push(pathname);
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-lg border p-4"
        >
            <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                    <label className="text-sm font-medium">
                        Type de parc
                    </label>

                    <Select
                        value={typeparcId || ALL_VALUE}
                        onValueChange={handleTypeparcChange}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value={ALL_VALUE}>
                                Sélectionner un type
                            </SelectItem>

                            {options.typeparcs.map((typeparc) => (
                                <SelectItem
                                    key={typeparc.id}
                                    value={typeparc.id}
                                >
                                    {typeparc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">
                        Parc
                    </label>

                    <Select
                        value={parcId || ALL_VALUE}
                        onValueChange={handleParcChange}
                        disabled={!typeparcId}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Tous les parcs" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value={ALL_VALUE}>
                                Tous les parcs
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
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">
                        Site
                    </label>

                    <Select
                        value={siteId || ALL_VALUE}
                        onValueChange={handleSiteChange}
                        disabled={!parcId}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Tous les sites" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value={ALL_VALUE}>
                                Tous les sites
                            </SelectItem>

                            {filteredSites.map((site) => (
                                <SelectItem
                                    key={site.id}
                                    value={site.id}
                                >
                                    {site.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!typeparcId}>
                    Afficher les compteurs
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                >
                    Réinitialiser
                </Button>
            </div>
        </form>
    );
}