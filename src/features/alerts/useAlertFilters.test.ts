import { describe, expect, it } from "vitest";

import { periodStart } from "./useAlertFilters";

const NOW = Date.parse("2026-10-02T12:00:00.000Z");

describe("periodStart", () => {
  it("no mock, 'Todo o período' não limita a data", () => {
    expect(periodStart("all", "mock", NOW)).toBeUndefined();
  });

  it("na API real, 'Todo o período' vira os últimos 30 dias (limite da API)", () => {
    expect(periodStart("all", "hybrid", NOW)).toBe("2026-09-02T12:00:00.000Z");
  });

  it("períodos fixos são iguais nos dois modos", () => {
    expect(periodStart("24h", "hybrid", NOW)).toBe("2026-10-01T12:00:00.000Z");
    expect(periodStart("7d", "mock", NOW)).toBe("2026-09-25T12:00:00.000Z");
  });
});
