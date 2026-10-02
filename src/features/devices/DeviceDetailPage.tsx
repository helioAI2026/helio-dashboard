import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Camera, Cpu, HardDrive, RefreshCw, Wifi } from "lucide-react";

import {
  useDevice,
  useForceDeviceSync,
  useModelVersions,
  useVehicle,
} from "@/api/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CAMERA_STATUS, CONNECTIVITY_STATUS, MODEL_STATUS } from "@/lib/status";
import { formatDateTime, formatNumber, formatPlate } from "@/lib/format";

export function DeviceDetailPage() {
  const { deviceId } = useParams();
  const device = useDevice(deviceId);
  const vehicle = useVehicle(device.data?.vehicleId);
  const models = useModelVersions();
  const forceSync = useForceDeviceSync();

  if (device.isLoading) {
    return (
      <>
        <PageHeader title="Dispositivo" />
        <Skeleton className="h-40 w-full" />
      </>
    );
  }

  if (!device.data) {
    return (
      <EmptyState
        icon={Cpu}
        title="Dispositivo não encontrado"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/dispositivos">Voltar</Link>
          </Button>
        }
      />
    );
  }

  const dev = device.data;
  const conn = CONNECTIVITY_STATUS[dev.connectivity];
  const cam = CAMERA_STATUS[dev.cameraStatus];
  const model = models.data?.find((m) => m.id === dev.deployedModelVersionId);

  function handleSync() {
    forceSync.mutate(dev.id, {
      onSuccess: () =>
        toast.success("Sincronização solicitada", {
          description: `${dev.id} · quadros enviados ao Greengrass`,
        }),
    });
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
        <Link to="/dispositivos">
          <ArrowLeft className="size-4" />
          Dispositivos
        </Link>
      </Button>

      <PageHeader
        title={dev.id}
        description={`${dev.hardwareModel} · firmware ${dev.firmwareVersion}`}
        actions={
          <Button
            size="sm"
            onClick={handleSync}
            disabled={forceSync.isPending || dev.connectivity === "offline"}
          >
            <RefreshCw
              className={forceSync.isPending ? "size-4 animate-spin" : "size-4"}
            />
            Forçar sincronização
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="p-4">
          <p className="kicker flex items-center gap-1.5">
            <Wifi className="size-3.5" /> Conectividade
          </p>
          <div className="mt-2">
            <StatusBadge tone={conn.tone}>{conn.label}</StatusBadge>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Última sincronização
            <br />
            <span className="font-data text-foreground">
              {formatDateTime(dev.lastSyncAt)}
            </span>
          </p>
        </Card>

        <Card className="p-4">
          <p className="kicker flex items-center gap-1.5">
            <Camera className="size-3.5" /> Câmera infravermelha
          </p>
          <div className="mt-2">
            <StatusBadge tone={cam.tone} dot={cam.tone !== "ok"}>
              {cam.label}
            </StatusBadge>
          </div>
        </Card>

        <Card className="p-4">
          <p className="kicker flex items-center gap-1.5">
            <HardDrive className="size-3.5" /> Armazenamento local
          </p>
          <p className="mt-2 font-data text-lg font-semibold">
            {dev.storageUsedPct}%
          </p>
          <Progress
            value={dev.storageUsedPct}
            className="mt-2"
            indicatorClassName={
              dev.storageUsedPct > 85 ? "bg-status-danger" : undefined
            }
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Buffer de quadros — AWS Greengrass</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-data text-3xl font-semibold">
              {formatNumber(dev.bufferedFrames)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {dev.connectivity === "offline"
                ? "quadros aguardando conexão para envio e retreinamento"
                : "quadros na fila de upload para o Greengrass"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Modelo implantado</CardTitle>
          </CardHeader>
          <CardContent>
            {model ? (
              <div className="space-y-2 text-sm">
                <p className="font-data text-lg font-semibold">{model.version}</p>
                <StatusBadge tone={MODEL_STATUS[model.status].tone}>
                  {MODEL_STATUS[model.status].label}
                </StatusBadge>
                <p className="text-xs text-muted-foreground">
                  Acurácia{" "}
                  <span className="font-data text-foreground">
                    {(model.metrics.accuracy * 100).toFixed(1)}%
                  </span>{" "}
                  · treinado em {formatDateTime(model.trainedAt)}
                </p>
                <Button variant="outline" size="sm" className="mt-1" asChild>
                  <Link to="/ml/modelos">Ver versões do modelo</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Versão do modelo desconhecida.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {vehicle.data && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Veículo</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm">
              <p className="font-data font-semibold">
                {formatPlate(vehicle.data.plate)}
              </p>
              <p className="text-muted-foreground">
                {vehicle.data.make} {vehicle.data.model} · {vehicle.data.year}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/mapa">Ver no mapa</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
