import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HttpResponse } from "msw";

import { AuthProvider } from "./auth-context";
import { LoginPage } from "./LoginPage";
import type { ApiMode } from "@/config/env";
import { cognitoError, mockCognito } from "@/test/cognito";
import { cognitoAuthResult } from "@/test/tokens";

function renderLogin(mode: ApiMode = "hybrid") {
  return render(
    <AuthProvider mode={mode}>
      <MemoryRouter initialEntries={["/entrar"]}>
        <Routes>
          <Route path="/entrar" element={<LoginPage />} />
          <Route path="/" element={<p>painel</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

const firstAccess = (afterChallenge: () => Response) =>
  mockCognito((target) =>
    target === "InitiateAuth"
      ? HttpResponse.json({ ChallengeName: "NEW_PASSWORD_REQUIRED", Session: "sess-1" })
      : afterChallenge(),
  );

async function enterCredentials(
  user: ReturnType<typeof userEvent.setup>,
  password = "Temp1234",
) {
  await user.type(screen.getByLabelText("E-mail"), "ana@helio.dev");
  await user.type(screen.getByLabelText("Senha"), password);
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("LoginPage (híbrido)", () => {
  it("primeiro acesso pede nova senha e entra no painel", async () => {
    const user = userEvent.setup();
    firstAccess(() => HttpResponse.json(cognitoAuthResult()));
    renderLogin();

    await enterCredentials(user);
    await user.type(await screen.findByLabelText("Nova senha"), "NovaSenha123");
    await user.type(screen.getByLabelText("Confirme a nova senha"), "NovaSenha123");
    await user.click(screen.getByRole("button", { name: "Salvar e entrar" }));

    expect(await screen.findByText("painel")).toBeInTheDocument();
  });

  it("senha nova fraca mostra a regra e continua na etapa", async () => {
    const user = userEvent.setup();
    firstAccess(() => cognitoError("InvalidPasswordException"));
    renderLogin();

    await enterCredentials(user);
    await user.type(await screen.findByLabelText("Nova senha"), "fraquinha1");
    await user.type(screen.getByLabelText("Confirme a nova senha"), "fraquinha1");
    await user.click(screen.getByRole("button", { name: "Salvar e entrar" }));

    expect(
      await screen.findByText(/ao menos 8 caracteres, com letra maiúscula/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nova senha")).toBeInTheDocument();
  });

  it("senhas diferentes não chamam o Cognito", async () => {
    const user = userEvent.setup();
    const calls = firstAccess(() => HttpResponse.json(cognitoAuthResult()));
    renderLogin();

    await enterCredentials(user);
    await user.type(await screen.findByLabelText("Nova senha"), "NovaSenha123");
    await user.type(screen.getByLabelText("Confirme a nova senha"), "OutraSenha123");
    await user.click(screen.getByRole("button", { name: "Salvar e entrar" }));

    expect(await screen.findByText("As senhas não conferem.")).toBeInTheDocument();
    expect(calls).toHaveLength(1);
  });

  it("sessão do desafio expirada volta para o login", async () => {
    const user = userEvent.setup();
    firstAccess(() => cognitoError("NotAuthorizedException"));
    renderLogin();

    await enterCredentials(user);
    await user.type(await screen.findByLabelText("Nova senha"), "NovaSenha123");
    await user.type(screen.getByLabelText("Confirme a nova senha"), "NovaSenha123");
    await user.click(screen.getByRole("button", { name: "Salvar e entrar" }));

    expect(
      await screen.findByText("Sua sessão expirou. Entre novamente com a senha temporária."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toHaveValue("");
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
  });

  it("credenciais erradas mostram erro", async () => {
    const user = userEvent.setup();
    mockCognito(() => cognitoError("NotAuthorizedException"));
    renderLogin();

    await enterCredentials(user, "errada");

    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeInTheDocument();
  });
});

describe("LoginPage (mock)", () => {
  it("continua aceitando qualquer senha", async () => {
    const user = userEvent.setup();
    renderLogin("mock");

    expect(screen.getByText(/Ambiente de demonstração/)).toBeInTheDocument();
    await enterCredentials(user, "qualquer");

    expect(await screen.findByText("painel")).toBeInTheDocument();
  });
});
