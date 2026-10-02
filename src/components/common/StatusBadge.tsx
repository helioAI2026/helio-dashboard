import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatusTone = "ok" | "warn" | "danger" | "info" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  ok: "border-status-success/30 bg-status-success/12 text-status-success",
  warn: "border-status-warning/30 bg-status-warning/12 text-status-warning",
  danger: "border-status-danger/30 bg-status-danger/12 text-status-danger",
  info: "border-status-info/30 bg-status-info/12 text-status-info",
  neutral: "border-border bg-muted text-muted-foreground",
};

type StatusBadgeProps = {
  tone: StatusTone;
  children: ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
};

export function StatusBadge({
  tone,
  children,
  dot = true,
  pulse = false,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && (
        <span className="relative flex size-1.5">
          {pulse && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
          )}
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
