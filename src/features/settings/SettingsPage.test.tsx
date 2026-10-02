import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { SettingsPage } from "./SettingsPage";
import { apiGet } from "@/api/client";
import type { AlertThresholds } from "@/api/types";
import { AppProviders } from "@/test/utils";

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
    { wrapper: AppProviders },
  );
}

describe("SettingsPage", () => {
  it("carrega os limiares e persiste as alterações", async () => {
    const user = userEvent.setup();
    renderSettings();

    // form populated from /api/settings/thresholds
    await screen.findByText("Limiares de pontuação de fadiga");
    const saveButton = await screen.findByRole("button", {
      name: /Salvar alterações/,
    });
    expect(saveButton).toBeDisabled(); // not dirty yet

    // nudge the "sonolência" slider with the keyboard
    const sliders = screen.getAllByRole("slider");
    sliders[1]!.focus();
    await user.keyboard("{ArrowRight}");

    await waitFor(() => expect(saveButton).toBeEnabled());
    await user.click(saveButton);

    await waitFor(async () => {
      const persisted = await apiGet<AlertThresholds>("/api/settings/thresholds");
      expect(persisted.drowsy).toBe(51);
    });
  });

  it("valida limiares não crescentes", async () => {
    const user = userEvent.setup();
    renderSettings();

    const sliders = await screen.findAllByRole("slider");
    // push "fadiga leve" (index 0) far above "crítico"
    sliders[0]!.focus();
    for (let i = 0; i < 80; i++) await user.keyboard("{ArrowRight}");

    await user.click(screen.getByRole("button", { name: /Salvar alterações/ }));
    expect(
      await screen.findByText(/limiares devem ser crescentes/i),
    ).toBeInTheDocument();
  });
});
