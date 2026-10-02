import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { RequireAuth } from "./RequireAuth";
import { AppProviders } from "@/test/utils";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/entrar" element={<p>tela de login</p>} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<p>conteúdo protegido</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
    { wrapper: AppProviders },
  );
}

describe("RequireAuth", () => {
  it("redireciona visitantes não autenticados para /entrar", () => {
    renderAt("/");

    expect(screen.getByText("tela de login")).toBeInTheDocument();
    expect(screen.queryByText("conteúdo protegido")).not.toBeInTheDocument();
  });
});
