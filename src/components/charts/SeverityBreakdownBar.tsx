import type { Severity } from "@/api/types";
import {
  SEVERITY_CSS_VAR,
  SEVERITY_LABEL_SHORT,
  SEVERITY_ORDER,
} from "@/lib/severity";

type SeverityBreakdownBarProps = {
  counts: Record<Severity, number>;
  className?: string;
};

/** Single stacked bar showing how the fleet splits across severity levels. */
export function SeverityBreakdownBar({
  counts,
  className,
}: SeverityBreakdownBarProps) {
  const total = SEVERITY_ORDER.reduce((sum, level) => sum + counts[level], 0) || 1;

  return (
    <div className={className}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {SEVERITY_ORDER.map((level) => {
          const pct = (counts[level] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={level}
              style={{ width: `${pct}%`, background: SEVERITY_CSS_VAR[level] }}
              title={`${SEVERITY_LABEL_SHORT[level]}: ${counts[level]}`}
            />
          );
        })}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
        {SEVERITY_ORDER.map((level) => (
          <li key={level} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: SEVERITY_CSS_VAR[level] }}
            />
            <span className="text-muted-foreground">
              {SEVERITY_LABEL_SHORT[level]}
            </span>
            <span className="ml-auto font-data tabular-nums">{counts[level]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
