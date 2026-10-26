
"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { GlobalLoader } from "@/components/global-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SelectParams() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const initialMois = searchParams.get("mois") ?? "";
    const initialAnnee = searchParams.get("annee") ?? "";

    const [monthValue, setMonthValue] = useState(
        initialMois && initialAnnee
            ? `${initialAnnee}-${initialMois.padStart(2, "0")}`
            : "",
    );

    function clearReportParams() {
        const params = new URLSearchParams(searchParams.toString());

        params.delete("mois");
        params.delete("annee");

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

    function generateReport() {
        if (!monthValue) return;

        const [annee, mois] = monthValue.split("-");
        if (!annee || !mois) return;

        const params = new URLSearchParams(searchParams.toString());

        params.set("annee", annee);
        params.set("mois", String(Number(mois)));

        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`, {
                scroll: false,
            });
        });
    }

    return (
        <>
            <GlobalLoader show={isPending} />

            <div className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border p-4">
                <div className="w-full space-y-2 sm:w-56">
                    <Label htmlFor="analyse-indispo-date">
                        Mois et année
                    </Label>

                    <Input
                        id="analyse-indispo-date"
                        type="month"
                        value={monthValue}
                        onChange={(event) =>
                            handleMonthChange(event.target.value)
                        }
                        disabled={isPending}
                        className="w-full"
                    />
                </div>

                <Button
                    type="button"
                    onClick={generateReport}
                    disabled={isPending || !monthValue}
                >
                    Générer le rapport
                </Button>
            </div>
        </>
    );
}
