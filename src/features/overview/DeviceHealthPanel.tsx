import { Link } from "react-router-dom";
import { Cpu } from "lucide-react";

import { useDevices } from "@/api/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DeviceHealthPanel() {
  const devices = useDevices();

  const total = devices.data?.length ?? 0;
  const offline =
    devices.data?.filter((d) => d.connectivity === "offline").length ?? 0;
  const cameraIssues =
    devices.data?.filter((d) => d.cameraStatus !== "ok").length ?? 0;
  const buffered =
    devices.data?.reduce((sum, d) => sum + d.bufferedFrames, 0) ?? 0;

  const rows = [
    { label: "Dispositivos online", value: total - offline, tone: "text-status-success" },
    { label: "Sem conexão", value: offline, tone: offline ? "text-status-danger" : "" },
    {
      label: "Câmera com problema",
      value: cameraIssues,
      tone: cameraIssues ? "text-status-warning" : "",
    },
    {
      label: "Quadros aguardando envio",
      value: buffered.toLocaleString("pt-BR"),
      tone: "",
    },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm">Saúde dos dispositivos</CardTitle>
        <Link to="/dispositivos" className="kicker hover:text-foreground">
          detalhes
        </Link>
      </CardHeader>
      <CardContent>
        {devices.isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <dl className="space-y-2.5">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <Cpu className="size-3.5" />
                  {row.label}
                </dt>
                <dd className={`font-data font-medium tabular-nums ${row.tone}`}>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
