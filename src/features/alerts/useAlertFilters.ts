import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import type { Severity } from "@/api/types";
import type { EventFilters } from "@/api/queries";
import { SEVERITY_ORDER } from "@/lib/severity";

export type AlertPeriod = "24h" | "7d" | "30d" | "all";

export const PERIOD_LABEL: Record<AlertPeriod, string> = {
  "24h": "Últimas 24 h",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  all: "Todo o período",
};

export type AlertFiltersState = {
  severity: Severity[];
  acknowledged: "all" | "open" | "done";
  period: AlertPeriod;
  page: number;
};

const PAGE_SIZE = 15;

function periodStart(period: AlertPeriod): string | undefined {
  if (period === "all") return undefined;
  const days = period === "24h" ? 1 : period === "7d" ? 7 : 30;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function useAlertFilters() {
  const [params, setParams] = useSearchParams();

  const state = useMemo<AlertFiltersState>(() => {
    const severity = (params.get("sev")?.split(",") ?? [])
      .filter((s): s is Severity => SEVERITY_ORDER.includes(s as Severity));
    const ackParam = params.get("ack");
    return {
      severity,
      acknowledged:
        ackParam === "open" || ackParam === "done" ? ackParam : "all",
      period: (params.get("periodo") as AlertPeriod) ?? "7d",
      page: Math.max(1, Number(params.get("pagina")) || 1),
    };
  }, [params]);

  const update = useCallback(
    (patch: Partial<AlertFiltersState>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const merged = { ...state, ...patch };
          // reset to page 1 whenever a filter (not the page itself) changes
          if (!("page" in patch)) merged.page = 1;

          if (merged.severity.length) next.set("sev", merged.severity.join(","));
          else next.delete("sev");

          if (merged.acknowledged !== "all") next.set("ack", merged.acknowledged);
          else next.delete("ack");

          if (merged.period !== "7d") next.set("periodo", merged.period);
          else next.delete("periodo");

          if (merged.page > 1) next.set("pagina", String(merged.page));
          else next.delete("pagina");

          return next;
        },
        { replace: true },
      );
    },
    [setParams, state],
  );

  const query = useMemo<EventFilters>(
    () => ({
      page: state.page,
      pageSize: PAGE_SIZE,
      severity: state.severity.length ? state.severity : undefined,
      acknowledged:
        state.acknowledged === "all"
          ? undefined
          : state.acknowledged === "done",
      from: periodStart(state.period),
    }),
    [state],
  );

  const hasActiveFilters =
    state.severity.length > 0 ||
    state.acknowledged !== "all" ||
    state.period !== "7d";

  const reset = useCallback(
    () => update({ severity: [], acknowledged: "all", period: "7d" }),
    [update],
  );

  return { state, update, reset, query, hasActiveFilters, pageSize: PAGE_SIZE };
}
