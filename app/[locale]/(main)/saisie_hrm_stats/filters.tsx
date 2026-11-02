"use client";

import { useState, useTransition, type FormEvent, type JSX } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RotateCcw, Search as SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlobalLoader } from "@/components/global-loader";
import type {
  SaisieHrmStatsFilters,
  SaisieHrmStatsOptions,
} from "@/server/saisie_hrm_stats";

type Props = {
  filters: SaisieHrmStatsFilters;
  defaultMonth: string;
  options: SaisieHrmStatsOptions;
};

export default function SaisieHrmStatsFilters({
  filters,
  defaultMonth,
  options,
}: Props): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [month, setMonth] = useState(filters.month ?? defaultMonth);
  const [siteId, setSiteId] = useState(filters.siteId ?? "all");
  const [typeparcId, setTypeparcId] = useState(filters.typeparcId ?? "all");
  const [parcId, setParcId] = useState(filters.parcId ?? "all");
  const [enginId, setEnginId] = useState(filters.enginId ?? "all");
  const [error, setError] = useState("");

  const filteredParcs = options.parcs.filter((parc) => {
    const matchesType =
      typeparcId === "all" ||
      options.engins.some(
        (engin) =>
          engin.parcId === parc.id && engin.typeparcId === typeparcId,
      );
    const matchesSite =
      siteId === "all" ||
      options.engins.some(
        (engin) => engin.parcId === parc.id && engin.siteId === siteId,
      );
    return matchesType && matchesSite;
  });
  const filteredEngins = options.engins.filter(
    (engin) =>
      (siteId === "all" || engin.siteId === siteId) &&
      (typeparcId === "all" || engin.typeparcId === typeparcId) &&
      (parcId === "all" || engin.parcId === parcId),
  );

  function updateDraftFilters(
    next: Partial<{
      month: string;
      siteId: string;
      typeparcId: string;
      parcId: string;
      enginId: string;
    }>,
  ): void {
    const nextMonth = next.month ?? month;
    const nextSiteId = next.siteId ?? siteId;
    const nextTypeparcId = next.typeparcId ?? typeparcId;
    const nextParcId = next.parcId ?? parcId;
    const nextEnginId = next.enginId ?? enginId;

    setMonth(nextMonth);
    setSiteId(nextSiteId);
    setTypeparcId(nextTypeparcId);
    setParcId(nextParcId);
    setEnginId(nextEnginId);
    setError("");

    const params = new URLSearchParams();
    if (nextMonth) params.set("month", nextMonth);
    if (nextSiteId !== "all") params.set("siteId", nextSiteId);
    if (nextTypeparcId !== "all") {
      params.set("typeparcId", nextTypeparcId);
    }
    if (nextParcId !== "all") params.set("parcId", nextParcId);
    if (nextEnginId !== "all") params.set("enginId", nextEnginId);
    if (filters.perPage) params.set("perPage", filters.perPage);

    startTransition(() => {
      router.replace(
        params.size ? `${pathname}?${params.toString()}` : pathname,
        { scroll: false },
      );
    });
  }

  function applyFilters(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError("");

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      setError("Sélectionnez un mois valide.");
      return;
    }

    if (month > defaultMonth) {
      setError("Le mois sélectionné ne peut pas être dans le futur.");
      return;
    }

    const params = new URLSearchParams();
    params.set("searched", "1");
    params.set("month", month);
    if (siteId !== "all") params.set("siteId", siteId);
    if (typeparcId !== "all") params.set("typeparcId", typeparcId);
    if (parcId !== "all") params.set("parcId", parcId);
    if (enginId !== "all") params.set("enginId", enginId);
    if (filters.perPage) params.set("perPage", filters.perPage);
    params.set("currentPage", "1");

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function resetFilters(): void {
    setMonth(defaultMonth);
    setSiteId("all");
    setTypeparcId("all");
    setParcId("all");
    setEnginId("all");
    setError("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  return (
    <>
      <GlobalLoader show={pending} />
      <form
        onSubmit={applyFilters}
        className="space-y-4 rounded-lg border bg-card p-4"
      >
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="space-y-1">
            <label htmlFor="hrm-stats-month" className="text-sm font-medium">
              Mois
            </label>
            <Input
              id="hrm-stats-month"
              type="month"
              value={month}
              max={defaultMonth}
              onChange={(event) =>
                updateDraftFilters({ month: event.target.value })
              }
              required
              disabled={pending}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="hrm-stats-site" className="text-sm font-medium">
              Site
            </label>
            <Select
              value={siteId}
              onValueChange={(value) => {
                updateDraftFilters({
                  siteId: value,
                  parcId: "all",
                  enginId: "all",
                });
              }}
              disabled={pending}
            >
              <SelectTrigger id="hrm-stats-site" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Tous les sites
                </SelectItem>
                {options.sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor="hrm-stats-typeparc" className="text-sm font-medium">
              Type de parc
            </label>
            <Select
              value={typeparcId}
              onValueChange={(value) => {
                updateDraftFilters({
                  typeparcId: value,
                  parcId: "all",
                  enginId: "all",
                });
              }}
              disabled={pending}
            >
              <SelectTrigger id="hrm-stats-typeparc" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Tous les types
                </SelectItem>
                {options.typeParcs.map((typeParc) => (
                  <SelectItem key={typeParc.id} value={typeParc.id}>
                    {typeParc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor="hrm-stats-parc" className="text-sm font-medium">
              Parc
            </label>
            <Select
              value={parcId}
              onValueChange={(value) => {
                updateDraftFilters({ parcId: value, enginId: "all" });
              }}
              disabled={pending}
            >
              <SelectTrigger id="hrm-stats-parc" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Tous les parcs
                </SelectItem>
                {filteredParcs.map((parc) => (
                  <SelectItem key={parc.id} value={parc.id}>
                    {parc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor="hrm-stats-search" className="text-sm font-medium">
              Engin
            </label>
            <Select
              value={enginId}
              onValueChange={(value) =>
                updateDraftFilters({ enginId: value })
              }
              disabled={pending}
            >
              <SelectTrigger id="hrm-stats-search" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Tous les engins
                </SelectItem>
                {filteredEngins.map((engin) => (
                  <SelectItem key={engin.id} value={engin.id}>
                    {engin.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            <SearchIcon className="size-4" />
            Rechercher
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
            disabled={pending}
          >
            <RotateCcw className="size-4" />
            Réinitialiser
          </Button>
        </div>
      </form>
    </>
  );
}
