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

import type { RapportRjeOptions } from "@/server/rapports/rapport_rje";

type SelectParamsProps = RapportRjeOptions;

export default function SelectParams({
    typeParcs,
    sites,
}: SelectParamsProps) {
    const [isPending, startTransition] = useTransition();

    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const [date, setDate] = useState(
        searchParams.get("date") ?? "",
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

    const parcs =
        typeParcs.find((typeParc) => typeParc.id === typeParcId)
            ?.parcs ?? [];

    /**
     * Efface les critères validés dans l'URL afin de masquer
     * l'ancien rapport jusqu'au prochain clic sur Générer.
     *
     * La valeur saisie dans les contrôles reste dans l'état local.
     */
    function clearReportFromUrl(newDate?: string) {
        const params = new URLSearchParams(searchParams.toString());

        params.delete("typeParcId");
        params.delete("parcId");
        params.delete("siteId");

        // Supprimer également les anciens paramètres par nom.
        params.delete("parc");
        params.delete("site");

        if (newDate !== undefined) {
            if (newDate) {
                params.set("date", newDate);
            } else {
                params.delete("date");
            }
        }

        const query = params.toString();
        const url = query ? `${pathname}?${query}` : pathname;

        startTransition(() => {
            router.replace(url, { scroll: false });
        });
    }

    function handleDateChange(value: string) {
        setDate(value);
        clearReportFromUrl(value);
    }

    function handleTypeParcChange(value: string) {
        setTypeParcId(value);
        setParcId("");
        setSiteId("");

        clearReportFromUrl();
    }

    function handleParcChange(value: string) {
        setParcId(value);
        setSiteId("");

        clearReportFromUrl();
    }

    function handleSiteChange(value: string) {
        setSiteId(value === "all" ? "" : value);

        clearReportFromUrl();
    }

    function generateReport() {
        if (!date || !typeParcId || !parcId) {
            return;
        }

        const params = new URLSearchParams(searchParams.toString());

        params.set("date", date);
        params.set("typeParcId", typeParcId);
        params.set("parcId", parcId);

        if (siteId) {
            params.set("siteId", siteId);
        } else {
            params.delete("siteId");
        }

        // Supprimer les anciens filtres par nom.
        params.delete("parc");
        params.delete("site");

        // Le rapport RJE ne possède pas de filtre de pagination ici.
        params.delete("currentPage");
        params.delete("itemsPerPage");

        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`, {
                scroll: false,
            });
        });
    }

    return (
        <>
            <GlobalLoader show={isPending} />

            <div className="mb-5 flex flex-wrap items-end gap-3">
                <div className="w-full space-y-2 sm:w-44">
                    <Label htmlFor="rje-date">Date</Label>

                    <Input
                        id="rje-date"
                        type="date"
                        value={date}
                        onChange={(event) =>
                            handleDateChange(event.target.value)
                        }
                        disabled={isPending}
                        className="w-full"
                    />
                </div>

                <div className="w-full space-y-2 sm:w-56">
                    <Label>Type de parc</Label>

                    <Select
                        value={typeParcId || undefined}
                        onValueChange={handleTypeParcChange}
                        disabled={isPending || typeParcs.length === 0}
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

                <div className="w-full space-y-2 sm:w-52">
                    <Label>Parc</Label>

                    <Select
                        value={parcId || undefined}
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
                                <SelectItem key={parc.id} value={parc.id}>
                                    {parc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full space-y-2 sm:w-48">
                    <Label>Site (facultatif)</Label>

                    <Select
                        value={siteId || "all"}
                        onValueChange={handleSiteChange}
                        disabled={isPending || sites.length === 0}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Tous les sites" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="all">
                                Tous les sites
                            </SelectItem>

                            {sites.map((site) => (
                                <SelectItem key={site.id} value={site.id}>
                                    {site.name}
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
                        !date ||
                        !typeParcId ||
                        !parcId
                    }
                >
                    Générer le rapport
                </Button>
            </div>
        </>
    );
}