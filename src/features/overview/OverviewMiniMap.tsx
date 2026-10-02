import { Link } from "react-router-dom";
import { Maximize2 } from "lucide-react";

import { useVehicles } from "@/api/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SEVERITY_CSS_VAR } from "@/lib/severity";

const W = 320;
const H = 180;
const PAD = 12;

export function OverviewMiniMap() {
  const vehicles = useVehicles();
  const rows = vehicles.data ?? [];

  const lats = rows.map((v) => v.location.lat);
  const lngs = rows.map((v) => v.location.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1;
  const spanLng = maxLng - minLng || 1;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm">Mapa da frota</CardTitle>
        <Link to="/mapa" className="kicker inline-flex items-center gap-1 hover:text-foreground">
          <Maximize2 className="size-3" /> abrir
        </Link>
      </CardHeader>
      <CardContent>
        {vehicles.isLoading ? (
          <Skeleton className="h-[180px] w-full" />
        ) : (
          <Link to="/mapa" className="block">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full rounded-md border border-border bg-muted/40"
              role="img"
              aria-label="Distribuição geográfica da frota"
            >
              <defs>
                <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path
                    d="M32 0H0V32"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="0.5"
                    opacity="0.5"
                  />
                </pattern>
              </defs>
              <rect width={W} height={H} fill="url(#grid)" />
              {rows.map((v) => {
                const x =
                  PAD + ((v.location.lng - minLng) / spanLng) * (W - PAD * 2);
                const y =
                  PAD + (1 - (v.location.lat - minLat) / spanLat) * (H - PAD * 2);
                const isAlert =
                  v.currentSeverity === "drowsy" || v.currentSeverity === "critical";
                return (
                  <circle
                    key={v.id}
                    cx={x}
                    cy={y}
                    r={isAlert ? 4 : 2.5}
                    fill={SEVERITY_CSS_VAR[v.currentSeverity]}
                    opacity={v.status === "offline" ? 0.35 : 0.95}
                  />
                );
              })}
            </svg>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
