import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/charts/Sparkline";

type Delta = {
  value: number;
  /** Whether an increase should read as good (green) or bad (red). */
  goodDirection?: "up" | "down";
  suffix?: string;
};

type StatCardProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  delta?: Delta;
  trend?: number[];
  trendColor?: string;
  accent?: string;
  loading?: boolean;
  className?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  delta,
  trend,
  trendColor = "var(--primary)",
  accent,
  loading = false,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <Card className={cn("p-4", className)}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-16" />
        <Skeleton className="mt-3 h-7 w-full" />
      </Card>
    );
  }

  const deltaTone = deltaClass(delta);

  return (
    <Card className={cn("flex flex-col gap-3 p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="kicker">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p
            className="font-data text-2xl font-semibold leading-none tabular-nums"
            style={accent ? { color: accent } : undefined}
          >
            {value}
          </p>
          {(delta || hint) && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              {delta && (
                <span className={cn("inline-flex items-center gap-0.5", deltaTone)}>
                  <DeltaIcon value={delta.value} />
                  <span className="font-data tabular-nums">
                    {Math.abs(delta.value)}
                    {delta.suffix ?? ""}
                  </span>
                </span>
              )}
              {hint && <span className="text-muted-foreground">{hint}</span>}
            </div>
          )}
        </div>

        {trend && trend.length > 1 && (
          <Sparkline
            data={trend}
            width={84}
            height={30}
            color={trendColor}
            className="shrink-0 text-primary"
          />
        )}
      </div>
    </Card>
  );
}

function DeltaIcon({ value }: { value: number }) {
  if (value > 0) return <ArrowUpRight className="size-3.5" />;
  if (value < 0) return <ArrowDownRight className="size-3.5" />;
  return <Minus className="size-3.5" />;
}

function deltaClass(delta?: Delta): string {
  if (!delta || delta.value === 0) return "text-muted-foreground";
  const good = delta.goodDirection ?? "up";
  const isGood = good === "up" ? delta.value > 0 : delta.value < 0;
  return isGood ? "text-status-success" : "text-status-danger";
}
