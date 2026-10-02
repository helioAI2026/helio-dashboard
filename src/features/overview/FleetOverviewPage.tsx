import { Link } from "react-router-dom";
import { Activity, AlertTriangle, ArrowRight, Gauge, Users } from "lucide-react";

import { useEvents, useFleetStats, useVehicles } from "@/api/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreTimeSeries } from "@/components/charts/ScoreTimeSeries";
import { SeverityBreakdownBar } from "@/components/charts/SeverityBreakdownBar";
import { ActiveAlertsPanel } from "./ActiveAlertsPanel";
import { DeviceHealthPanel } from "./DeviceHealthPanel";
import { OverviewMiniMap } from "./OverviewMiniMap";

export function FleetOverviewPage() {
  const stats = useFleetStats();
  const vehicles = useVehicles();
  const recentEvents = useEvents({ pageSize: 6, acknowledged: false });

  const trend = stats.data?.scoreTrend ?? [];
  const firstHalf = trend.slice(0, Math.floor(trend.length / 2));
  const secondHalf = trend.slice(Math.floor(trend.length / 2));
  const avgDelta =
    firstHalf.length && secondHalf.length
      ? Math.round(avg(secondHalf.map((p) => p.score)) - avg(firstHalf.map((p) => p.score)))
      : 0;

  return (
    <>
      <PageHeader
        title="Visão geral da frota"
        description="Status ao vivo dos caminhões, alertas ativos e tendência de fadiga."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/mapa">
              Abrir mapa
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Motoristas em turno"
          value={stats.data?.driversOnShift ?? 0}
          icon={Users}
          loading={stats.isLoading}
          hint={`de ${stats.data?.vehiclesTotal ?? 0} unidades`}
        />
        <StatCard
          label="Em fadiga agora"
          value={stats.data?.driversDrowsyOrWorse ?? 0}
          icon={AlertTriangle}
          loading={stats.isLoading}
          accent={
            (stats.data?.driversDrowsyOrWorse ?? 0) > 0
              ? "var(--severity-drowsy)"
              : undefined
          }
          hint="sonolento ou pior"
        />
        <StatCard
          label="Alertas hoje"
          value={stats.data?.eventsToday ?? 0}
          icon={Activity}
          loading={stats.isLoading}
        />
        <StatCard
          label="Pontuação média"
          value={stats.data?.avgFleetScore ?? 0}
          icon={Gauge}
          loading={stats.isLoading}
          trend={trend.map((p) => p.score)}
          delta={{ value: avgDelta, goodDirection: "down", suffix: " pts" }}
          hint="janela de 24 h"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">
              Pontuação de fadiga da frota — 24 h
            </CardTitle>
            <span className="kicker">atualização ao vivo</span>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ScoreTimeSeries data={trend} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribuição da frota</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.isLoading || !stats.data ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <SeverityBreakdownBar counts={stats.data.severityBreakdown} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">Alertas ativos</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/alertas">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentEvents.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentEvents.data && recentEvents.data.rows.length > 0 ? (
              <ActiveAlertsPanel
                events={recentEvents.data.rows}
                vehicles={vehicles.data ?? []}
              />
            ) : (
              <EmptyState
                icon={Activity}
                title="Nenhum alerta ativo"
                description="Todos os alertas recentes foram reconhecidos."
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <DeviceHealthPanel />
          <OverviewMiniMap />
        </div>
      </div>
    </>
  );
}

function avg(values: number[]): number {
  return values.length ? values.reduce((s, n) => s + n, 0) / values.length : 0;
}
