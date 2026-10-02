import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import type { Vehicle } from "@/api/types";
import { AppProviders } from "@/test/utils";

// MapLibre needs WebGL, which jsdom lacks. Swap the GL map for a stub that
// exposes the vehicles it received and lets us drive selection.
vi.mock("@/components/map/FleetMap", () => ({
  FleetMap: ({
    vehicles,
    onSelect,
  }: {
    vehicles: Vehicle[];
    onSelect: (id: string) => void;
  }) => (
    <div data-testid="map-stub">
      <span>visíveis: {vehicles.length}</span>
      {vehicles[0] && (
        <button onClick={() => onSelect(vehicles[0]!.id)}>selecionar primeiro</button>
      )}
    </div>
  ),
}));

import { FleetMapPage } from "./FleetMapPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <FleetMapPage />
    </MemoryRouter>,
    { wrapper: AppProviders },
  );
}

describe("FleetMapPage", () => {
  it("passa os veículos carregados para o mapa e filtra por nível", async () => {
    const user = userEvent.setup();
    renderPage();

    const countText = await screen.findByText(/^visíveis: /);
    const initial = Number(countText.textContent!.replace(/\D/g, ""));
    expect(initial).toBeGreaterThan(0);

    // Toggling a severity off in the legend reduces the visible set.
    await user.click(screen.getByRole("button", { name: /Desperto/ }));
    const after = Number(
      screen.getByText(/^visíveis: /).textContent!.replace(/\D/g, ""),
    );
    expect(after).toBeLessThan(initial);
  });

  it("abre o painel de detalhes ao selecionar uma unidade", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "selecionar primeiro" }));
    expect(await screen.findByLabelText("Fechar painel")).toBeInTheDocument();
    expect(screen.getByText("Firmware")).toBeInTheDocument();
    expect(screen.getByText("Última comunicação")).toBeInTheDocument();
  });
});
