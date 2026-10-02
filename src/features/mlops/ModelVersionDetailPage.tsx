import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Boxes } from "lucide-react";

import type { ModelMetrics } from "@/api/types";
import { useModelVersion, useModelVersions } from "@/api/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MODEL_STATUS } from "@/lib/status";
import { formatDateTime, formatPercent } from "@/lib/format";

const METRIC_LABEL: Record<keyof ModelMetrics, string> = {
  accuracy: "Acurácia",
  precision: "Precisão",
  recall: "Recall (sensibilidade)",
  falseAlarmRate: "Taxa de falsos alarmes",
};

export function ModelVersionDetailPage() {
  const { modelId } = useParams();
  const model = useModelVersion(modelId);
  const all = useModelVersions();

  if (model.isLoading) {
    return (
      <>
        <PageHeader title="Versão do modelo" />
        <Skeleton className="h-40 w-full" />
      </>
    );
  }

  if (!model.data) {
    return (
      <EmptyState
        icon={Boxes}
        title="Versão não encontrada"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/ml/modelos">Voltar</Link>
          </Button>
        }
      />
    );
  }

  const m = model.data;
  const deployed = all.data?.find((v) => v.status === "deployed");
  const isDeployed = m.status === "deployed";

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
        <Link to="/ml/modelos">
          <ArrowLeft className="size-4" />
          Versões do modelo
        </Link>
      </Button>

      <PageHeader
        title={`Modelo ${m.version}`}
        description={`Treinado em ${formatDateTime(m.trainedAt)}`}
        actions={
          <StatusBadge tone={MODEL_STATUS[m.status].tone}>
            {MODEL_STATUS[m.status].label}
          </StatusBadge>
        }
      />

      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">{m.notes}</p>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">
              Métricas{" "}
              {deployed && !isDeployed && (
                <span className="font-normal text-muted-foreground">
                  · comparação com produção ({deployed.version})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(Object.keys(METRIC_LABEL) as (keyof ModelMetrics)[]).map((key) => {
              const value = m.metrics[key];
              const ref = deployed?.metrics[key];
              const lowerIsBetter = key === "falseAlarmRate";
              const diff = ref !== undefined ? value - ref : 0;
              const better = lowerIsBetter ? diff < 0 : diff > 0;
              return (
                <div key={key}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">
                      {METRIC_LABEL[key]}
                    </span>
                    <span className="font-data tabular-nums">
                      {formatPercent(value)}
                      {deployed && !isDeployed && ref !== undefined && (
                        <span
                          className={
                            "ml-2 text-xs " +
                            (Math.abs(diff) < 0.001
                              ? "text-muted-foreground"
                              : better
                                ? "text-status-success"
                                : "text-status-danger")
                          }
                        >
                          {diff > 0 ? "+" : ""}
                          {(diff * 100).toFixed(1)} pp
                        </span>
                      )}
                    </span>
                  </div>
                  <Progress
                    value={
                      lowerIsBetter ? Math.max(0, 100 - value * 100 * 4) : value * 100
                    }
                    className="mt-1.5"
                    indicatorClassName={
                      lowerIsBetter ? "bg-status-warning" : undefined
                    }
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Implantação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-data text-3xl font-semibold">{m.rolloutPct}%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              da frota — {m.deviceCount} dispositivos
            </p>
            <Progress value={m.rolloutPct} className="mt-3" />
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/ml/implantacao">Ver painel de implantação</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
