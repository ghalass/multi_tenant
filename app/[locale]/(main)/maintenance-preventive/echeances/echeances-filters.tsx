"use client";

import {
    useMemo,
    useState,
    type FormEvent,
    type ReactElement,
} from "react";
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

type StatutEcheance =
    | "REFERENCE_MANQUANTE"
    | "COMPTEUR_INDISPONIBLE"
    | "A_VENIR"
    | "ECHEANCE_PROCHE"
    | "A_ECHEANCE"
    | "EN_RETARD";

const STATUTS: {
    value: StatutEcheance;
    label: string;
}[] = [
        { value: "REFERENCE_MANQUANTE", label: "Référence manquante" },
        { value: "COMPTEUR_INDISPONIBLE", label: "Compteur indisponible" },
        { value: "A_VENIR", label: "À venir" },
        { value: "ECHEANCE_PROCHE", label: "Échéance proche" },
        { value: "A_ECHEANCE", label: "À échéance" },
        { value: "EN_RETARD", label: "En retard" },
    ];

type Filters = {
    typeparcId?: string;
    parcId?: string;
    siteId?: string;
    statut?: StatutEcheance;
};

type FilterOptions = {
    typeparcs: { id: string; name: string }[];
    parcs: { id: string; name: string; typeparcId: string }[];
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
    initialFilters: Filters;
};

export function EcheancesFilters({
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
    const [statut, setStatut] = useState(
        initialFilters.statut ?? "",
    );

    const parcById = useMemo(
        () => new Map(options.parcs.map((parc) => [parc.id, parc])),
        [options.parcs],
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
                filteredEngins.map((engin) => engin.siteId),
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

    function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ): void {
        event.preventDefault();

        if (!typeparcId) {
            return;
        }

        const params = new URLSearchParams();

        params.set("afficherEcheances", "1");
        params.set("typeparcId", typeparcId);

        if (parcId) {
            params.set("parcId", parcId);
        }

        if (siteId) {
            params.set("siteId", siteId);
        }

        if (statut) {
            params.set("statut", statut);
        }

        router.push(`${pathname}?${params.toString()}`);
    }

    function handleReset(): void {
        setTypeparcId("");
        setParcId("");
        setSiteId("");
        setStatut("");

        router.push(pathname);
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-lg border p-4"
        >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">
                        Type de parc
                    </label>

                    <Select
                        value={typeparcId || ALL_VALUE}
                        onValueChange={(value) => {
                            handleTypeparcChange(value);
                        }}
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
                        onValueChange={(value) =>
                            setSiteId(
                                value === ALL_VALUE ? "" : value,
                            )
                        }
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
                        Statut
                    </label>

                    <Select
                        value={statut || ALL_VALUE}
                        onValueChange={(value) =>
                            setStatut(
                                value === ALL_VALUE ? "" : value,
                            )
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value={ALL_VALUE}>
                                Tous les statuts
                            </SelectItem>

                            {STATUTS.map((item) => (
                                <SelectItem
                                    key={item.value}
                                    value={item.value}
                                >
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!typeparcId}>
                    Afficher les échéances
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