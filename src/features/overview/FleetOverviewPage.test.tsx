import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { FleetOverviewPage } from "./FleetOverviewPage";
import { AppProviders } from "@/test/utils";

describe("FleetOverviewPage", () => {
  it("carrega os indicadores e o painel de alertas a partir da API simulada", async () => {
    render(
      <MemoryRouter>
        <FleetOverviewPage />
      </MemoryRouter>,
      { wrapper: AppProviders },
    );

    expect(
      screen.getByRole("heading", { name: "Visão geral da frota" }),
    ).toBeInTheDocument();

    // KPI cards resolve from /api/fleet/stats
    const driversCard = await screen.findByText("Motoristas em turno");
    const card = driversCard.closest("div")!.parentElement!;
    expect(within(card).getByText(/de \d+ unidades/)).toBeInTheDocument();

    // Active alerts list resolves from /api/events
    expect(await screen.findByText("Alertas ativos")).toBeInTheDocument();
  });
});
