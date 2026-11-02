"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { JSX } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/locales/client";

type Props = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
};

const PER_PAGE_OPTIONS = [5, 10, 20, 50, 100];

export default function SaisieHrmStatsPagination({
  currentPage,
  totalPages,
  totalItems,
  perPage,
}: Props): JSX.Element {
  const t = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const previousParams = new URLSearchParams(searchParams.toString());
  previousParams.set("currentPage", String(Math.max(1, currentPage - 1)));
  const nextParams = new URLSearchParams(searchParams.toString());
  nextParams.set("currentPage", String(Math.min(totalPages, currentPage + 1)));
  const isShowingAll = totalItems > 0 && perPage >= totalItems;

  function changePerPage(value: string): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("perPage", value);
    params.set("currentPage", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <nav
      aria-label={t("hrmStats.pagination.label")}
      className="flex flex-col items-center justify-between gap-3 py-3 sm:flex-row"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <label htmlFor="hrm-stats-per-page">
          {t("hrmStats.pagination.perPage")}
        </label>
        <Select
          value={isShowingAll ? "all" : String(perPage)}
          onValueChange={changePerPage}
        >
          <SelectTrigger id="hrm-stats-per-page" className="h-8 w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PER_PAGE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
            {totalItems > 0 && (
              <SelectItem value="all">{t("hrmStats.pagination.showAll")}</SelectItem>
            )}
          </SelectContent>
        </Select>
        <span>
          {t("hrmStats.pagination.results", {
            count: new Intl.NumberFormat().format(totalItems),
          })}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href={`${pathname}?${previousParams.toString()}`}
          aria-disabled={currentPage <= 1}
          tabIndex={currentPage <= 1 ? -1 : undefined}
          className={[
            "inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-sm",
            currentPage <= 1
              ? "pointer-events-none opacity-50"
              : "hover:bg-accent",
          ].join(" ")}
        >
          <ChevronLeft className="size-4" />
          {t("hrmStats.pagination.previous")}
        </Link>
        <span className="text-sm text-muted-foreground">
          {t("hrmStats.pagination.page", {
            current: String(currentPage),
            total: String(totalPages),
          })}
        </span>
        <Link
          href={`${pathname}?${nextParams.toString()}`}
          aria-disabled={currentPage >= totalPages}
          tabIndex={currentPage >= totalPages ? -1 : undefined}
          className={[
            "inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-sm",
            currentPage >= totalPages
              ? "pointer-events-none opacity-50"
              : "hover:bg-accent",
          ].join(" ")}
        >
          {t("hrmStats.pagination.next")}
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </nav>
  );
}
