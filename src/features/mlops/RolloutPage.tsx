import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";

import { useDevices, useModelVersions } from "@/api/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MODEL_STATUS } from "@/lib/status";
import { formatDate, formatPercent } from "@/lib/format";

export function RolloutPage() {
  const models = useModelVersions();
  const devices = useDevices();

  const deployed = models.data?.find((m) => m.status === "deployed");
  const staged = models.data?.find((m) => m.status === "staged");
  const candidate = models.data?.find((m) => m.status === "candidate");

  const adoption = (() => {
    const list = devices.data ?? [];
    if (!list.length) return {} as Record<string, number>;
    return list.reduce<Record<string, number>>((acc, d) => {
      acc[d.deployedModelVersionId] = (acc[d.deployedModelVersionId] ?? 0) + 1;
      return acc;
    }, {});
  })();

  const totalDevices = devices.data?.length ?? 0;

  if (models.isLoading || devices.isLoading) {
    return (
      <>
        <PageHeader title="Implantação" />
        <Skeleton className="h-48 w-full" />
      </>
    );
  }

  if (!deployed) {
    return (
      <EmptyState icon={Rocket} title="Nenhum modelo em produção" />
    );
  }

  return (
    <>
      <PageHeader
        title="Implantação"
        description="Implantação gradual do modelo de fadiga e adoção por dispositivo."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">Produção</CardTitle>
            <StatusBadge tone={MODEL_STATUS.deployed.tone}>
              {MODEL_STATUS.deployed.label}
            </StatusBadge>
          </CardHeader>
          <CardContent>
            <p className="font-data text-2xl font-semibold">{deployed.version}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Acurácia {formatPercent(deployed.metrics.accuracy)} · desde{" "}
              {formatDate(deployed.trainedAt)}
            </p>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Cobertura da frota</span>
                <span className="font-data">{deployed.rolloutPct}%</span>
              </div>
              <Progress value={deployed.rolloutPct} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">Implantação gradual</CardTitle>
            {staged && (
              <StatusBadge tone={MODEL_STATUS.staged.tone}>
                {MODEL_STATUS.staged.label}
              </StatusBadge>
            )}
          </CardHeader>
          <CardContent>
            {staged ? (
              <>
                <p className="font-data text-2xl font-semibold">
                  {staged.version}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Frota piloto — {staged.deviceCount} dispositivos
                </p>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Progresso da implantação</span>
                    <span className="font-data">{staged.rolloutPct}%</span>
                  </div>
                  <Progress
                    value={staged.rolloutPct}
                    indicatorClassName="bg-status-warning"
                  />
                </div>
                {candidate && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Próximo candidato:{" "}
                    <Link
                      to={`/ml/modelos/${candidate.id}`}
                      className="font-data text-foreground underline-offset-2 hover:underline"
                    >
                      {candidate.version}
                    </Link>{" "}
                    — aguardando avaliação
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma implantação gradual em andamento.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Adoção por versão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(adoption)
            .sort((a, b) => b[1] - a[1])
            .map(([modelId, count]) => {
              const version = models.data?.find((m) => m.id === modelId);
              const pct = totalDevices ? (count / totalDevices) * 100 : 0;
              return (
                <div key={modelId}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-data">
                      {version?.version ?? modelId}
                      {version && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {MODEL_STATUS[version.status].label}
                        </span>
                      )}
                    </span>
                    <span className="font-data tabular-nums text-muted-foreground">
                      {count} disp. · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
        </CardContent>
      </Card>
    </>
  );
}
