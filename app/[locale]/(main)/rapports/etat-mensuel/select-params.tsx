
"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GlobalLoader } from "@/components/global-loader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SelectParams() {
    const [isPending, startTransition] = useTransition();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const mois = searchParams.get("mois") ?? "";
    const annee = searchParams.get("annee") ?? "";

    const monthValue =
        mois && annee
            ? `${annee}-${mois.padStart(2, "0")}`
            : "";

    function applyMonth(value: string) {
        const params = new URLSearchParams(searchParams.toString());

        if (!value) {
            params.delete("mois");
            params.delete("annee");
        } else {
            const [selectedYear, selectedMonth] = value.split("-");

            params.set("annee", selectedYear);
            params.set("mois", selectedMonth);
        }

        const query = params.toString();

        startTransition(() => {
            router.replace(query ? `${pathname}?${query}` : pathname);
        });
    }

    return (
        <>
            <GlobalLoader show={isPending} />

            <div className="mb-4 flex flex-wrap items-end gap-3">
                <div className="w-full max-w-xs space-y-2">
                    <Label htmlFor="etat-mensuel-date">
                        Mois et année
                    </Label>
                    <Input
                        id="etat-mensuel-date"
                        type="month"
                        value={monthValue}
                        onChange={(event) => applyMonth(event.target.value)}
                        disabled={isPending}
                        className="w-full"
                    />
                </div>

                <p className="pb-2 text-sm text-muted-foreground">
                    Le rapport comprend les résultats du mois sélectionné
                    et le cumul depuis janvier.
                </p>
            </div>
        </>
    );
}
