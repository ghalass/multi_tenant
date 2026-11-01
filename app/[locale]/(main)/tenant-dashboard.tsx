import type { ElementType, JSX } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Gauge,
  MapPin,
  Settings2,
  Truck,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import type { TenantDashboard as TenantDashboardData } from "@/server/dashboard";
import TenantSwitcher from "@/components/tenant-link";

type TenantChoice = {
  id: string;
  name: string;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function readableStatus(value: string): string {
  return value.replaceAll("_", " ").toLowerCase();
}

function metricColor(status: "neutral" | "warning" | "danger" | "success"): string {
  const colors = {
    neutral: "bg-primary/10 text-primary",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    danger: "bg-destructive/10 text-destructive",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  };

  return colors[status];
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  status = "neutral",
}: {
  title: string;
  value: string;
  description: string;
  icon: ElementType;
  status?: "neutral" | "warning" | "danger" | "success";
}): JSX.Element {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-5">
        <CardDescription>{title}</CardDescription>
        <span className={`rounded-lg p-2 ${metricColor(status)}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent className="px-5">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function SectionTitle({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href?: string;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {href && (
        <Button variant="ghost" size="sm" asChild>
          <Link href={href}>
            Voir tout <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      )}
    </div>
  );
}

export default function TenantDashboard({
  dashboard,
  tenants,
}: {
  dashboard: TenantDashboardData;
  tenants: TenantChoice[];
}): JSX.Element {
  const { tenant, permissions, sites, engins, backlogs, maintenance } = dashboard;
  const hasMetrics = Boolean(sites || engins || backlogs || maintenance);
  const maintenanceStatus = maintenance?.due
    ? "danger"
    : maintenance?.alert
      ? "warning"
      : "success";

  return (
    <div className="space-y-8 py-2">
      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-5 md:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Tenant actif</Badge>
              <span className="text-sm text-muted-foreground">Espace de travail sécurisé</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Tableau de bord — {tenant.name}
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Vue d&apos;ensemble de votre parc, des interventions à suivre et des priorités opérationnelles.
            </p>
          </div>

          {tenants.length > 1 && (
            <div className="rounded-xl border bg-background/80 p-3 shadow-sm">
              <p className="mb-2 text-sm font-medium">Changer de tenant</p>
              <div className="flex flex-wrap gap-2">
                {tenants.map((item) => (
                  <TenantSwitcher
                    key={item.id}
                    tenantId={item.id}
                    tenantName={item.name}
                    currentTenantId={tenant.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {hasMetrics ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {sites && (
            <MetricCard
              title="Sites actifs"
              value={formatNumber(sites.active)}
              description={`${formatNumber(sites.total)} site${sites.total > 1 ? "s" : ""} configuré${sites.total > 1 ? "s" : ""}`}
              icon={MapPin}
              status="success"
            />
          )}
          {engins && (
            <MetricCard
              title="Engins disponibles"
              value={formatNumber(engins.active)}
              description={`${formatNumber(engins.total - engins.active)} engin${engins.total - engins.active > 1 ? "s" : ""} inactif${engins.total - engins.active > 1 ? "s" : ""}`}
              icon={Truck}
              status={engins.active === engins.total ? "success" : "warning"}
            />
          )}
          {backlogs && (
            <MetricCard
              title="Backlogs ouverts"
              value={formatNumber(backlogs.open)}
              description={`${formatNumber(backlogs.highPriority)} priorité${backlogs.highPriority > 1 ? "s" : ""} élevée${backlogs.highPriority > 1 ? "s" : ""}`}
              icon={ClipboardList}
              status={backlogs.highPriority ? "danger" : backlogs.open ? "warning" : "success"}
            />
          )}
          {maintenance && (
            <MetricCard
              title="Maintenances à suivre"
              value={formatNumber(maintenance.due + maintenance.alert)}
              description={maintenance.due
                ? `${formatNumber(maintenance.due)} échéance${maintenance.due > 1 ? "s" : ""} dépassée${maintenance.due > 1 ? "s" : ""}`
                : `${formatNumber(maintenance.unmeasured)} suivi${maintenance.unmeasured > 1 ? "s" : ""} sans compteur`}
              icon={CalendarClock}
              status={maintenanceStatus}
            />
          )}
        </section>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
            <Settings2 className="size-5 shrink-0" />
            Aucune donnée n&apos;est affichée : votre rôle ne donne pas encore accès aux indicateurs du tenant.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        {backlogs && (
          <section className="space-y-4">
            <SectionTitle
              title="Derniers backlogs"
              description={`${formatNumber(backlogs.total)} backlog${backlogs.total > 1 ? "s" : ""} enregistré${backlogs.total > 1 ? "s" : ""} dans ce tenant`}
              href="/backlogs"
            />
            <Card className="gap-0 overflow-hidden py-0">
              {backlogs.recent.length ? (
                <div className="divide-y">
                  {backlogs.recent.map((backlog) => (
                    <div key={backlog.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{backlog.number}</span>
                          <Badge
                            variant={backlog.priority === "ELEVEE" ? "destructive" : "secondary"}
                            className="capitalize"
                          >
                            {readableStatus(backlog.priority)}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground" title={backlog.description}>
                          {backlog.description}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {backlog.enginName} · détecté le {formatDate(backlog.detectedAt)}
                        </p>
                      </div>
                      <Badge variant={backlog.status === "EXECUTE" ? "default" : "outline"} className="capitalize">
                        {readableStatus(backlog.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Aucun backlog enregistré pour ce tenant.
                </CardContent>
              )}
            </Card>
          </section>
        )}

        {maintenance && (
          <section className="space-y-4">
            <SectionTitle
              title="Prochaines échéances"
              description={`${formatNumber(maintenance.tracked)} suivi${maintenance.tracked > 1 ? "s" : ""} de maintenance actif${maintenance.tracked > 1 ? "s" : ""}`}
              href="/maintenance-preventive/echeances"
            />
            <Card className="gap-0 overflow-hidden py-0">
              {maintenance.upcoming.length ? (
                <div className="divide-y">
                  {maintenance.upcoming.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-4">
                      <span className={`rounded-lg p-2 ${metricColor(item.status === "due" ? "danger" : item.status === "alert" ? "warning" : "success")}`}>
                        {item.status === "due" ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium" title={item.planName}>{item.planName}</p>
                        <p className="truncate text-sm text-muted-foreground">{item.enginName}</p>
                      </div>
                      <span className={`text-right text-sm font-medium ${item.status === "due" ? "text-destructive" : item.status === "alert" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                        {item.remainingHours < 0
                          ? `${formatNumber(Math.abs(Math.round(item.remainingHours)))} h de retard`
                          : `${formatNumber(Math.round(item.remainingHours))} h restantes`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {maintenance.unmeasured
                    ? "Ajoutez des relevés compteur pour calculer les échéances."
                    : "Aucune échéance calculable pour le moment."}
                </CardContent>
              )}
            </Card>
          </section>
        )}
      </div>

      <section className="space-y-4">
        <SectionTitle
          title="Accès rapide"
          description="Ouvrez les espaces de gestion auxquels votre rôle vous autorise."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {permissions.sites && (
            <Button variant="outline" className="h-auto justify-between py-4" asChild>
              <Link href="/sites"><span><MapPin className="mr-2 inline size-4" />Sites</span><ArrowRight className="size-4" /></Link>
            </Button>
          )}
          {permissions.engins && (
            <Button variant="outline" className="h-auto justify-between py-4" asChild>
              <Link href="/engins"><span><Truck className="mr-2 inline size-4" />Engins</span><ArrowRight className="size-4" /></Link>
            </Button>
          )}
          {permissions.backlogs && (
            <Button variant="outline" className="h-auto justify-between py-4" asChild>
              <Link href="/backlogs"><span><ClipboardList className="mr-2 inline size-4" />Backlogs</span><ArrowRight className="size-4" /></Link>
            </Button>
          )}
          {permissions.maintenance && (
            <Button variant="outline" className="h-auto justify-between py-4" asChild>
              <Link href="/maintenance-preventive/echeances"><span><Wrench className="mr-2 inline size-4" />Maintenance</span><ArrowRight className="size-4" /></Link>
            </Button>
          )}
          {permissions.engins && !permissions.backlogs && !permissions.maintenance && (
            <Button variant="outline" className="h-auto justify-between py-4" asChild>
              <Link href="/saisie-hrm"><span><Gauge className="mr-2 inline size-4" />Saisies HRM</span><ArrowRight className="size-4" /></Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
