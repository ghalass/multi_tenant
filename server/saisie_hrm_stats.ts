"use server";

import { getSession } from "@/lib/auth";
import { RESOURCE } from "@/lib/constantes";
import { ACTION } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rbac/middleware";

export type SaisieHrmStatsFilters = {
  month?: string;
  siteId?: string;
  typeparcId?: string;
  parcId?: string;
  enginId?: string;
  perPage?: string;
};

type NamedOption = {
  id: string;
  name: string;
};

type EnginOption = NamedOption & {
  siteId: string;
  parcId: string;
  typeparcId: string;
};

export type SaisieHrmStatsOptions = {
  sites: NamedOption[];
  typeParcs: NamedOption[];
  parcs: NamedOption[];
  engins: EnginOption[];
};

export type SaisieHrmStatsEngin = {
  id: string;
  name: string;
  typeParc: string;
  parc: string;
  site: string;
  latestDate: string | null;
  daysLate: number | null;
};

export type SaisieHrmStatsError =
  | "forbidden"
  | "missingTenant"
  | "invalidMonth"
  | "futureMonth"
  | "invalidDate";

export type SaisieHrmStatsResult =
  | {
      success: true;
      month: string;
      days: Array<{ date: string; missingCount: number | null }>;
      totalActiveEngins: number;
      selectedDay: string | null;
      lateEngins: SaisieHrmStatsEngin[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
      } | null;
    }
  | {
      success: false;
      error: SaisieHrmStatsError;
    };

export type SaisieHrmStatsOptionsResult =
  | { success: true; data: SaisieHrmStatsOptions }
  | { success: false; error: "forbidden" | "missingTenant" };

const DAY_IN_MS = 86_400_000;

function isValidMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const [year, month] = value.split("-").map(Number);
  return month >= 1 && month <= 12 && year >= 1;
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function dateOnlyToUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function getTodayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getActiveTenantId(): Promise<string | null> {
  const { currentTenantId } = await getSession();
  if (!currentTenantId) return null;

  const tenant = await prisma.tenant.findFirst({
    where: { id: currentTenantId, active: true },
    select: { id: true },
  });
  return tenant?.id ?? null;
}

