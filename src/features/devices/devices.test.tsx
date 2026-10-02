import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { DevicesPage } from "./DevicesPage";
import { DeviceDetailPage } from "./DeviceDetailPage";
import { AppProviders } from "@/test/utils";

function renderDevices() {
  return render(
    <MemoryRouter initialEntries={["/dispositivos"]}>
      <Routes>
        <Route path="/dispositivos" element={<DevicesPage />} />
        <Route path="/dispositivos/:deviceId" element={<DeviceDetailPage />} />
      </Routes>
    </MemoryRouter>,
    { wrapper: AppProviders },
  );
}

describe("Devices", () => {
  it("lista dispositivos e abre o detalhe com buffer do Greengrass", async () => {
    const user = userEvent.setup();
    renderDevices();

    const table = await screen.findByRole("table");
    await waitFor(() =>
      expect(within(table).getAllByRole("row").length).toBeGreaterThan(2),
    );

    await user.click(within(screen.getByRole("table")).getAllByRole("row")[1]!);

    await waitFor(() =>
      expect(
        screen.getByText("Buffer de quadros — AWS Greengrass"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Modelo implantado")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Forçar sincronização/ }),
    ).toBeInTheDocument();
  });
});
