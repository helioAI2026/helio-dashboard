import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ModelVersionsPage } from "./ModelVersionsPage";
import { ModelVersionDetailPage } from "./ModelVersionDetailPage";
import { TrainingJobsPage } from "./TrainingJobsPage";
import { RolloutPage } from "./RolloutPage";
import { AppProviders } from "@/test/utils";

describe("ML Ops", () => {
  it("mostra versões do modelo e abre o detalhe com comparação de métricas", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/ml/modelos"]}>
        <Routes>
          <Route path="/ml/modelos" element={<ModelVersionsPage />} />
          <Route path="/ml/modelos/:modelId" element={<ModelVersionDetailPage />} />
        </Routes>
      </MemoryRouter>,
      { wrapper: AppProviders },
    );

    const table = await screen.findByRole("table");
    await waitFor(() =>
      expect(within(table).getAllByRole("row").length).toBeGreaterThan(2),
    );
    await user.click(within(screen.getByRole("table")).getAllByRole("row")[1]!);

    await waitFor(() =>
      expect(screen.getByText("Métricas", { exact: false })).toBeInTheDocument(),
    );
    expect(screen.getByText("Recall (sensibilidade)")).toBeInTheDocument();
  });

  it("renderiza o pipeline do Greengrass com etapas", async () => {
    render(
      <MemoryRouter>
        <TrainingJobsPage />
      </MemoryRouter>,
      { wrapper: AppProviders },
    );

    expect(await screen.findAllByText("Coleta")).not.toHaveLength(0);
    expect(screen.getAllByText("Implantado").length).toBeGreaterThan(0);
  });

  it("mostra a adoção por versão na página de implantação", async () => {
    render(
      <MemoryRouter>
        <RolloutPage />
      </MemoryRouter>,
      { wrapper: AppProviders },
    );

    expect(await screen.findByText("Adoção por versão")).toBeInTheDocument();
    expect(screen.getByText("Produção")).toBeInTheDocument();
  });
});
