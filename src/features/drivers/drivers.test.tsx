import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { DriversPage } from "./DriversPage";
import { DriverDetailPage } from "./DriverDetailPage";
import { AppProviders } from "@/test/utils";
import { HttpResponse, http } from "msw";
import { server } from "@/api/mock/server";
import { listDrivers } from "@/api/mock/db";

function renderDrivers() {
  return render(
    <MemoryRouter initialEntries={["/motoristas"]}>
      <Routes>
        <Route path="/motoristas" element={<DriversPage />} />
        <Route path="/motoristas/:driverId" element={<DriverDetailPage />} />
      </Routes>
    </MemoryRouter>,
    { wrapper: AppProviders },
  );
}

describe("Drivers", () => {
  it("lista motoristas, filtra pela busca e navega para o detalhe", async () => {
    const user = userEvent.setup();
    renderDrivers();

    const table = await screen.findByRole("table");
    await waitFor(() =>
      expect(within(table).getAllByRole("row").length).toBeGreaterThan(2),
    );

    const firstRow = within(screen.getByRole("table")).getAllByRole("row")[1]!;
    const name = within(firstRow).getAllByRole("cell")[0]!.textContent!;
    await user.click(firstRow);

    // Detail page shows the driver's name as the heading and the history card
    await waitFor(() =>
      expect(screen.getByText("Pontuação média diária — 21 dias")).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /Motoristas/ })).toBeInTheDocument();
    expect(name.length).toBeGreaterThan(0);
  });

  it("filtra a lista pela busca", async () => {
    const user = userEvent.setup();
    renderDrivers();

    const table = await screen.findByRole("table");
    await waitFor(() =>
      expect(within(table).getAllByRole("row").length).toBeGreaterThan(2),
    );
    const total = within(screen.getByRole("table")).getAllByRole("row").length;

    await user.type(screen.getByPlaceholderText(/Buscar por nome/), "zzzznomatch");
    await waitFor(() =>
      expect(screen.getByText("Nenhum motorista encontrado")).toBeInTheDocument(),
    );
    expect(total).toBeGreaterThan(1);
  });
  it("mostra as viagens recentes do motorista", async () => {
    const driverId = listDrivers()[0]!.id;
    server.use(
      http.get("/api/trips", ({ request }) => {
        expect(new URL(request.url).searchParams.get("driverId")).toBe(driverId);
        return HttpResponse.json([
          {
            id: "ride-1",
            deviceId: "helio-edge-01",
            driverId,
            startedAt: "2026-10-02T10:00:00.000Z",
            lastEventAt: "2026-10-02T11:30:00.000Z",
            maxScore: 88,
            alertCount: 2,
          },
        ]);
      }),
    );

    render(
      <MemoryRouter initialEntries={[`/motoristas/${driverId}`]}>
        <Routes>
          <Route path="/motoristas/:driverId" element={<DriverDetailPage />} />
        </Routes>
      </MemoryRouter>,
      { wrapper: AppProviders },
    );

    expect(await screen.findByText("Viagens recentes")).toBeInTheDocument();
    expect(await screen.findByText("2 alertas")).toBeInTheDocument();
    expect(screen.getByText("pico 88")).toBeInTheDocument();
  });
});
