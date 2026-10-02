import { severityForScore } from "@/lib/severity";
import { SEVERITY_CSS_VAR, SEVERITY_LABEL } from "@/lib/severity";
import { cn } from "@/lib/utils";

type DrowsinessGaugeProps = {
  score: number;
  size?: number;
  showLabel?: boolean;
  className?: string;
};

/** 180° gauge for a 0–100 drowsiness score, coloured by severity bucket. */
export function DrowsinessGauge({
  score,
  size = 132,
  showLabel = true,
  className,
}: DrowsinessGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const severity = severityForScore(clamped);
  const color = SEVERITY_CSS_VAR[severity];

  const stroke = size * 0.1;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * r; // half circle
  const dash = (clamped / 100) * circumference;

  return (
    <div
      className={cn("inline-flex flex-col items-center", className)}
      style={{ width: size }}
    >
      <svg
        width={size}
        height={size / 2 + stroke}
        viewBox={`0 0 ${size} ${size / 2 + stroke}`}
        role="img"
        aria-label={`Pontuação de fadiga ${Math.round(clamped)} de 100`}
      >
        <path
          d={arc(cx, cy, r)}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={arc(cx, cy, r)}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray 600ms ease" }}
        />
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          className="fill-foreground font-data font-semibold"
          style={{ fontSize: size * 0.26 }}
        >
          {Math.round(clamped)}
        </text>
      </svg>
      {showLabel && (
        <span
          className="mt-1 text-xs font-medium"
          style={{ color }}
        >
          {SEVERITY_LABEL[severity]}
        </span>
      )}
    </div>
  );
}

/** Semicircle path from left to right, opening upward. */
function arc(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
}
