import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { DriversPage } from "./DriversPage";
import { DriverDetailPage } from "./DriverDetailPage";
import { AppProviders } from "@/test/utils";

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
      expect(
        screen.getByText("Pontuação média diária — 21 dias"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("link", { name: /Motoristas/ }),
    ).toBeInTheDocument();
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
      expect(
        screen.getByText("Nenhum motorista encontrado"),
      ).toBeInTheDocument(),
    );
    expect(total).toBeGreaterThan(1);
  });
});
