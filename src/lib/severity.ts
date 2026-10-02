import type { Severity } from "@/api/types";

/**
 * Drowsiness score → severity bucket. Single source of truth for how a 0–100
 * score maps to a level and its colour. Used by the map markers, badges,
 * gauges and chart threshold bands.
 *
 * Buckets (upper bound exclusive except the last):
 *   alert     0–25   — desperto
 *   mild      25–50  — leve
 *   drowsy    50–75  — sonolento
 *   critical  75–100 — crítico
 */

export const SEVERITY_ORDER: Severity[] = ["alert", "mild", "drowsy", "critical"];

export const DEFAULT_THRESHOLDS = {
  mild: 25,
  drowsy: 50,
  critical: 75,
} as const;

export type SeverityThresholds = {
  mild: number;
  drowsy: number;
  critical: number;
};

export function severityForScore(
  score: number,
  thresholds: SeverityThresholds = DEFAULT_THRESHOLDS,
): Severity {
  const clamped = clampScore(score);
  if (clamped >= thresholds.critical) return "critical";
  if (clamped >= thresholds.drowsy) return "drowsy";
  if (clamped >= thresholds.mild) return "mild";
  return "alert";
}

export function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.min(100, Math.max(0, score));
}

/** Portuguese label for a severity level. */
export const SEVERITY_LABEL: Record<Severity, string> = {
  alert: "Desperto",
  mild: "Fadiga leve",
  drowsy: "Sonolento",
  critical: "Crítico",
};

/** Short label for tight spaces (badges, legends). */
export const SEVERITY_LABEL_SHORT: Record<Severity, string> = {
  alert: "Desperto",
  mild: "Leve",
  drowsy: "Sonolento",
  critical: "Crítico",
};

/**
 * Fixed hex values for the severity colours, for contexts that can't read CSS
 * custom properties (MapLibre paint expressions, canvas). Tuned for the dark
 * map basemap, which the fleet map always uses regardless of app theme.
 */
export const SEVERITY_HEX: Record<Severity, string> = {
  alert: "#34d399",
  mild: "#fbbf24",
  drowsy: "#fb923c",
  critical: "#f87171",
};

/** CSS custom property holding the colour for a severity level. */
export const SEVERITY_CSS_VAR: Record<Severity, string> = {
  alert: "var(--severity-alert)",
  mild: "var(--severity-mild)",
  drowsy: "var(--severity-drowsy)",
  critical: "var(--severity-critical)",
};

/** Tailwind text/bg/border utility fragments keyed by severity. */
export const SEVERITY_CLASSES: Record<
  Severity,
  { text: string; bg: string; border: string; dot: string }
> = {
  alert: {
    text: "text-severity-alert",
    bg: "bg-severity-alert/12",
    border: "border-severity-alert/30",
    dot: "bg-severity-alert",
  },
  mild: {
    text: "text-severity-mild",
    bg: "bg-severity-mild/12",
    border: "border-severity-mild/30",
    dot: "bg-severity-mild",
  },
  drowsy: {
    text: "text-severity-drowsy",
    bg: "bg-severity-drowsy/12",
    border: "border-severity-drowsy/30",
    dot: "bg-severity-drowsy",
  },
  critical: {
    text: "text-severity-critical",
    bg: "bg-severity-critical/15",
    border: "border-severity-critical/40",
    dot: "bg-severity-critical",
  },
};

export function isAtLeast(level: Severity, floor: Severity): boolean {
  return SEVERITY_ORDER.indexOf(level) >= SEVERITY_ORDER.indexOf(floor);
}
