"use client";

import {
    useState,
    useTransition,
    type FormEvent,
    type JSX,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type {
    BacklogOptions,
    BacklogStatsFilters,
} from "@/lib/types/backlog";

type Props = {
    options: BacklogOptions;
    filters: BacklogStatsFilters;
    dateFrom: string;
    dateTo: string;
};

export default function BacklogStatsFiltersForm({
    options,
    filters,
    dateFrom,
    dateTo,
}: Props): JSX.Element {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [pending, startTransition] = useTransition();
    const [typeparcId, setTypeparcId] = useState(filters.typeparcId || "all");
    const [parcId, setParcId] = useState(filters.parcId || "all");
    const [enginId, setEnginId] = useState(filters.enginId || "all");
    const [siteId, setSiteId] = useState(filters.siteId || "all");

    const parcs = options.parcs.filter(
        (parc) => typeparcId === "all" || parc.typeparcId === typeparcId,
    );
    const engins = options.engins.filter((engin) => {
        const parcMatches = parcId !== "all"
            ? engin.parcId === parcId
            : typeparcId === "all" ||
                parcs.some((parc) => parc.id === engin.parcId);
        const siteMatches = siteId === "all" || engin.siteId === siteId;

        return parcMatches && siteMatches;
    });

    function navigateWithParams(params: URLSearchParams): void {
        const query = params.toString();
        if (query === searchParams.toString()) return;

        startTransition(() => {
            router.push(query ? `${pathname}?${query}` : pathname);
        });
    }

    function runAnalysis(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const params = new URLSearchParams(searchParams.toString());

        for (const key of [
            "dateFrom",
            "dateTo",
            "typeparcId",
            "parcId",
            "enginId",
            "siteId",
        ]) {
            params.delete(key);
        }

        for (const key of [
            "dateFrom",
            "dateTo",
            "typeparcId",
            "parcId",
            "enginId",
            "siteId",
        ]) {
            const value = String(formData.get(key) ?? "");
            if (value) params.set(key, value);
        }

        params.delete("global");
        navigateWithParams(params);
    }

    function runGlobalAnalysis(): void {
        const params = new URLSearchParams(searchParams.toString());
        for (const key of [
            "dateFrom",
            "dateTo",
            "typeparcId",
            "parcId",
            "enginId",
            "siteId",
        ]) {
            params.delete(key);
        }
        params.set("global", "1");

        navigateWithParams(params);
    }

    return (
        <form
            onSubmit={runAnalysis}
            className="flex flex-wrap items-end gap-2"
        >
            {pending && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-background/60"
                    role="status"
                    aria-label="Analyse en cours"
                >
                    <Spinner className="size-8 text-primary" />
                </div>
            )}
            <label className="grid gap-1 text-sm">
                <span>Date du</span>
                <Input
                    className="w-auto"
                    type="date"
                    name="dateFrom"
                    defaultValue={dateFrom}
                    required
                    disabled={pending}
                />
            </label>
            <label className="grid gap-1 text-sm">
                <span>Au</span>
                <Input
                    className="w-auto"
                    type="date"
                    name="dateTo"
                    defaultValue={dateTo}
                    required
                    disabled={pending}
                />
            </label>

            <input
                type="hidden"
                name="typeparcId"
                value={typeparcId === "all" ? "" : typeparcId}
            />
            <label className="grid gap-1 text-sm">
                <span>Type de parc</span>
                <Select
                    value={typeparcId}
                    disabled={pending}
                    onValueChange={(value) => {
                        setTypeparcId(value);
                        setParcId("all");
                        setEnginId("all");
                    }}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        {options.typeparcs.map((typeparc) => (
                            <SelectItem key={typeparc.id} value={typeparc.id}>
                                {typeparc.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </label>

            <input
                type="hidden"
                name="parcId"
                value={parcId === "all" ? "" : parcId}
            />
            <label className="grid gap-1 text-sm">
                <span>Parc</span>
                <Select
                    value={parcId}
                    disabled={pending}
                    onValueChange={(value) => {
                        setParcId(value);
                        setEnginId("all");
                    }}
                >
                    <SelectTrigger disabled={parcs.length === 0}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les parcs</SelectItem>
                        {parcs.map((parc) => (
                            <SelectItem key={parc.id} value={parc.id}>
                                {parc.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </label>

            <input
                type="hidden"
                name="enginId"
                value={enginId === "all" ? "" : enginId}
            />
            <label className="grid gap-1 text-sm">
                <span>Engin</span>
                <Select
                    value={enginId}
                    disabled={pending}
                    onValueChange={setEnginId}
                >
                    <SelectTrigger disabled={engins.length === 0}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les engins</SelectItem>
                        {engins.map((engin) => (
                            <SelectItem key={engin.id} value={engin.id}>
                                {engin.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </label>

            <input
                type="hidden"
                name="siteId"
                value={siteId === "all" ? "" : siteId}
            />
            <label className="grid gap-1 text-sm">
                <span>Site</span>
                <Select
                    value={siteId}
                    disabled={pending}
                    onValueChange={(value) => {
                        setSiteId(value);
                        setEnginId("all");
                    }}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les sites</SelectItem>
                        {options.sites.map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                                {site.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </label>

            <Button type="submit" disabled={pending}>
                Analyser la période
            </Button>
            <Button
                type="button"
                onClick={runGlobalAnalysis}
                variant="outline"
                disabled={pending}
            >
                Calcul global
            </Button>
        </form>
    );
}
