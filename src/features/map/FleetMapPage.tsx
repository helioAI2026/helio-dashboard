import { useMemo, useState } from "react";

import type { Severity } from "@/api/types";
import { useDevices, useDrivers, useModelVersions, useVehicles } from "@/api/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { FleetMap } from "@/components/map/FleetMap";
import { VehicleMapPanel } from "@/components/map/VehicleMapPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  SEVERITY_CSS_VAR,
  SEVERITY_LABEL_SHORT,
  SEVERITY_ORDER,
} from "@/lib/severity";

export function FleetMapPage() {
  const vehicles = useVehicles();
  const drivers = useDrivers();
  const devices = useDevices();
  const models = useModelVersions();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<Severity>>(new Set());

  const allVehicles = useMemo(() => vehicles.data ?? [], [vehicles.data]);

  const visibleVehicles = useMemo(
    () => allVehicles.filter((v) => !hidden.has(v.currentSeverity)),
    [allVehicles, hidden],
  );

  const selected = allVehicles.find((v) => v.id === selectedId) ?? null;
  const selectedDriver = drivers.data?.find((d) => d.id === selected?.driverId);
  const selectedDevice = devices.data?.find((d) => d.id === selected?.deviceId);
  const selectedModel = models.data?.find(
    (m) => m.id === selectedDevice?.deployedModelVersionId,
  );

  const counts = SEVERITY_ORDER.reduce(
    (acc, level) => {
      acc[level] = allVehicles.filter((v) => v.currentSeverity === level).length;
      return acc;
    },
    {} as Record<Severity, number>,
  );

  function toggle(level: Severity) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  return (
    <>
      <PageHeader
        title="Mapa da frota"
        description="Posição ao vivo de cada caminhão com o dispositivo Helio ativo. Clique em uma unidade para ver os detalhes."
      />

      <div className="relative h-[calc(100svh-11rem)] min-h-[440px] overflow-hidden rounded-lg border border-border bg-muted">
        {vehicles.isLoading ? (
          <Skeleton className="size-full" />
        ) : (
          <>
            <FleetMap
              vehicles={visibleVehicles}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            {/* Legend + filter */}
            <div className="pointer-events-auto absolute left-3 top-3 z-10 rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
              <p className="kicker mb-2">Filtrar por nível</p>
              <div className="flex flex-col gap-1">
                {SEVERITY_ORDER.map((level) => {
                  const off = hidden.has(level);
                  return (
                    <button
                      key={level}
                      onClick={() => toggle(level)}
                      className={cn(
                        "flex items-center gap-2 rounded px-1.5 py-1 text-xs transition-opacity",
                        off && "opacity-35",
                      )}
                    >
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: SEVERITY_CSS_VAR[level] }}
                      />
                      <span className="text-foreground">
                        {SEVERITY_LABEL_SHORT[level]}
                      </span>
                      <span className="ml-auto font-data tabular-nums text-muted-foreground">
                        {counts[level]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selected && (
              <VehicleMapPanel
                vehicle={selected}
                driver={selectedDriver}
                device={selectedDevice}
                model={selectedModel}
                onClose={() => setSelectedId(null)}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
