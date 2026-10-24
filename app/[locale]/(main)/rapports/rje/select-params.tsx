"use client";

import { GlobalLoader } from '@/components/global-loader';
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Parc, Site } from '@/lib/generated/prisma/client';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export default function SelectParams({ parcs, sites }: { parcs: Parc[], sites: Site[] }) {
    const [isPending, startTransition] = useTransition();

    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    // Gestion du changement de date
    const handleFilterChange = useDebouncedCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        startTransition(() => {
            replace(`${pathname}?${params.toString()}`);
        });
    }, 300);
    return (
        <>
            <GlobalLoader show={isPending} />

            <div className="flex items-center justify-center gap-2">
                <Input
                    type="date"
                    value={searchParams.get("date") ?? ""}
                    onChange={(e) => handleFilterChange("date", e.target.value)}
                    className="h-9 w-45"
                    disabled={isPending}
                />

                <Select
                    value={searchParams.get("parc") ?? ""}
                    onValueChange={(value) => handleFilterChange("parc", value)}
                    disabled={isPending}
                >
                    <SelectTrigger className="h-9 w-45">
                        <SelectValue placeholder="Parc" />
                    </SelectTrigger>
                    <SelectContent>
                        {parcs.map((parc) => (
                            <SelectItem key={parc.id} value={parc.name}>
                                {parc.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={searchParams.get("site") ?? ""}
                    onValueChange={(value) => handleFilterChange("site", value)}
                    disabled={isPending}
                >
                    <SelectTrigger className="h-9 w-45">
                        <SelectValue placeholder="Site" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={''}>
                            --- Tout
                        </SelectItem>
                        {sites.map((site) => (
                            <SelectItem key={site.id} value={site.name}>
                                {site.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

        </>

    )
}
