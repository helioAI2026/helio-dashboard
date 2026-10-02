import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Phone, Truck } from "lucide-react";

import {
  useDriver,
  useDriverHistory,
  useTrips,
  useEvents,
  useVehicle,
} from "@/api/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { SeverityPill } from "@/components/common/SeverityPill";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StatCard } from "@/components/common/StatCard";
import { ScoreTimeSeries } from "@/components/charts/ScoreTimeSeries";
import {
  formatDateTime,
  formatDuration,
  formatPlate,
  formatRelative,
} from "@/lib/format";
import { TRIGGER_LABEL } from "@/lib/status";

export function DriverDetailPage() {
  const { driverId } = useParams();
  const driver = useDriver(driverId);
  const history = useDriverHistory(driverId);
  const vehicle = useVehicle(driver.data?.assignedVehicleId ?? undefined);
  const events = useEvents({ driverId, pageSize: 12 });
  const trips = useTrips({ driverId });

  if (driver.isLoading) {
    return (
      <>
        <PageHeader title="Motorista" />
        <Skeleton className="h-40 w-full" />
      </>
    );
  }

  if (!driver.data) {
    return (
      <EmptyState
        icon={Truck}
        title="Motorista não encontrado"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/motoristas">Voltar</Link>
          </Button>
        }
      />
    );
  }

  const d = driver.data;

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
        <Link to="/motoristas">
          <ArrowLeft className="size-4" />
          Motoristas
        </Link>
      </Button>

      <PageHeader
        title={d.name}
        description={`CNH ${d.licenseNo}`}
        actions={
          d.onShift ? (
            <StatusBadge tone="ok">Em turno</StatusBadge>
          ) : (
            <StatusBadge tone="neutral" dot={false}>
              Fora de turno
            </StatusBadge>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="kicker">Estado atual</p>
          <div className="mt-2">
            <SeverityPill severity={d.currentSeverity} score={d.currentScore} />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="size-3.5" />
            <span className="font-data">{d.phone}</span>
          </p>
        </Card>
        <StatCard
          label="Média de fadiga 7d"
          value={d.stats.avgScore7d}
          loading={history.isLoading}
          trend={history.data?.map((p) => p.score)}
        />
        <StatCard label="Alertas nesta semana" value={d.stats.eventsThisWeek} />
        <StatCard
          label="Horas dirigidas 7d"
          value={`${d.stats.hoursDrivenThisWeek} h`}
          hint={
            d.shiftStartedAt
              ? `turno desde ${formatRelative(d.shiftStartedAt)}`
              : undefined
          }
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Pontuação média diária — 21 dias</CardTitle>
          </CardHeader>
          <CardContent>
            {history.isLoading || !history.data ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ScoreTimeSeries data={history.data} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Veículo designado</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicle.data ? (
              <div className="space-y-2 text-sm">
                <p className="font-data text-base font-semibold">
                  {formatPlate(vehicle.data.plate)}
                </p>
                <p className="text-muted-foreground">
                  {vehicle.data.make} {vehicle.data.model} · {vehicle.data.year}
                </p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link to={`/dispositivos/${vehicle.data.deviceId}`}>
                    Ver dispositivo
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem veículo designado.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Viagens recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {trips.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : trips.data && trips.data.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {trips.data.map((trip) => (
                <li key={trip.id} className="flex items-center gap-3 py-2.5 text-xs">
                  <span className="flex items-center gap-1 font-data text-muted-foreground">
                    <Clock className="size-3" />
                    {formatDateTime(trip.startedAt)}
                  </span>
                  <span className="flex-1 text-muted-foreground">
                    {formatDuration(
                      (Date.parse(trip.lastEventAt) - Date.parse(trip.startedAt)) / 1000,
                    )}
                  </span>
                  <span>
                    {trip.alertCount} {trip.alertCount === 1 ? "alerta" : "alertas"}
                  </span>
                  <span className="font-data">pico {trip.maxScore}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma viagem nos últimos 7 dias.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Alertas recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {events.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : events.data && events.data.rows.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {events.data.rows.map((event) => (
                <li key={event.id}>
                  <Link
                    to={`/alertas/${event.id}`}
                    className="flex items-center gap-3 py-2.5 hover:bg-muted/40"
                  >
                    <SeverityPill
                      severity={event.severity}
                      score={event.score}
                      showDot={false}
                    />
                    <span className="flex-1 truncate text-xs text-muted-foreground">
                      {event.triggers.map((t) => TRIGGER_LABEL[t] ?? t).join(" · ")}
                    </span>
                    <span className="flex items-center gap-1 font-data text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {formatDateTime(event.timestamp)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum alerta registrado para este motorista.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