export async function getSaisieHrmStatsOptions(): Promise<SaisieHrmStatsOptionsResult> {
  const permission = await guard(ACTION.READ, RESOURCE.SAISIE_HRM);
  if (!permission.success) {
    return { success: false, error: "forbidden" };
  }

  const tenantId = await getActiveTenantId();
  if (!tenantId) {
    return { success: false, error: "missingTenant" };
  }

  const [sites, typeParcs, parcs, engins] = await Promise.all([
    prisma.site.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.typeparc.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.parc.findMany({
      where: {
        tenantId,
        typeparc: { is: { tenantId } },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.engin.findMany({
      where: {
        tenantId,
        active: true,
        site: { is: { tenantId } },
        parc: {
          is: {
            tenantId,
            typeparc: { is: { tenantId } },
          },
        },
      },
      select: {
        id: true,
        name: true,
        siteId: true,
        parcId: true,
        parc: { select: { typeparcId: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    success: true,
    data: {
      sites,
      typeParcs,
      parcs,
      engins: engins.map(({ id, name, siteId, parcId, parc }) => ({
        id,
        name,
        siteId,
        parcId,
        typeparcId: parc.typeparcId,
      })),
    },
  };
}

export async function getSaisieHrmStats(
  filters: SaisieHrmStatsFilters & {
    selectedDay?: string;
    currentPage?: number;
  },
): Promise<SaisieHrmStatsResult> {
  const permission = await guard(ACTION.READ, RESOURCE.SAISIE_HRM);
  if (!permission.success) {
    return { success: false, error: "forbidden" };
  }

  const tenantId = await getActiveTenantId();
  if (!tenantId) {
    return { success: false, error: "missingTenant" };
  }

  const month = filters.month?.trim() ?? "";
  if (!isValidMonth(month)) {
    return { success: false, error: "invalidMonth" };
  }

  const today = getTodayUtc();
  if (month > today.slice(0, 7)) {
    return { success: false, error: "futureMonth" };
  }

  const monthStart = new Date(`${month}-01T00:00:00.000Z`);
  const monthEnd = new Date(
    Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth() + 1,
      1,
    ),
  );
  const monthDays = Math.round(
    (monthEnd.getTime() - monthStart.getTime()) / DAY_IN_MS,
  );
  const siteId = filters.siteId?.trim();
  const typeparcId = filters.typeparcId?.trim();
  const parcId = filters.parcId?.trim();
  const enginId = filters.enginId?.trim();

  const enginWhere = {
    tenantId,
    active: true,
    site: {
      is: {
        tenantId,
        ...(siteId ? { id: siteId } : {}),
      },
    },
    parc: {
      is: {
        tenantId,
        ...(parcId ? { id: parcId } : {}),
        typeparc: {
          is: {
            tenantId,
            ...(typeparcId ? { id: typeparcId } : {}),
          },
        },
      },
    },
    ...(enginId ? { id: enginId } : {}),
  };

  const engins = await prisma.engin.findMany({
    where: enginWhere,
    select: { id: true },
  });
  const enginIds = engins.map(({ id }) => id);

  const groupedSaisies = enginIds.length
    ? await prisma.saisiehrm.groupBy({
        by: ["enginId", "du"],
        where: {
          tenantId,
          enginId: { in: enginIds },
          du: { gte: monthStart, lt: monthEnd },
          engin: {
            is: { tenantId, active: true },
          },
        },
      })
    : [];

  const enginsByDate = new Map<string, Set<string>>();
  for (const saisie of groupedSaisies) {
    const date = saisie.du.toISOString().slice(0, 10);
    const idsForDate = enginsByDate.get(date) ?? new Set<string>();
    idsForDate.add(saisie.enginId);
    enginsByDate.set(date, idsForDate);
  }

  const days = Array.from({ length: monthDays }, (_, index) => {
    const date = new Date(monthStart.getTime() + index * DAY_IN_MS)
      .toISOString()
      .slice(0, 10);
    return {
      date,
      missingCount:
        date > today
          ? null
          : Math.max(0, engins.length - (enginsByDate.get(date)?.size ?? 0)),
    };
  });

  const selectedDay = filters.selectedDay?.trim() || null;
  if (!selectedDay) {
    return {
      success: true,
      month,
      days,
      totalActiveEngins: engins.length,
      selectedDay: null,
      lateEngins: [],
      pagination: null,
    };
  }

  if (
    !isValidDateOnly(selectedDay) ||
    selectedDay.slice(0, 7) !== month ||
    selectedDay > today
  ) {
    return { success: false, error: "invalidDate" };
  }

  const pageRequested = Number(filters.currentPage) || 1;
  const currentPage = Math.max(1, Math.floor(pageRequested));
  const requestedPerPage = filters.perPage ?? "10";
  const parsedPerPage = Number(requestedPerPage);
  const perPageChoice =
    requestedPerPage === "all" ||
    [5, 10, 20, 50, 100].includes(parsedPerPage)
      ? requestedPerPage
      : "10";
  const selectedDateValue = dateOnlyToUtcDate(selectedDay);
  const missingEnginWhere = {
    ...enginWhere,
    saisiehrms: {
      none: {
        tenantId,
        du: selectedDateValue,
      },
    },
  };

  const totalItems = await prisma.engin.count({
    where: missingEnginWhere,
  });
  const perPage =
    perPageChoice === "all"
      ? Math.max(totalItems, 1)
      : Number(perPageChoice);
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const safePage = Math.min(currentPage, totalPages);

  const lateEngins = await prisma.engin.findMany({
    where: missingEnginWhere,
    select: {
      id: true,
      name: true,
      site: { select: { name: true } },
      parc: {
        select: {
          name: true,
          typeparc: { select: { name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
    skip: (safePage - 1) * perPage,
    take: perPage,
  });

  const pageEnginIds = lateEngins.map(({ id }) => id);
  const latestRows = pageEnginIds.length
    ? await prisma.saisiehrm.groupBy({
        by: ["enginId"],
        where: {
          tenantId,
          enginId: { in: pageEnginIds },
          du: { lte: selectedDateValue },
          engin: {
            is: { tenantId, active: true },
          },
        },
        _max: { du: true },
      })
    : [];
  const latestDateByEngin = new Map(
    latestRows.map(({ enginId, _max }) => [
      enginId,
      _max.du?.toISOString().slice(0, 10) ?? null,
    ]),
  );
  const selectedDateMs = selectedDateValue.getTime();

  return {
    success: true,
    month,
    days,
    totalActiveEngins: engins.length,
    selectedDay,
    lateEngins: lateEngins.map((engin): SaisieHrmStatsEngin => {
      const latestDate = latestDateByEngin.get(engin.id) ?? null;
      const daysLate = latestDate
        ? Math.floor(
            (selectedDateMs - dateOnlyToUtcDate(latestDate).getTime()) /
              DAY_IN_MS,
          )
        : null;

      return {
        id: engin.id,
        name: engin.name,
        typeParc: engin.parc.typeparc.name,
        parc: engin.parc.name,
        site: engin.site.name,
        latestDate,
        daysLate,
      };
    }),
    pagination: {
      currentPage: safePage,
      totalPages,
      totalItems,
      itemsPerPage: perPage,
    },
  };
}
