import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Boxes } from "lucide-react";

import type { ModelVersion } from "@/api/types";
import { useModelVersions } from "@/api/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MODEL_STATUS } from "@/lib/status";
import { formatDate, formatPercent } from "@/lib/format";

export function ModelVersionsPage() {
  const models = useModelVersions();
  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<ModelVersion, unknown>[]>(
    () => [
      {
        header: "Versão",
        accessorKey: "version",
        cell: ({ row }) => (
          <span className="font-data font-medium">{row.original.version}</span>
        ),
      },
      {
        header: "Status",
        cell: ({ row }) => {
          const s = MODEL_STATUS[row.original.status];
          return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
        },
      },
      {
        header: "Acurácia",
        accessorFn: (m) => m.metrics.accuracy,
        id: "accuracy",
        cell: ({ row }) => (
          <span className="font-data tabular-nums">
            {formatPercent(row.original.metrics.accuracy)}
          </span>
        ),
      },
      {
        header: "Recall",
        accessorFn: (m) => m.metrics.recall,
        id: "recall",
        cell: ({ row }) => (
          <span className="font-data tabular-nums">
            {formatPercent(row.original.metrics.recall)}
          </span>
        ),
      },
      {
        header: "Falsos alarmes",
        accessorFn: (m) => m.metrics.falseAlarmRate,
        id: "far",
        cell: ({ row }) => (
          <span className="font-data tabular-nums">
            {formatPercent(row.original.metrics.falseAlarmRate)}
          </span>
        ),
      },
      {
        header: "Frota",
        accessorKey: "rolloutPct",
        cell: ({ row }) =>
          row.original.rolloutPct > 0 ? (
            <span className="font-data tabular-nums">
              {row.original.rolloutPct}%{" "}
              <span className="text-muted-foreground">
                ({row.original.deviceCount})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        header: "Treinado",
        accessorKey: "trainedAt",
        cell: ({ row }) => (
          <span className="font-data text-xs text-muted-foreground">
            {formatDate(row.original.trainedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Versões do modelo"
        description="Modelos de detecção de fadiga treinados no Greengrass, com métricas e status de implantação."
      />
      <DataTable
        columns={columns}
        data={models.data ?? []}
        isLoading={models.isLoading}
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/ml/modelos/${row.id}`)}
        emptyState={<EmptyState icon={Boxes} title="Nenhuma versão de modelo" />}
      />
    </>
  );
}
