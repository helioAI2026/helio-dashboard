import { Link } from "react-router-dom";
import { ArrowUpRight, Gauge, Phone, X } from "lucide-react";

import type { Device, Driver, ModelVersion, Vehicle } from "@/api/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DrowsinessGauge } from "@/components/charts/DrowsinessGauge";
import { VEHICLE_STATUS, CONNECTIVITY_STATUS } from "@/lib/status";
import { formatPlate, formatRelative, formatCoords } from "@/lib/format";

type VehicleMapPanelProps = {
  vehicle: Vehicle;
  driver?: Driver;
  device?: Device;
  model?: ModelVersion;
  onClose: () => void;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="kicker">{label}</dt>
      <dd className="text-right text-sm">{children}</dd>
    </div>
  );
}

export function VehicleMapPanel({
  vehicle,
  driver,
  device,
  model,
  onClose,
}: VehicleMapPanelProps) {
  const status = VEHICLE_STATUS[vehicle.status];
  const conn = device ? CONNECTIVITY_STATUS[device.connectivity] : null;

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-10 flex max-h-[calc(100%-1.5rem)] w-80 flex-col overflow-hidden rounded-lg border border-border bg-card/95 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-2 border-b border-border p-4">
        <div>
          <p className="font-data text-lg font-semibold leading-none">
            {formatPlate(vehicle.plate)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {vehicle.make} {vehicle.model} · {vehicle.year}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-1 -mt-1 size-7 shrink-0"
          onClick={onClose}
          aria-label="Fechar painel"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="overflow-y-auto p-4">
        <div className="flex items-center gap-4">
          <DrowsinessGauge score={vehicle.currentScore} size={104} />
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Gauge className="size-3.5" />
              <span className="font-data text-sm text-foreground">
                {Math.round(vehicle.location.speedKph)}
              </span>{" "}
              km/h
            </div>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            {conn && <StatusBadge tone={conn.tone}>{conn.label}</StatusBadge>}
          </div>
        </div>

        <dl className="mt-4 divide-y divide-border/60">
          <Row label="Motorista">
            {driver ? (
              <div>
                <p className="font-medium">{driver.name}</p>
                <p className="flex items-center justify-end gap-1 font-data text-xs text-muted-foreground">
                  <Phone className="size-3" />
                  {driver.phone}
                </p>
              </div>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Dispositivo">
            {device ? (
              <span className="font-data">{device.hardwareModel}</span>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Firmware">
            <span className="font-data">{device?.firmwareVersion ?? "—"}</span>
          </Row>
          <Row label="Modelo implantado">
            <span className="font-data">{model?.version ?? "—"}</span>
          </Row>
          <Row label="Direção">
            <span className="font-data">
              {Math.round(vehicle.location.heading)}°
            </span>
          </Row>
          <Row label="Coordenadas">
            <span className="font-data text-xs">
              {formatCoords(vehicle.location.lat, vehicle.location.lng)}
            </span>
          </Row>
          <Row label="Última comunicação">
            <span className="font-data text-xs">
              {formatRelative(vehicle.lastSeenAt)}
            </span>
          </Row>
        </dl>

        <div className="mt-4 flex gap-2">
          {driver && (
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link to={`/motoristas/${driver.id}`}>
                Motorista <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          )}
          {device && (
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link to={`/dispositivos/${device.id}`}>
                Dispositivo <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
