import { Check, GraduationCap } from "lucide-react";

import type { TrainingJob, TrainingJobStatus } from "@/api/types";
import { useDevices, useTrainingJobs } from "@/api/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TRAINING_STATUS } from "@/lib/status";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const STAGES: { key: TrainingJobStatus; label: string }[] = [
  { key: "collecting", label: "Coleta" },
  { key: "training", label: "Treinamento" },
  { key: "evaluating", label: "Avaliação" },
  { key: "ready", label: "Pronto" },
  { key: "deployed", label: "Implantado" },
];

function stageIndex(status: TrainingJobStatus): number {
  if (status === "queued") return 0;
  if (status === "failed") return -1;
  return STAGES.findIndex((s) => s.key === status);
}

function PipelineStepper({ job }: { job: TrainingJob }) {
  const current = stageIndex(job.status);
  const failed = job.status === "failed";

  return (
    <ol className="flex items-center gap-1">
      {STAGES.map((stage, i) => {
        const done = current > i;
        const active = current === i;
        return (
          <li key={stage.key} className="flex flex-1 items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full border text-[10px] font-semibold",
                  done && "border-status-success bg-status-success/15 text-status-success",
                  active &&
                    !failed &&
                    "border-primary bg-primary/15 text-primary",
                  active && failed && "border-status-danger bg-status-danger/15 text-status-danger",
                  !done && !active && "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-[10px]",
                  active ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1",
                  current > i ? "bg-status-success" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function TrainingJobsPage() {
  const jobs = useTrainingJobs();
  const devices = useDevices();

  return (
    <>
      <PageHeader
        title="Treinamentos"
        description="Pipeline do AWS Greengrass: coleta de quadros, retreinamento, avaliação e liberação do modelo."
      />

      {jobs.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : jobs.data && jobs.data.length > 0 ? (
        <div className="space-y-4">
          {jobs.data.map((job) => {
            const status = TRAINING_STATUS[job.status];
            const running =
              job.status !== "deployed" && job.status !== "failed";
            return (
              <Card key={job.id}>
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {job.id}
                      <span className="font-data text-xs font-normal text-muted-foreground">
                        {job.greengrassJobId}
                      </span>
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Início {formatDateTime(job.startedAt)} · atualizado{" "}
                      {formatRelative(job.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge tone={status.tone} pulse={running}>
                    {status.label}
                  </StatusBadge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PipelineStepper job={job} />

                  {running && (
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>{status.label}</span>
                        <span className="font-data">
                          {Math.round(job.progressPct)}%
                        </span>
                      </div>
                      <Progress value={job.progressPct} />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                    <div>
                      <p className="kicker">Amostras</p>
                      <p className="font-data font-medium">
                        {formatNumber(job.sampleCount)}
                      </p>
                    </div>
                    <div>
                      <p className="kicker">Dispositivos de origem</p>
                      <p className="font-data font-medium">
                        {job.sourceDeviceIds.length}
                        <span className="text-muted-foreground">
                          {" "}
                          / {devices.data?.length ?? "—"}
                        </span>
                      </p>
                    </div>
                    {job.resultingModelVersionId && (
                      <div>
                        <p className="kicker">Modelo gerado</p>
                        <p className="font-data font-medium">
                          {job.resultingModelVersionId
                            .replace("mdl_", "")
                            .replace(/_/g, ".")}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="Nenhum treinamento em andamento"
          description="Os dispositivos ainda estão acumulando quadros para o próximo ciclo."
        />
      )}
    </>
  );
}
