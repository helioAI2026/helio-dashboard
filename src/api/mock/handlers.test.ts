import { describe, expect, it } from "vitest";

import { apiGet, apiPost } from "@/api/client";
import type { DrowsinessEvent, FleetStats, Paginated, Vehicle } from "@/api/types";
import { SEVERITY_ORDER } from "@/lib/severity";

describe("mock API — /api/events", () => {
  it("paginates and reports the total", async () => {
    const page1 = await apiGet<Paginated<DrowsinessEvent>>(
      "/api/events?page=1&pageSize=10",
    );
    const page2 = await apiGet<Paginated<DrowsinessEvent>>(
      "/api/events?page=2&pageSize=10",
    );

    expect(page1.rows).toHaveLength(10);
    expect(page1.total).toBeGreaterThan(20);
    expect(page2.page).toBe(2);
    expect(page1.rows[0]!.id).not.toBe(page2.rows[0]!.id);
  });

  it("filters by severity", async () => {
    const res = await apiGet<Paginated<DrowsinessEvent>>(
      "/api/events?severity=critical&pageSize=50",
    );
    expect(res.rows.length).toBeGreaterThan(0);
    expect(res.rows.every((e) => e.severity === "critical")).toBe(true);
  });

  it("filters by acknowledged state", async () => {
    const open = await apiGet<Paginated<DrowsinessEvent>>(
      "/api/events?acknowledged=false&pageSize=50",
    );
    expect(open.rows.every((e) => e.acknowledgedAt === null)).toBe(true);
  });

  it("sorts by score ascending", async () => {
    const res = await apiGet<Paginated<DrowsinessEvent>>(
      "/api/events?sort=score&dir=asc&pageSize=30",
    );
    const scores = res.rows.map((e) => e.score);
    expect([...scores].sort((a, b) => a - b)).toEqual(scores);
  });

  it("defaults to newest first", async () => {
    const res = await apiGet<Paginated<DrowsinessEvent>>("/api/events?pageSize=20");
    const times = res.rows.map((e) => Date.parse(e.timestamp));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });
});

describe("mock API — acknowledge", () => {
  it("marks an event acknowledged", async () => {
    const list = await apiGet<Paginated<DrowsinessEvent>>(
      "/api/events?acknowledged=false&pageSize=1",
    );
    const target = list.rows[0]!;

    const updated = await apiPost<DrowsinessEvent>(
      `/api/events/${target.id}/acknowledge`,
      { by: "Teste" },
    );

    expect(updated.acknowledgedAt).not.toBeNull();
    expect(updated.acknowledgedBy).toBe("Teste");
  });
});

describe("mock API — fleet stats", () => {
  it("returns coherent aggregates", async () => {
    const stats = await apiGet<FleetStats>("/api/fleet/stats");
    const vehicles = await apiGet<Vehicle[]>("/api/vehicles");

    expect(stats.vehiclesTotal).toBe(vehicles.length);
    expect(stats.scoreTrend.length).toBeGreaterThan(10);
    const severitySum = SEVERITY_ORDER.reduce(
      (sum, level) => sum + stats.severityBreakdown[level],
      0,
    );
    expect(severitySum).toBe(vehicles.length);
  });
});
