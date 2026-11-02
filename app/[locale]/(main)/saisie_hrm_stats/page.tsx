import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Gauge,
  Truck,
} from "lucide-react";
import type { JSX } from "react";

import DisplayError from "@/components/display-error";
import { ExportExcel } from "@/components/export-excel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RESOURCE } from "@/lib/constantes";
import { getPageAccessFallback } from "@/lib/rbac/page-access";
import { getCurrentLocale, getI18n } from "@/locales/server";
import {
  getSaisieHrmStats,
  getSaisieHrmStatsOptions,
  type SaisieHrmStatsFilters,
} from "@/server/saisie_hrm_stats";
import SaisieHrmStatsFiltersForm from "./filters";
import SaisieHrmStatsPagination from "./pagination";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getBadgeClass(daysLate: number | null): string {
  if (daysLate === null || daysLate > 3) {
    return "border-red-800 bg-red-800 text-white dark:border-red-700 dark:bg-red-700";
  }
  if (daysLate >= 2) {
    return "border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200";
  }
  return "border-red-300 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200";
}

function formatDate(value: string, locale: string): string {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString(
    locale === "ar" ? "ar" : "fr-FR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    },
  );
}

function createDashboardHref(
  filters: SaisieHrmStatsFilters,
  selectedDay?: string,
  currentPage?: number,
  perPage?: string,
): string {
  const params = new URLSearchParams();
  params.set("searched", "1");
  if (filters.month) params.set("month", filters.month);
  if (filters.siteId) params.set("siteId", filters.siteId);
  if (filters.typeparcId) params.set("typeparcId", filters.typeparcId);
  if (filters.parcId) params.set("parcId", filters.parcId);
  if (filters.enginId) params.set("enginId", filters.enginId);
  if (filters.perPage) params.set("perPage", filters.perPage);
  if (selectedDay) params.set("selectedDay", selectedDay);
  if (perPage) params.set("perPage", perPage);
  if (currentPage && currentPage > 1) {
    params.set("currentPage", String(currentPage));
  }
  return `?${params.toString()}`;
}

