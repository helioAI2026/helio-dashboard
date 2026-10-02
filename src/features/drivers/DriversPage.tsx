import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Users } from "lucide-react";

import type { Driver } from "@/api/types";
import { useDrivers, useVehicles } from "@/api/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { SeverityPill } from "@/components/common/SeverityPill";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Input } from "@/components/ui/input";
import { formatPlate } from "@/lib/format";

export function DriversPage() {
  const drivers = useDrivers();
  const vehicles = useVehicles();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const plateByVehicle = useMemo(
    () => new Map((vehicles.data ?? []).map((v) => [v.id, v.plate])),
    [vehicles.data],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = drivers.data ?? [];
    if (!q) return list;
    return list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.licenseNo.includes(q) ||
        (d.assignedVehicleId &&
          plateByVehicle.get(d.assignedVehicleId)?.toLowerCase().includes(q)),
    );
  }, [drivers.data, search, plateByVehicle]);

  const columns = useMemo<ColumnDef<Driver, unknown>[]>(
    () => [
      {
        header: "Motorista",
        accessorKey: "name",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="font-data text-xs text-muted-foreground">
              CNH {row.original.licenseNo}
            </p>
          </div>
        ),
      },
      {
        header: "Veículo",
        cell: ({ row }) =>
          row.original.assignedVehicleId ? (
            <span className="font-data">
              {formatPlate(plateByVehicle.get(row.original.assignedVehicleId) ?? "—")}
            </span>
          ) : (
            <span className="text-muted-foreground">Sem veículo</span>
          ),
      },
      {
        header: "Estado atual",
        accessorKey: "currentScore",
        cell: ({ row }) => (
          <SeverityPill
            severity={row.original.currentSeverity}
            score={row.original.currentScore}
          />
        ),
      },
      {
        header: "Turno",
        cell: ({ row }) =>
          row.original.onShift ? (
            <StatusBadge tone="ok">Em turno</StatusBadge>
          ) : (
            <StatusBadge tone="neutral" dot={false}>
              Fora de turno
            </StatusBadge>
          ),
      },
      {
        header: "Alertas 7d",
        accessorFn: (d) => d.stats.eventsThisWeek,
        id: "eventsThisWeek",
        cell: ({ row }) => (
          <span className="font-data tabular-nums">
            {row.original.stats.eventsThisWeek}
          </span>
        ),
      },
      {
        header: "Média 7d",
        accessorFn: (d) => d.stats.avgScore7d,
        id: "avgScore7d",
        cell: ({ row }) => (
          <span className="font-data tabular-nums">{row.original.stats.avgScore7d}</span>
        ),
      },
      {
        header: "Horas 7d",
        accessorFn: (d) => d.stats.hoursDrivenThisWeek,
        id: "hours",
        cell: ({ row }) => (
          <span className="font-data tabular-nums">
            {row.original.stats.hoursDrivenThisWeek} h
          </span>
        ),
      },
    ],
    [plateByVehicle],
  );

  return (
    <>
      <PageHeader
        title="Motoristas"
        description="Estado de fadiga, turnos e histórico de alertas por motorista."
      />

      <div className="mb-3 flex items-center justify-between gap-3">
        <Input
          placeholder="Buscar por nome, CNH ou placa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground">
          <span className="font-data tabular-nums text-foreground">{rows.length}</span>{" "}
          {rows.length === 1 ? "motorista" : "motoristas"}
        </span>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={drivers.isLoading}
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/motoristas/${row.id}`)}
        emptyState={
          <EmptyState
            icon={Users}
            title="Nenhum motorista encontrado"
            description="Ajuste a busca para ver outros motoristas."
          />
        }
      />
    </>
  );
}
