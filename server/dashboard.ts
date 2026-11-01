"use server";

import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";
import { hasPermission } from "@/lib/rbac/core";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/server/tenants";

export type TenantDashboard = {
  tenant: {
    id: string;
    name: string;
  };
  permissions: {
    sites: boolean;
    engins: boolean;
    backlogs: boolean;
    maintenance: boolean;
  };
  sites?: {
    total: number;
    active: number;
  };
  engins?: {
    total: number;
    active: number;
  };
  backlogs?: {
    total: number;
    open: number;
    highPriority: number;
    recent: Array<{
      id: string;
      number: string;
      description: string;
      priority: string;
      status: string;
      enginName: string;
      detectedAt: Date;
    }>;
  };
  maintenance?: {
    tracked: number;
    due: number;
    alert: number;
    unmeasured: number;
    upcoming: Array<{
      id: string;
      planName: string;
      enginName: string;
      remainingHours: number;
      status: "due" | "alert" | "planned";
    }>;
  };
};

/**
 * Builds the home dashboard for the tenant stored in the current session.
 * Every database query is scoped with tenantId; the displayed sections also
 * honour the user permissions for their corresponding resource.
 */
export async function getTenantDashboard(): Promise<TenantDashboard | null> {
  const tenant = await getCurrentTenant();

  if (!tenant?.active) {
    return null;
  }

  const [canReadSites, canReadEngins, canReadBacklogs, canReadMaintenance] =
    await Promise.all([
      hasPermission(ACTION.READ, RESOURCE.SITE),
      hasPermission(ACTION.READ, RESOURCE.ENGIN),
      hasPermission(ACTION.READ, RESOURCE.BACKLOG),
      hasPermission(ACTION.READ, RESOURCE.MAINTENANCE_PREVENTIVE),
    ]);

  const tenantId = tenant.id;
  const permissions = {
    sites: canReadSites,
    engins: canReadEngins,
    backlogs: canReadBacklogs,
    maintenance: canReadMaintenance,
  };

  const [sites, engins, backlogs, maintenance] = await Promise.all([
    canReadSites
      ? Promise.all([
        prisma.site.count({ where: { tenantId } }),
        prisma.site.count({ where: { tenantId, active: true } }),
      ])
      : Promise.resolve(undefined),
    canReadEngins
      ? Promise.all([
        prisma.engin.count({ where: { tenantId } }),
        prisma.engin.count({ where: { tenantId, active: true } }),
      ])
      : Promise.resolve(undefined),
    canReadBacklogs
      ? Promise.all([
        prisma.backlog.count({ where: { tenantId } }),
        prisma.backlog.count({
          where: { tenantId, statut: { not: "EXECUTE" } },
        }),
        prisma.backlog.count({
          where: {
            tenantId,
            priorite: "ELEVEE",
            statut: { not: "EXECUTE" },
          },
        }),
        prisma.backlog.findMany({
          where: { tenantId },
          orderBy: [{ dateDetection: "desc" }, { createdAt: "desc" }],
          take: 5,
          select: {
            id: true,
            numeroBacklog: true,
            description: true,
            priorite: true,
            statut: true,
            dateDetection: true,
            engin: {
              select: { name: true },
            },
          },
        }),
      ])
      : Promise.resolve(undefined),
    canReadMaintenance
      ? prisma.suiviPlanMaintenanceEngin.findMany({
        where: {
          tenantId,
          active: true,
          planMaintenance: { active: true },
          engin: { active: true },
        },
        select: {
          id: true,
          compteurDerniereMaintenance: true,
          planMaintenance: {
            select: {
              name: true,
              intervalleHeures: true,
              seuilAlerteHeures: true,
            },
          },
          engin: {
            select: {
              name: true,
              saisiehrms: {
                where: { compteur: { not: null } },
                orderBy: [{ du: "desc" }, { id: "desc" }],
                take: 1,
                select: { compteur: true },
              },
            },
          },
        },
      })
      : Promise.resolve(undefined),
  ]);

  const result: TenantDashboard = {
    tenant: { id: tenant.id, name: tenant.name },
    permissions,
  };

  if (sites) {
    result.sites = { total: sites[0], active: sites[1] };
  }

  if (engins) {
    result.engins = { total: engins[0], active: engins[1] };
  }

  if (backlogs) {
    result.backlogs = {
      total: backlogs[0],
      open: backlogs[1],
      highPriority: backlogs[2],
      recent: backlogs[3].map((backlog) => ({
        id: backlog.id,
        number: backlog.numeroBacklog,
        description: backlog.description,
        priority: backlog.priorite,
        status: backlog.statut,
        enginName: backlog.engin.name,
        detectedAt: backlog.dateDetection,
      })),
    };
  }

  if (maintenance) {
    let due = 0;
    let alert = 0;
    let unmeasured = 0;
    const upcoming: NonNullable<TenantDashboard["maintenance"]>["upcoming"] = [];

    for (const tracking of maintenance) {
      const currentCounter = tracking.engin.saisiehrms[0]?.compteur;
      const lastMaintenanceCounter = tracking.compteurDerniereMaintenance;

      if (currentCounter === null || currentCounter === undefined || lastMaintenanceCounter === null) {
        unmeasured += 1;
        continue;
      }

      const remainingHours =
        tracking.planMaintenance.intervalleHeures -
        (currentCounter - lastMaintenanceCounter);
      const isDue = remainingHours <= 0;
      const isAlert =
        !isDue &&
        remainingHours <= tracking.planMaintenance.seuilAlerteHeures;

      if (isDue) {
        due += 1;
      } else if (isAlert) {
        alert += 1;
      }

      upcoming.push({
        id: tracking.id,
        planName: tracking.planMaintenance.name,
        enginName: tracking.engin.name,
        remainingHours,
        status: isDue ? "due" : isAlert ? "alert" : "planned",
      });
    }

    result.maintenance = {
      tracked: maintenance.length,
      due,
      alert,
      unmeasured,
      upcoming: upcoming
        .sort((a, b) => a.remainingHours - b.remainingHours)
        .slice(0, 5),
    };
  }

  return result;
}
