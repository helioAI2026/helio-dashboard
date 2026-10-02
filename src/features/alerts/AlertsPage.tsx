import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Activity, Check, X } from "lucide-react";

import type { DrowsinessEvent } from "@/api/types";
import { useDrivers, useEvents, useVehicles } from "@/api/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { SeverityPill } from "@/components/common/SeverityPill";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatPlate, formatRelative } from "@/lib/format";
import { TRIGGER_LABEL } from "@/lib/status";
import { SEVERITY_CSS_VAR, SEVERITY_LABEL_SHORT, SEVERITY_ORDER } from "@/lib/severity";
import { AlertDetailDrawer } from "./AlertDetailDrawer";
import { PERIOD_LABEL, useAlertFilters, type AlertPeriod } from "./useAlertFilters";

export function AlertsPage() {
  const { state, update, reset, query, hasActiveFilters, pageSize } = useAlertFilters();
  const navigate = useNavigate();
  const { alertId } = useParams();

  const events = useEvents(query);
  const vehicles = useVehicles();
  const drivers = useDrivers();

  const vehicleById = useMemo(
    () => new Map((vehicles.data ?? []).map((v) => [v.id, v])),
    [vehicles.data],
  );
  const driverById = useMemo(
    () => new Map((drivers.data ?? []).map((d) => [d.id, d])),
    [drivers.data],
  );

  const columns = useMemo<ColumnDef<DrowsinessEvent, unknown>[]>(
    () => [
      {
        header: "Nível",
        accessorKey: "severity",
        cell: ({ row }) => (
          <SeverityPill severity={row.original.severity} score={row.original.score} />
        ),
      },
      {
        header: "Veículo",
        cell: ({ row }) => {
          const v = row.original.vehicleId
            ? vehicleById.get(row.original.vehicleId)
            : undefined;
          return (
            <div>
              <p className="font-data font-medium">
                {v ? formatPlate(v.plate) : (row.original.vehicleId ?? "—")}
              </p>
              <p className="text-xs text-muted-foreground">
                {v ? `${v.make} ${v.model}` : ""}
              </p>
            </div>
          );
        },
      },
      {
        header: "Motorista",
        cell: ({ row }) =>
          (row.original.driverId
            ? driverById.get(row.original.driverId)?.name
            : undefined) ?? "—",
      },
      {
        header: "Gatilhos",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.triggers.slice(0, 2).map((t) => (
              <Badge key={t} variant="secondary" className="font-normal">
                {TRIGGER_LABEL[t] ?? t}
              </Badge>
            ))}
            {row.original.triggers.length > 2 && (
              <Badge variant="outline">+{row.original.triggers.length - 2}</Badge>
            )}
          </div>
        ),
      },
      {
        header: "Quando",
        accessorKey: "timestamp",
        cell: ({ row }) => (
          <span className="font-data text-xs text-muted-foreground">
            {formatRelative(row.original.timestamp)}
          </span>
        ),
      },
      {
        header: "Status",
        cell: ({ row }) =>
          row.original.acknowledgedAt ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="size-3.5 text-status-success" />
              Reconhecido
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-status-warning">
              <span className="size-1.5 rounded-full bg-status-warning" />
              Pendente
            </span>
          ),
      },
    ],
    [vehicleById, driverById],
  );

  const total = events.data?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Alertas de fadiga"
        description="Detecções de sonolência com imagem em infravermelho e marcos faciais."
      />

      {/* Filter bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
          {SEVERITY_ORDER.map((level) => {
            const active = state.severity.includes(level);
            return (
              <button
                key={level}
                onClick={() =>
                  update({
                    severity: active
                      ? state.severity.filter((s) => s !== level)
                      : [...state.severity, level],
                  })
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={active}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: SEVERITY_CSS_VAR[level] }}
                />
                {SEVERITY_LABEL_SHORT[level]}
              </button>
            );
          })}
        </div>

        <Select
          value={state.acknowledged}
          onValueChange={(v) => update({ acknowledged: v as typeof state.acknowledged })}
        >
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="open">Pendentes</SelectItem>
            <SelectItem value="done">Reconhecidos</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={state.period}
          onValueChange={(v) => update({ period: v as AlertPeriod })}
        >
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABEL) as AlertPeriod[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PERIOD_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="size-3.5" />
            Limpar
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          <span className="font-data tabular-nums text-foreground">{total}</span>{" "}
          {total === 1 ? "alerta" : "alertas"}
        </span>
      </div>

      <DataTable
        columns={columns}
        data={events.data?.rows ?? []}
        isLoading={events.isLoading}
        skeletonRows={pageSize}
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/alertas/${row.id}`)}
        emptyState={
          <EmptyState
            icon={Activity}
            title="Nenhum alerta no período"
            description="Ajuste os filtros ou amplie o intervalo de datas."
          />
        }
      />

      {total > pageSize && (
        <Pagination
          page={state.page}
          pageSize={pageSize}
          total={total}
          onPageChange={(page) => update({ page })}
        />
      )}

      <AlertDetailDrawer eventId={alertId ?? null} onClose={() => navigate("/alertas")} />
    </>
  );
}
