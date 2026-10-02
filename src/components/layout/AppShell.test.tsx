import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "./AppShell";
import { AppProviders } from "@/test/utils";

function renderShell() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<p>corpo da página</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
    { wrapper: AppProviders },
  );
}

describe("AppShell", () => {
  it("renderiza a navegação e o conteúdo da rota", () => {
    renderShell();

    expect(screen.getByText("corpo da página")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /visão geral/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /mapa da frota/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /alertas/i })).toBeInTheDocument();
  });

  it("alterna entre tema escuro e claro", async () => {
    const user = userEvent.setup();
    renderShell();

    expect(document.documentElement).toHaveClass("dark");

    await user.click(screen.getByRole("button", { name: /tema claro/i }));
    expect(document.documentElement).not.toHaveClass("dark");

    await user.click(screen.getByRole("button", { name: /tema escuro/i }));
    expect(document.documentElement).toHaveClass("dark");
  });
});
