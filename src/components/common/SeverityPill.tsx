import type { Severity } from "@/api/types";
import { cn } from "@/lib/utils";
import { SEVERITY_CLASSES, SEVERITY_LABEL_SHORT } from "@/lib/severity";

type SeverityPillProps = {
  severity: Severity;
  score?: number;
  showDot?: boolean;
  className?: string;
};

/** Coloured status pill for a drowsiness level, optionally with the score. */
export function SeverityPill({
  severity,
  score,
  showDot = true,
  className,
}: SeverityPillProps) {
  const c = SEVERITY_CLASSES[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        c.bg,
        c.border,
        c.text,
        className,
      )}
    >
      {showDot && <span className={cn("size-1.5 rounded-full", c.dot)} />}
      {SEVERITY_LABEL_SHORT[severity]}
      {typeof score === "number" && (
        <span className="font-data tabular-nums opacity-80">{score}</span>
      )}
    </span>
  );
}
