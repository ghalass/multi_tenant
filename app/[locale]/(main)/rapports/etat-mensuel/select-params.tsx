"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

type EnginOption = {
    id: string;
    name: string;
};

type ParcOption = {
    id: string;
    name: string;
    engins: EnginOption[];
};

type TypeParcOption = {
    id: string;
    name: string;
    parcs: ParcOption[];
};

type SelectParamsProps = {
    typeParcs: TypeParcOption[];
};

export default function SelectParams({ typeParcs }: SelectParamsProps) {
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

    const parcs =
        typeParcs.find((typeParc) => typeParc.id === typeParcId)?.parcs ?? [];

    const selectedParc = parcs.find((parc) => parc.id === parcId);

    /**
     * Supprime les paramètres du rapport dès qu'un filtre change.
     * Le tableau disparaît immédiatement après la mise à jour de l'URL.
     */
    function clearReportParams() {
        const params = new URLSearchParams(searchParams.toString());

        params.delete("mois");
        params.delete("annee");
        params.delete("typeParcId");
        params.delete("parcId");
        params.delete("enginId");

        const query = params.toString();
        const url = query ? `${pathname}?${query}` : pathname;

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
        clearReportParams();
    }

    function handleParcChange(value: string) {
        setParcId(value);
        clearReportParams();
    }

    function generateReport() {
        if (!monthValue || !typeParcId || !parcId) return;

        const [annee, mois] = monthValue.split("-");
        const params = new URLSearchParams(searchParams.toString());

        params.set("annee", annee);
        params.set("mois", String(Number(mois)));
        params.set("typeParcId", typeParcId);
        params.set("parcId", parcId);

        // Aucun filtre individuel par engin.
        params.delete("enginId");

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
                <div className="w-full space-y-2 sm:w-48">
                    <Label htmlFor="etat-mensuel-date">
                        Mois et année
                    </Label>

                    <Input
                        id="etat-mensuel-date"
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
                                <SelectItem key={parc.id} value={parc.id}>
                                    {parc.name}
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
                    Générer le rapport
                </Button>

                {selectedParc && (
                    <p className="w-full text-sm text-muted-foreground">
                        {selectedParc.engins.length} engin(s) actif(s) dans ce parc.
                    </p>
                )}
            </div>
        </>
    );
}