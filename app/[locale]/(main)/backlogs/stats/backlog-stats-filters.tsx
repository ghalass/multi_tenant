"use client";

import { useState, type JSX } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

    return (
        <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-sm">
                <span>Date du</span>
                <Input
                    className="w-auto"
                    type="date"
                    name="dateFrom"
                    defaultValue={dateFrom}
                    required
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

            <Button type="submit">Analyser la période</Button>
            <Button
                type="submit"
                name="global"
                value="1"
                variant="outline"
                formNoValidate
            >
                Calcul global
            </Button>
        </form>
    );
}
