import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HttpResponse, http } from "msw";

import { AlertDetailDrawer } from "./AlertDetailDrawer";
import { server } from "@/api/mock/server";
import { AppProviders } from "@/test/utils";

/** Evento como a API real devolve: sem imagem, GPS, veículo nem motorista. */
const realEvent = {
  id: "evt-real",
  tripId: "ride-1",
  deviceId: "helio-edge-01",
  vehicleId: null,
  driverId: null,
  timestamp: "2026-10-02T01:15:03.000Z",
  score: 91,
  severity: "critical",
  durationSec: 3.2,
  triggers: ["perclos", "eye-closure"],
  location: null,
  frames: null,
  acknowledgedAt: null,
  acknowledgedBy: null,
};

describe("AlertDetailDrawer", () => {
  it("abre alerta real sem imagem, local, veículo nem motorista", async () => {
    server.use(http.get("/api/events/:id", () => HttpResponse.json(realEvent)));

    render(
      <MemoryRouter>
        <AlertDetailDrawer eventId="evt-real" onClose={() => {}} />
      </MemoryRouter>,
      { wrapper: AppProviders },
    );

    expect(await screen.findByText("Sem imagem para este alerta")).toBeInTheDocument();
    expect(screen.getAllByText("evt-real").length).toBeGreaterThan(0);
  });
});
