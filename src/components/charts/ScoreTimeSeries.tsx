import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DEFAULT_THRESHOLDS } from "@/lib/severity";
import { formatTime } from "@/lib/format";

type Point = { t: string; score: number };

type ScoreTimeSeriesProps = {
  data: Point[];
  height?: number;
  showThresholds?: boolean;
};

export function ScoreTimeSeries({
  data,
  height = 220,
  showThresholds = true,
}: ScoreTimeSeriesProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="t"
          tickFormatter={(t: string) => formatTime(t)}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          minTickGap={40}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        {showThresholds && (
          <>
            <ReferenceLine
              y={DEFAULT_THRESHOLDS.drowsy}
              stroke="var(--severity-drowsy)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={DEFAULT_THRESHOLDS.critical}
              stroke="var(--severity-critical)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
          </>
        )}
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--popover-foreground)",
          }}
          labelFormatter={(t: string) => formatTime(t)}
          formatter={(value: number) => [Math.round(value), "Pontuação"]}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#scoreFill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
