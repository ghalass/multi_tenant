"use client";

import { Input } from '@/components/ui/input';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';

export default function SelectParams(): import("react").JSX.Element {
    const [isPending, startTransition] = useTransition();

    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    // Mise à jour immédiate d'un ou plusieurs params (pas de debounce :
    // inutile pour Select et input type="month")
    const applyFilter = (updates: Record<string, string | null>): void => {
        const params = new URLSearchParams(searchParams);
        for (const [key, value] of Object.entries(updates)) {
            if (value) params.set(key, value);
            else params.delete(key);
        }
        startTransition(() => {
            replace(`${pathname}?${params.toString()}`);
        });
    };

    // Reconstruit "YYYY-MM" à partir des deux params séparés
    const moisParam = searchParams.get("mois") ?? "";
    const anneeParam = searchParams.get("annee") ?? "";
    const monthValue = moisParam && anneeParam ? `${anneeParam}-${moisParam}` : "";

    return (
        <>
            <div className="flex items-center justify-center gap-2">
                <Input
                    type="month"
                    value={monthValue}
                    onChange={(e) => {
                        const value = e.target.value; // "2026-10" ou "" si effacé
                        if (!value) {
                            applyFilter({ mois: null, annee: null });
                            return;
                        }
                        const [annee, mois] = value.split("-");
                        applyFilter({ annee, mois });
                    }}
                    className="h-9 w-45"
                    disabled={isPending}
                />
            </div>
        </>
    );
}