export default async function SaisieHrmStatsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> {
  const params = await searchParams;
  const filters: SaisieHrmStatsFilters = {
    month: firstParam(params.month),
    siteId: firstParam(params.siteId),
    typeparcId: firstParam(params.typeparcId),
    parcId: firstParam(params.parcId),
    enginId: firstParam(params.enginId),
    perPage: firstParam(params.perPage),
  };
  const searched = firstParam(params.searched) === "1";
  const selectedDay = firstParam(params.selectedDay);
  const currentPage = Number(firstParam(params.currentPage)) || 1;
  const perPage = firstParam(params.perPage) ?? "10";

  const [accessFallback, t, locale] = await Promise.all([
    getPageAccessFallback(RESOURCE.SAISIE_HRM),
    getI18n(),
    getCurrentLocale(),
  ]);
  if (accessFallback) return accessFallback;

  const [optionsResult, statsResult] = await Promise.all([
    getSaisieHrmStatsOptions(),
    searched
      ? getSaisieHrmStats({
          ...filters,
          selectedDay,
          currentPage,
          perPage,
        })
      : Promise.resolve(null),
  ]);

  if (!optionsResult.success) {
    const error = t(
      optionsResult.error === "forbidden"
        ? "hrmStats.errors.forbidden"
        : "hrmStats.errors.missingTenant",
    );
    return (
      <div className="container mx-auto space-y-4 py-2">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Gauge className="size-8" />
          {t("hrmStats.title")}
        </h1>
        <DisplayError error={error} />
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const defaultMonth = today.slice(0, 7);
  const stats =
    statsResult?.success === true ? statsResult : null;
  const statsError =
    statsResult && !statsResult.success
      ? t(`hrmStats.errors.${statsResult.error}`)
      : null;
  const numberFormat = new Intl.NumberFormat(locale === "ar" ? "ar" : "fr-FR");
  const percentFormat = new Intl.NumberFormat(
    locale === "ar" ? "ar" : "fr-FR",
    { style: "percent", maximumFractionDigits: 1 },
  );
  const weekdays: Array<
    | "hrmStats.weekdays.monday"
    | "hrmStats.weekdays.tuesday"
    | "hrmStats.weekdays.wednesday"
    | "hrmStats.weekdays.thursday"
    | "hrmStats.weekdays.friday"
    | "hrmStats.weekdays.saturday"
    | "hrmStats.weekdays.sunday"
  > =
    locale === "ar"
      ? [
          "hrmStats.weekdays.sunday",
          "hrmStats.weekdays.monday",
          "hrmStats.weekdays.tuesday",
          "hrmStats.weekdays.wednesday",
          "hrmStats.weekdays.thursday",
          "hrmStats.weekdays.friday",
          "hrmStats.weekdays.saturday",
        ]
      : [
          "hrmStats.weekdays.monday",
          "hrmStats.weekdays.tuesday",
          "hrmStats.weekdays.wednesday",
          "hrmStats.weekdays.thursday",
          "hrmStats.weekdays.friday",
          "hrmStats.weekdays.saturday",
          "hrmStats.weekdays.sunday",
        ];
  const firstDayOffset =
    stats && locale === "ar"
      ? new Date(`${stats.month}-01T00:00:00.000Z`).getUTCDay()
      : stats
        ? (new Date(`${stats.month}-01T00:00:00.000Z`).getUTCDay() + 6) % 7
        : 0;
  const selectedDayStats = stats?.days.find(
    (day) => day.date === stats.selectedDay,
  );
  const selectedFilterSummary = stats
    ? [
        `${t("hrmStats.filters.month")}: ${new Date(
          `${stats.month}-01T00:00:00.000Z`,
        ).toLocaleDateString(locale === "ar" ? "ar" : "fr-FR", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })}`,
        ...(stats.selectedDay
          ? [`${t("hrmStats.filters.referenceDate")}: ${formatDate(stats.selectedDay, locale)}`]
          : []),
        ...(filters.siteId
          ? optionsResult.data.sites
              .filter((site) => site.id === filters.siteId)
              .map((site) => `${t("hrmStats.filters.site")}: ${site.name}`)
          : []),
        ...(filters.typeparcId
          ? optionsResult.data.typeParcs
              .filter((typeParc) => typeParc.id === filters.typeparcId)
              .map((typeParc) => `${t("hrmStats.filters.typeParc")}: ${typeParc.name}`)
          : []),
        ...(filters.parcId
          ? optionsResult.data.parcs
              .filter((parc) => parc.id === filters.parcId)
              .map((parc) => `${t("hrmStats.filters.parc")}: ${parc.name}`)
          : []),
        ...(filters.enginId
          ? optionsResult.data.engins
              .filter((engin) => engin.id === filters.enginId)
              .map((engin) => `${t("hrmStats.filters.engin")}: ${engin.name}`)
          : []),
      ]
    : [];

  return (
    <div className="container mx-auto space-y-6 py-2">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Gauge className="size-8" />
          {t("hrmStats.title")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t("hrmStats.description")}
        </p>
      </header>

      <SaisieHrmStatsFiltersForm
        key={JSON.stringify(filters)}
        filters={filters}
        defaultMonth={defaultMonth}
        options={optionsResult.data}
      />

      {!searched && (
        <p className="rounded-lg border p-6 text-center text-muted-foreground">
          {t("hrmStats.searchBeforeResults")}
        </p>
      )}

      {statsError && <DisplayError error={statsError} />}

      {stats && (
        <>
          <section aria-label={t("hrmStats.calendarTitle")} className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold">
                {t("hrmStats.calendarTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("hrmStats.calendarHelp")}
              </p>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {weekdays.map((weekday) => (
                <div
                  key={weekday}
                  className="py-1 text-center text-[11px] font-medium text-muted-foreground sm:text-xs"
                >
                  {t(weekday)}
                </div>
              ))}

              {Array.from({ length: firstDayOffset }, (_, index) => (
                <div
                  key={`empty-${index}`}
                  aria-hidden="true"
                  className="min-h-12 rounded-md sm:min-h-14"
                />
              ))}

              {stats.days.map((day) => {
                const isSelected = stats.selectedDay === day.date;
                const isFuture = day.missingCount === null;
                const href = createDashboardHref(
                  filters,
                  day.date,
                  undefined,
                  perPage,
                );

                return (
                  <Link
                    key={day.date}
                    href={href}
                    aria-label={`${formatDate(day.date, locale)}: ${
                      isFuture
                        ? t("hrmStats.calendar.future")
                        : t("hrmStats.calendar.missingCount", {
                            count: numberFormat.format(day.missingCount ?? 0),
                          })
                    }`}
                    aria-current={isSelected ? "date" : undefined}
                    aria-disabled={isFuture}
                    tabIndex={isFuture ? -1 : undefined}
                    className={[
                      "flex min-h-12 flex-col items-center justify-center gap-0 rounded-md border p-0.5 text-center transition-colors sm:min-h-14 sm:p-1",
                      isFuture
                        ? "pointer-events-none border-dashed bg-muted/40 text-muted-foreground"
                        : day.missingCount
                          ? "border-red-200 bg-red-50 hover:border-red-400 hover:bg-red-100 dark:border-red-950 dark:bg-red-950/30 dark:hover:bg-red-950/60"
                          : "border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-950 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60",
                      isSelected && "ring-2 ring-primary ring-offset-2",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="text-xs text-muted-foreground sm:text-sm">
                      {Number(day.date.slice(-2))}
                    </span>
                    <span className="text-base font-bold sm:text-lg">
                      {isFuture
                        ? "—"
                        : numberFormat.format(day.missingCount ?? 0)}
                    </span>
                    <span className="hidden text-[9px] leading-none text-muted-foreground sm:inline">
                      {t("hrmStats.calendar.missingLabel")}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          {selectedDayStats && stats.selectedDay && (
            <>
              <section
                aria-label={t("hrmStats.selectedFilters")}
                className="space-y-1"
              >
                <h2 className="text-lg font-semibold">
                  {t("hrmStats.selectedFilters")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedFilterSummary.join(" · ")}
                </p>
              </section>

              <section
                aria-label={t("hrmStats.summary")}
                className="grid gap-3 md:grid-cols-3"
              >
                <Card className="gap-0 py-2">
                  <CardHeader className="flex flex-row items-center gap-2 px-4 py-1 space-y-0 [&.border-b]:pb-1">
                    <Truck className="size-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">
                      {t("hrmStats.totalEngins")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-3 px-4 pb-1">
                    <p className="text-2xl font-bold">
                      {numberFormat.format(stats.totalActiveEngins)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(stats.selectedDay, locale)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="gap-0 py-2">
                  <CardHeader className="flex flex-row items-center gap-2 px-4 py-1 space-y-0 [&.border-b]:pb-1">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <CardTitle className="text-sm font-medium">
                      {t("hrmStats.upToDate")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-baseline gap-3 px-4 pb-1">
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                      {numberFormat.format(
                        stats.totalActiveEngins -
                          (selectedDayStats.missingCount ?? 0),
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {percentFormat.format(
                        stats.totalActiveEngins
                          ? (stats.totalActiveEngins -
                              (selectedDayStats.missingCount ?? 0)) /
                              stats.totalActiveEngins
                          : 0,
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card className="gap-0 border-red-300 py-2 dark:border-red-900">
                  <CardHeader className="flex flex-row items-center gap-2 px-4 py-1 space-y-0 [&.border-b]:pb-1">
                    <AlertTriangle className="size-4 text-destructive" />
                    <CardTitle className="text-sm font-medium">
                      {t("hrmStats.overdue")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-baseline gap-3 px-4 pb-1">
                    <p className="text-2xl font-bold text-destructive">
                      {numberFormat.format(selectedDayStats.missingCount ?? 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {percentFormat.format(
                        stats.totalActiveEngins
                          ? (selectedDayStats.missingCount ?? 0) /
                              stats.totalActiveEngins
                          : 0,
                      )}
                    </p>
                  </CardContent>
                </Card>
              </section>

              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <AlertTriangle className="size-5 text-destructive" />
                    <h2 className="text-xl font-semibold">
                      {t("hrmStats.lateTitle")}
                    </h2>
                    <Badge variant="destructive">
                      {numberFormat.format(selectedDayStats.missingCount ?? 0)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(stats.selectedDay, locale)}
                    </span>
                  </div>
                  {stats.pagination?.totalItems ? (
                    <ExportExcel
                      tableName="hrm-stats-late-engins"
                      fileName={`Saisies_HRM_en_retard_${stats.selectedDay}`}
                    />
                  ) : null}
                </div>

                {stats.pagination?.totalItems === 0 ? (
                  <div className="flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                    <p>{t("hrmStats.allUpToDate")}</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border">
                      <Table id="hrm-stats-late-engins">
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("hrmStats.columns.typeParc")}</TableHead>
                            <TableHead>{t("hrmStats.columns.parc")}</TableHead>
                            <TableHead>{t("hrmStats.columns.engin")}</TableHead>
                            <TableHead>{t("hrmStats.columns.site")}</TableHead>
                            <TableHead>{t("hrmStats.columns.lastEntry")}</TableHead>
                            <TableHead>{t("hrmStats.columns.delay")}</TableHead>
                            <TableHead>{t("hrmStats.columns.status")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats.lateEngins.map((engin) => (
                            <TableRow key={engin.id}>
                              <TableCell>{engin.typeParc}</TableCell>
                              <TableCell>{engin.parc}</TableCell>
                              <TableCell className="font-medium">
                                <Link
                                  href={`/saisie-hrm?search=1&enginId=${encodeURIComponent(engin.id)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline-offset-4 hover:text-primary hover:underline"
                                >
                                  {engin.name}
                                  <ArrowUpRight className="ms-1 inline size-3.5" />
                                </Link>
                              </TableCell>
                              <TableCell>{engin.site}</TableCell>
                              <TableCell>
                                {engin.latestDate
                                  ? formatDate(engin.latestDate, locale)
                                  : t("hrmStats.noEntry")}
                              </TableCell>
                              <TableCell>
                                <Badge className={getBadgeClass(engin.daysLate)}>
                                  {engin.daysLate === null
                                    ? t("hrmStats.notCalculable")
                                    : `${numberFormat.format(engin.daysLate)} ${t(engin.daysLate === 1 ? "hrmStats.daySingular" : "hrmStats.dayPlural")}`}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive">
                                  {t("hrmStats.overdueStatus")}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {stats.pagination && (
                      <SaisieHrmStatsPagination
                        currentPage={stats.pagination.currentPage}
                        totalPages={stats.pagination.totalPages}
                        totalItems={stats.pagination.totalItems}
                        perPage={stats.pagination.itemsPerPage}
                      />
                    )}
                  </>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
