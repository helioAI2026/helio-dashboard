import { describe, expect, it } from "vitest";
import { HttpHandler, type RequestHandler } from "msw";

import { handlers } from "./handlers";
import { mockHandlersFor } from "./mode";

function routes(list: RequestHandler[]): string[] {
  return list
    .filter((h): h is HttpHandler => h instanceof HttpHandler)
    .map((h) => `${h.info.method} ${String(h.info.path)}`);
}

describe("mockHandlersFor", () => {
  it("no modo mock mantém todos os handlers", () => {
    expect(mockHandlersFor("mock")).toBe(handlers);
  });

  it("no modo híbrido deixa a API real atender motoristas, alertas, limiares e viagens", () => {
    const active = routes(mockHandlersFor("hybrid"));
    for (const real of [
      "GET /api/drivers",
      "GET /api/drivers/:id",
      "GET /api/drivers/:id/history",
      "GET /api/events",
      "POST /api/events/:id/acknowledge",
      "GET /api/settings/thresholds",
      "PUT /api/settings/thresholds",
      "GET /api/trips",
    ]) {
      expect(active).not.toContain(real);
    }
    for (const mocked of [
      "GET /api/fleet/stats",
      "GET /api/vehicles",
      "GET /api/devices",
      "GET /api/models",
      "GET /api/frames/:id/ir.svg",
    ]) {
      expect(active).toContain(mocked);
    }
  });
});
