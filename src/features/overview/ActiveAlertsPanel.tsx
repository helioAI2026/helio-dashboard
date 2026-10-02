import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import type { DrowsinessEvent, Vehicle } from "@/api/types";
import { SeverityPill } from "@/components/common/SeverityPill";
import { formatPlate, formatRelative } from "@/lib/format";
import { TRIGGER_LABEL } from "@/lib/status";

type ActiveAlertsPanelProps = {
  events: DrowsinessEvent[];
  vehicles: Vehicle[];
};

export function ActiveAlertsPanel({ events, vehicles }: ActiveAlertsPanelProps) {
  const byId = new Map(vehicles.map((v) => [v.id, v]));

  return (
    <ul className="divide-y divide-border/60">
      {events.map((event) => {
        const vehicle = byId.get(event.vehicleId);
        return (
          <li key={event.id}>
            <Link
              to={`/alertas/${event.id}`}
              className="flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <SeverityPill severity={event.severity} score={event.score} showDot={false} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {vehicle ? formatPlate(vehicle.plate) : event.vehicleId}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {vehicle ? `${vehicle.make} ${vehicle.model}` : ""}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {event.triggers
                    .map((t) => TRIGGER_LABEL[t] ?? t)
                    .join(" · ")}
                </p>
              </div>
              <span className="shrink-0 font-data text-xs text-muted-foreground">
                {formatRelative(event.timestamp)}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
