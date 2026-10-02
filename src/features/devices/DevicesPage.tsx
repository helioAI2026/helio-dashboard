import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Cpu } from "lucide-react";

import type { Device } from "@/api/types";
import { useDevices, useVehicles } from "@/api/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Input } from "@/components/ui/input";
import { CAMERA_STATUS, CONNECTIVITY_STATUS } from "@/lib/status";
import { formatNumber, formatPlate, formatRelative } from "@/lib/format";

export function DevicesPage() {
  const devices = useDevices();
  const vehicles = useVehicles();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const plateByVehicle = useMemo(
    () => new Map((vehicles.data ?? []).map((v) => [v.id, v.plate])),
    [vehicles.data],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = devices.data ?? [];
    if (!q) return list;
    return list.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.hardwareModel.toLowerCase().includes(q) ||
        plateByVehicle.get(d.vehicleId)?.toLowerCase().includes(q),
    );
  }, [devices.data, search, plateByVehicle]);

  const columns = useMemo<ColumnDef<Device, unknown>[]>(
    () => [
      {
        header: "Dispositivo",
        accessorKey: "id",
        cell: ({ row }) => (
          <div>
            <p className="font-data font-medium">{row.original.id}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.hardwareModel} · fw{" "}
              <span className="font-data">{row.original.firmwareVersion}</span>
            </p>
          </div>
        ),
      },
      {
        header: "Veículo",
        cell: ({ row }) => (
          <span className="font-data">
            {formatPlate(plateByVehicle.get(row.original.vehicleId) ?? "—")}
          </span>
        ),
      },
      {
        header: "Conexão",
        cell: ({ row }) => {
          const c = CONNECTIVITY_STATUS[row.original.connectivity];
          return <StatusBadge tone={c.tone}>{c.label}</StatusBadge>;
        },
      },
      {
        header: "Câmera",
        cell: ({ row }) => {
          const c = CAMERA_STATUS[row.original.cameraStatus];
          return (
            <StatusBadge tone={c.tone} dot={c.tone !== "ok"}>
              {c.label}
            </StatusBadge>
          );
        },
      },
      {
        header: "Última sinc.",
        accessorKey: "lastSyncAt",
        cell: ({ row }) => (
          <span className="font-data text-xs text-muted-foreground">
            {formatRelative(row.original.lastSyncAt)}
          </span>
        ),
      },
      {
        header: "Quadros p/ envio",
        accessorKey: "bufferedFrames",
        cell: ({ row }) => (
          <span
            className={
              "font-data tabular-nums " +
              (row.original.bufferedFrames > 1000 ? "text-status-warning" : "")
            }
          >
            {formatNumber(row.original.bufferedFrames)}
          </span>
        ),
      },
    ],
    [plateByVehicle],
  );

  return (
    <>
      <PageHeader
        title="Dispositivos"
        description="Unidades de borda Helio: conectividade, sincronização com o Greengrass e saúde da câmera."
      />

      <div className="mb-3 flex items-center justify-between gap-3">
        <Input
          placeholder="Buscar por ID, modelo ou placa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground">
          <span className="font-data tabular-nums text-foreground">
            {rows.length}
          </span>{" "}
          {rows.length === 1 ? "dispositivo" : "dispositivos"}
        </span>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={devices.isLoading}
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/dispositivos/${row.id}`)}
        emptyState={
          <EmptyState
            icon={Cpu}
            title="Nenhum dispositivo encontrado"
            description="Ajuste a busca para ver outras unidades."
          />
        }
      />
    </>
  );
}
