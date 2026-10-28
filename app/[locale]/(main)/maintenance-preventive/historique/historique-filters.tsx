"use client";

import {
    useMemo,
    useState,
    type FormEvent,
    type ReactElement,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const ALL_VALUE = "__tous__";

type HistoriqueFilters = {
    typeparcId?: string;
    parcId?: string;
    siteId?: string;
    dateDebut?: string;
    dateFin?: string;
    enginId?: string;
};

type FilterOptions = {
    typeparcs: { id: string; name: string }[];
    parcs: {
        id: string;
        name: string;
        typeparcId: string;
    }[];
    sites: { id: string; name: string }[];
    engins: {
        id: string;
        name: string;
        parcId: string;
        siteId: string;
    }[];
};

type Props = {
    options: FilterOptions;
    initialFilters: HistoriqueFilters;
};

export function HistoriqueFilters({
    options,
    initialFilters,
}: Props): ReactElement {
    const router = useRouter();
    const pathname = usePathname();

    const [typeparcId, setTypeparcId] = useState(
        initialFilters.typeparcId ?? "",
    );
    const [parcId, setParcId] = useState(
        initialFilters.parcId ?? "",
    );
    const [siteId, setSiteId] = useState(
        initialFilters.siteId ?? "",
    );
    const [dateDebut, setDateDebut] = useState(
        initialFilters.dateDebut ?? "",
    );
    const [dateFin, setDateFin] = useState(
        initialFilters.dateFin ?? "",
    );

    const [enginId, setEnginId] = useState(
        initialFilters.enginId ?? "",
    );

    const filteredParcs = useMemo(
        () =>
            options.parcs.filter(
                (parc) =>
                    !typeparcId ||
                    parc.typeparcId === typeparcId,
            ),
        [options.parcs, typeparcId],
    );

    const parcById = useMemo(
        () => new Map(options.parcs.map((parc) => [parc.id, parc])),
        [options.parcs],
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

    const filteredEnginsForSelect = useMemo(
        () =>
            filteredEngins.filter(
                (engin) =>
                    !siteId || engin.siteId === siteId,
            ),
        [filteredEngins, siteId],
    );

    const availableSiteIds = useMemo(
        () => new Set(filteredEngins.map((engin) => engin.siteId)),
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
        setEnginId("");
    }

    function handleParcChange(value: string): void {
        setParcId(value === ALL_VALUE ? "" : value);
        setSiteId("");
        setEnginId("");
    }

    function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ): void {
        event.preventDefault();

        if (!typeparcId) {
            return;
        }


        if (dateDebut && dateFin && dateDebut > dateFin) {
            return;
        }

        const params = new URLSearchParams();

        params.set("afficherHistorique", "1");
        params.set("typeparcId", typeparcId);

        if (parcId) params.set("parcId", parcId);
        if (siteId) params.set("siteId", siteId);
        if (dateDebut) params.set("dateDebut", dateDebut);
        if (dateFin) params.set("dateFin", dateFin);
        if (enginId) params.set("enginId", enginId);

        router.push(`${pathname}?${params.toString()}`);
    }

    function handleReset(): void {
        setTypeparcId("");
        setParcId("");
        setSiteId("");
        setDateDebut("");
        setDateFin("");
        setEnginId("");

        router.push(pathname);
    }

    function handleSiteChange(value: string): void {
        const nextSiteId =
            value === ALL_VALUE ? "" : value;

        setSiteId(nextSiteId);

        if (nextSiteId && enginId) {
            const selectedEngin = options.engins.find(
                (engin) => engin.id === enginId,
            );

            if (selectedEngin?.siteId !== nextSiteId) {
                setEnginId("");
            }
        }
    }

    const periodeInvalide =
        Boolean(dateDebut && dateFin && dateDebut > dateFin);

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-lg border p-4"
        >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                    <label className="text-sm font-medium">
                        Type de parc
                    </label>

                    <Select
                        value={typeparcId || ALL_VALUE}
                        onValueChange={handleTypeparcChange}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Choisir un type" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value={ALL_VALUE}>
                                Choisir un type
                            </SelectItem>

                            {options.typeparcs.map((item) => (
                                <SelectItem
                                    key={item.id}
                                    value={item.id}
                                >
                                    {item.name}
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

                            {filteredParcs.map((item) => (
                                <SelectItem
                                    key={item.id}
                                    value={item.id}
                                >
                                    {item.name}
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

                            {filteredSites.map((item) => (
                                <SelectItem
                                    key={item.id}
                                    value={item.id}
                                >
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">
                        Engin
                    </label>

                    <Select
                        value={enginId || ALL_VALUE}
                        onValueChange={(value) =>
                            setEnginId(
                                value === ALL_VALUE ? "" : value,
                            )
                        }
                        disabled={!typeparcId}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Tous les engins" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value={ALL_VALUE}>
                                Tous les engins
                            </SelectItem>

                            {filteredEnginsForSelect.map((item) => (
                                <SelectItem
                                    key={item.id}
                                    value={item.id}
                                >
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="historique-date-debut"
                        className="text-sm font-medium"
                    >
                        Date de début
                    </label>

                    <Input
                        id="historique-date-debut"
                        type="date"
                        value={dateDebut}
                        max={dateFin || undefined}
                        onChange={(event) =>
                            setDateDebut(event.target.value)
                        }
                    />
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="historique-date-fin"
                        className="text-sm font-medium"
                    >
                        Date de fin
                    </label>

                    <Input
                        id="historique-date-fin"
                        type="date"
                        value={dateFin}
                        min={dateDebut || undefined}
                        onChange={(event) =>
                            setDateFin(event.target.value)
                        }
                    />
                </div>
            </div>

            {periodeInvalide && (
                <p className="text-sm text-destructive">
                    La date de début doit être antérieure ou égale à
                    la date de fin.
                </p>
            )}

            <div className="flex flex-wrap gap-2">
                <Button
                    type="submit"
                    disabled={!typeparcId || periodeInvalide}
                >
                    Afficher l&apos;historique
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