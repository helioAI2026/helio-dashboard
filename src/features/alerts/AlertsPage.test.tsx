import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AlertsPage } from "./AlertsPage";
import { AppProviders } from "@/test/utils";

function renderAlerts(initialPath = "/alertas") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/alertas" element={<AlertsPage />} />
        <Route path="/alertas/:alertId" element={<AlertsPage />} />
      </Routes>
    </MemoryRouter>,
    { wrapper: AppProviders },
  );
}

describe("AlertsPage", () => {
  it("lista alertas e filtra por nível", async () => {
    const user = userEvent.setup();
    renderAlerts();

    const table = await screen.findByRole("table");
    await waitFor(() =>
      expect(within(table).getAllByRole("row").length).toBeGreaterThan(1),
    );

    await user.click(screen.getByRole("button", { name: /Crítico/ }));

    await waitFor(() => {
      expect(
        within(screen.getByRole("table")).queryByText("Leve"),
      ).not.toBeInTheDocument();
    });
    expect(
      within(screen.getByRole("table")).getAllByText("Crítico").length,
    ).toBeGreaterThan(0);
  });

  it("abre o detalhe e reconhece um alerta pendente", async () => {
    const user = userEvent.setup();
    renderAlerts("/alertas?ack=open");

    const table = await screen.findByRole("table");
    await waitFor(() =>
      expect(within(table).getAllByRole("row").length).toBeGreaterThan(1),
    );
    await user.click(within(table).getAllByRole("row")[1]!);

    const ackButton = await screen.findByRole("button", {
      name: /Reconhecer alerta/,
    });
    await user.click(ackButton);

    await waitFor(() =>
      expect(
        screen.getByText(/Reconhecido por Central de Operações/),
      ).toBeInTheDocument(),
    );
  });
});
