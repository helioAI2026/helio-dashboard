import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Check, Clock, MapPin, ScanFace } from "lucide-react";

import { useAcknowledgeEvent, useDriver, useEvent, useVehicle } from "@/api/queries";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { SeverityPill } from "@/components/common/SeverityPill";
import { DrowsinessGauge } from "@/components/charts/DrowsinessGauge";
import { formatDateTime, formatDuration, formatCoords, formatPlate } from "@/lib/format";
import { TRIGGER_LABEL } from "@/lib/status";

type AlertDetailDrawerProps = {
  eventId: string | null;
  onClose: () => void;
};

export function AlertDetailDrawer({ eventId, onClose }: AlertDetailDrawerProps) {
  const event = useEvent(eventId ?? undefined);
  const vehicle = useVehicle(event.data?.vehicleId);
  const driver = useDriver(event.data?.driverId);
  const acknowledge = useAcknowledgeEvent();

  const [showLandmarks, setShowLandmarks] = useState(true);

  useEffect(() => {
    if (eventId) setShowLandmarks(true);
  }, [eventId]);

  function handleAcknowledge() {
    if (!event.data) return;
    acknowledge.mutate(
      { id: event.data.id },
      {
        onSuccess: () =>
          toast.success("Alerta reconhecido", {
            description: `${event.data ? event.data.id : ""} · ${driver.data?.name ?? ""}`,
          }),
      },
    );
  }

  return (
    <Sheet open={Boolean(eventId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Detalhe do alerta
            {event.data && (
              <span className="font-data text-xs font-normal text-muted-foreground">
                {event.data.id}
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            {event.data
              ? formatDateTime(event.data.timestamp)
              : "Carregando…"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {event.isLoading || !event.data ? (
            <div className="space-y-4">
              <Skeleton className="aspect-[4/3] w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <>
              {/* IR frame + landmarks */}
              <div className="relative overflow-hidden rounded-lg border border-border bg-black">
                <img
                  src={event.data.frames.ir}
                  alt="Quadro em infravermelho no momento do alerta"
                  className="w-full"
                  width={320}
                  height={240}
                />
                {showLandmarks && (
                  <img
                    src={event.data.frames.landmarks}
                    alt="Marcos faciais detectados"
                    className="pointer-events-none absolute inset-0 size-full"
                  />
                )}
                <div className="absolute left-2 top-2">
                  <SeverityPill
                    severity={event.data.severity}
                    score={event.data.score}
                  />
                </div>
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={showLandmarks}
                  onCheckedChange={setShowLandmarks}
                />
                <ScanFace className="size-3.5" />
                Sobrepor marcos faciais
              </label>

              {/* Score + vehicle */}
              <div className="mt-4 flex items-center gap-4 rounded-lg border border-border bg-card p-3">
                <DrowsinessGauge score={event.data.score} size={92} showLabel={false} />
                <div className="min-w-0 text-sm">
                  <p className="font-data font-medium">
                    {vehicle.data
                      ? formatPlate(vehicle.data.plate)
                      : event.data.vehicleId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {vehicle.data
                      ? `${vehicle.data.make} ${vehicle.data.model}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs">
                    {driver.data?.name ?? "—"}
                  </p>
                </div>
              </div>

              {/* Triggers */}
              <div className="mt-4">
                <p className="kicker mb-2">Gatilhos detectados</p>
                <ul className="space-y-1.5">
                  {event.data.triggers.map((t) => (
                    <li
                      key={t}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="size-1.5 rounded-full bg-severity-drowsy" />
                      {TRIGGER_LABEL[t] ?? t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Facts */}
              <dl className="mt-4 divide-y divide-border/60 text-sm">
                <div className="flex items-center justify-between py-2">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="size-3.5" /> Duração
                  </dt>
                  <dd className="font-data">
                    {formatDuration(event.data.durationSec)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-3.5" /> Local
                  </dt>
                  <dd className="font-data text-xs">
                    {formatCoords(
                      event.data.location.lat,
                      event.data.location.lng,
                    )}
                  </dd>
                </div>
              </dl>

              {event.data.acknowledgedAt && (
                <p className="mt-4 flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <Check className="size-3.5 text-status-success" />
                  Reconhecido por {event.data.acknowledgedBy} em{" "}
                  {formatDateTime(event.data.acknowledgedAt)}
                </p>
              )}

              {driver.data && (
                <Button variant="link" size="sm" className="mt-2 h-auto px-0" asChild>
                  <Link to={`/motoristas/${driver.data.id}`}>
                    Ver histórico do motorista
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>

        {event.data && !event.data.acknowledgedAt && (
          <SheetFooter>
            <Button
              className="w-full"
              onClick={handleAcknowledge}
              disabled={acknowledge.isPending}
            >
              <Check className="size-4" />
              {acknowledge.isPending ? "Reconhecendo…" : "Reconhecer alerta"}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
