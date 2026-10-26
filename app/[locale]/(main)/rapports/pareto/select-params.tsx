"use client";

import { useState, useTransition } from "react";

import {
    usePathname,
    useRouter,
    useSearchParams,
} from "next/navigation";

import { GlobalLoader } from "@/components/global-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import type {
    TypeParcParetoOption,
} from "@/server/rapports/rapport_pareto";

type SelectParamsProps = {
    typeParcs: TypeParcParetoOption[];
};

export default function SelectParams({
    typeParcs,
}: SelectParamsProps) {
    const [isPending, startTransition] = useTransition();

    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const initialMois = searchParams.get("mois") ?? "";
    const initialAnnee = searchParams.get("annee") ?? "";

    const [monthValue, setMonthValue] = useState(
        initialMois && initialAnnee
            ? `${initialAnnee}-${initialMois.padStart(2, "0")}`
            : "",
    );

    const [typeParcId, setTypeParcId] = useState(
        searchParams.get("typeParcId") ?? "",
    );

    const [parcId, setParcId] = useState(
        searchParams.get("parcId") ?? "",
    );

    const [siteId, setSiteId] = useState(
        searchParams.get("siteId") ?? "",
    );

    const [enginId, setEnginId] = useState(
        searchParams.get("enginId") ?? "",
    );

    const parcs =
        typeParcs.find(
            (typeParc) => typeParc.id === typeParcId,
        )?.parcs ?? [];

    const selectedParc = parcs.find(
        (parc) => parc.id === parcId,
    );

    const sites = selectedParc
        ? Array.from(
            new Map(
                selectedParc.engins.map((engin) => [
                    engin.siteId,
                    {
                        id: engin.siteId,
                        name: engin.siteName,
                    },
                ]),
            ).values(),
        ).sort((a, b) =>
            a.name.localeCompare(b.name, "fr", {
                numeric: true,
            }),
        )
        : [];

    const enginsDuSite =
        selectedParc && siteId
            ? selectedParc.engins
                .filter((engin) => engin.siteId === siteId)
                .sort((a, b) =>
                    a.name.localeCompare(b.name, "fr", {
                        numeric: true,
                    }),
                )
            : [];

    const selectedSite = sites.find(
        (site) => site.id === siteId,
    );

    const selectedEngin = enginsDuSite.find(
        (engin) => engin.id === enginId,
    );

    function clearReportParams() {
        const params = new URLSearchParams(
            searchParams.toString(),
        );

        params.delete("mois");
        params.delete("annee");
        params.delete("typeParcId");
        params.delete("parcId");
        params.delete("siteId");
        params.delete("enginId");

        const query = params.toString();
        const url = query
            ? `${pathname}?${query}`
            : pathname;

        startTransition(() => {
            router.replace(url, { scroll: false });
        });
    }

    function handleMonthChange(value: string) {
        setMonthValue(value);
        clearReportParams();
    }

    function handleTypeParcChange(value: string) {
        setTypeParcId(value);
        setParcId("");
        setSiteId("");
        setEnginId("");
        clearReportParams();
    }

    function handleParcChange(value: string) {
        setParcId(value);
        setSiteId("");
        setEnginId("");
        clearReportParams();
    }

    function handleSiteChange(value: string) {
        setSiteId(value === "all" ? "" : value);
        setEnginId("");
        clearReportParams();
    }

    function handleEnginChange(value: string) {
        setEnginId(value === "all" ? "" : value);
        clearReportParams();
    }

    function generateReport() {
        if (!monthValue || !typeParcId || !parcId) {
            return;
        }

        /*
         * Un engin ne peut être sélectionné que lorsqu'un site
         * est choisi et que cet engin appartient à ce site.
         */
        if (
            enginId &&
            (!siteId ||
                !enginsDuSite.some(
                    (engin) => engin.id === enginId,
                ))
        ) {
            return;
        }

        const [annee, mois] = monthValue.split("-");

        if (!annee || !mois) {
            return;
        }

        const params = new URLSearchParams(
            searchParams.toString(),
        );

        params.set("annee", annee);
        params.set("mois", String(Number(mois)));
        params.set("typeParcId", typeParcId);
        params.set("parcId", parcId);

        if (siteId) {
            params.set("siteId", siteId);
        } else {
            params.delete("siteId");
        }

        if (enginId) {
            params.set("enginId", enginId);
        } else {
            params.delete("enginId");
        }

        startTransition(() => {
            router.replace(
                `${pathname}?${params.toString()}`,
                { scroll: false },
            );
        });
    }

    return (
        <>
            <GlobalLoader show={isPending} />

            <div className="mb-3 flex flex-wrap items-end gap-2">
                <div className="w-full space-y-2 sm:w-48">
                    <Label htmlFor="pareto-date">
                        Mois et année
                    </Label>

                    <Input
                        id="pareto-date"
                        type="month"
                        value={monthValue}
                        onChange={(event) =>
                            handleMonthChange(event.target.value)
                        }
                        disabled={isPending}
                        className="w-full"
                    />
                </div>

                <div className="w-full space-y-2 sm:w-56">
                    <Label>Type de parc</Label>

                    <Select
                        value={typeParcId}
                        onValueChange={handleTypeParcChange}
                        disabled={
                            isPending ||
                            typeParcs.length === 0
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choisir un type de parc" />
                        </SelectTrigger>

                        <SelectContent>
                            {typeParcs.map((typeParc) => (
                                <SelectItem
                                    key={typeParc.id}
                                    value={typeParc.id}
                                >
                                    {typeParc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full space-y-2 sm:w-56">
                    <Label>Parc</Label>

                    <Select
                        value={parcId}
                        onValueChange={handleParcChange}
                        disabled={
                            isPending ||
                            !typeParcId ||
                            parcs.length === 0
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choisir un parc" />
                        </SelectTrigger>

                        <SelectContent>
                            {parcs.map((parc) => (
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

                <div className="w-full space-y-2 sm:w-48">
                    <Label>Site (optionnel)</Label>

                    <Select
                        value={siteId || "all"}
                        onValueChange={handleSiteChange}
                        disabled={
                            isPending ||
                            !parcId ||
                            sites.length === 0
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Tous les sites" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="all">
                                Tous les sites
                            </SelectItem>

                            {sites.map((site) => (
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

                <div className="w-full space-y-2 sm:w-48">
                    <Label>Engin (optionnel)</Label>

                    <Select
                        value={enginId || "all"}
                        onValueChange={handleEnginChange}
                        disabled={
                            isPending ||
                            !siteId ||
                            enginsDuSite.length === 0
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Tous les engins" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="all">
                                Tous les engins
                            </SelectItem>

                            {enginsDuSite.map((engin) => (
                                <SelectItem
                                    key={engin.id}
                                    value={engin.id}
                                >
                                    {engin.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    type="button"
                    onClick={generateReport}
                    disabled={
                        isPending ||
                        !monthValue ||
                        !typeParcId ||
                        !parcId
                    }
                >
                    Générer les rapports
                </Button>

                {selectedParc && (
                    <p className="w-full text-xs text-muted-foreground">
                        {enginId && selectedEngin
                            ? `Rapport limité à l'engin ${selectedEngin.name}.`
                            : siteId && selectedSite
                                ? `${enginsDuSite.length} engin(s) actif(s) dans le site ${selectedSite.name}.`
                                : `${selectedParc.engins.length} engin(s) actif(s) dans ce parc.`}
                    </p>
                )}
            </div>
        </>
    );
}