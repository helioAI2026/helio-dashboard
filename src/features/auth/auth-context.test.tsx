import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { HttpResponse } from "msw";

import { AuthProvider, roleFromGroups, useAuth } from "./auth-context";
import { UNAUTHORIZED_EVENT, loadTokens, saveTokens } from "./session";
import type { ApiMode } from "@/config/env";
import { cognitoError, mockCognito } from "@/test/cognito";
import { cognitoAuthResult, fakeIdToken } from "@/test/tokens";

function renderAuth(mode: ApiMode = "hybrid") {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider mode={mode}>{children}</AuthProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
}

describe("AuthProvider (híbrido)", () => {
  it("entra com Cognito e deriva o papel dos grupos", async () => {
    mockCognito(() =>
      HttpResponse.json(
        cognitoAuthResult({ name: "Ana Souza", "cognito:groups": ["GestorDeFrota"] }),
      ),
    );
    const { result } = renderAuth();

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.signIn("ana@helio.dev", "Senha1234");
    });

    expect(outcome).toBe("signed-in");
    expect(result.current.user).toMatchObject({
      name: "Ana Souza",
      email: "ana@helio.dev",
      role: "Gestor de Frota",
    });
    expect(loadTokens()?.refreshToken).toBe("refresh-1");
  });

  it("restaura a sessão salva ao recarregar", () => {
    saveTokens({
      idToken: fakeIdToken(),
      refreshToken: "r",
      expiresAt: Date.now() + 3_600_000,
    });

    const { result } = renderAuth();

    expect(result.current.user?.role).toBe("Administrador");
  });

  it("troca a senha no primeiro acesso", async () => {
    const calls = mockCognito((target) =>
      target === "InitiateAuth"
        ? HttpResponse.json({ ChallengeName: "NEW_PASSWORD_REQUIRED", Session: "sess-1" })
        : HttpResponse.json(cognitoAuthResult()),
    );
    const { result } = renderAuth();

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.signIn("ana@helio.dev", "Temp1234");
    });
    expect(outcome).toBe("new-password-required");
    expect(result.current.user).toBeNull();

    await act(async () => {
      await result.current.completeNewPassword("NovaSenha123");
    });

    expect(result.current.user?.email).toBe("ana@helio.dev");
    expect(calls[1]!.body).toMatchObject({
      Session: "sess-1",
      ChallengeResponses: { USERNAME: "ana@helio.dev", NEW_PASSWORD: "NovaSenha123" },
    });
  });

  it("rejeita senha errada sem abrir sessão", async () => {
    mockCognito(() => cognitoError("NotAuthorizedException"));
    const { result } = renderAuth();

    let error: unknown;
    await act(async () => {
      try {
        await result.current.signIn("ana@helio.dev", "errada");
      } catch (err) {
        error = err;
      }
    });

    expect((error as Error).message).toBe("E-mail ou senha incorretos.");
    expect(result.current.user).toBeNull();
  });

  it("sai quando a API recusa a sessão", () => {
    saveTokens({
      idToken: fakeIdToken(),
      refreshToken: "r",
      expiresAt: Date.now() + 3_600_000,
    });
    const { result } = renderAuth();

    act(() => {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    });

    expect(result.current.user).toBeNull();
  });

  it("sair apaga os tokens", () => {
    saveTokens({
      idToken: fakeIdToken(),
      refreshToken: "r",
      expiresAt: Date.now() + 3_600_000,
    });
    const { result } = renderAuth();

    act(() => result.current.signOut());

    expect(result.current.user).toBeNull();
    expect(loadTokens()).toBeNull();
  });
});

describe("AuthProvider (mock)", () => {
  it("mantém o login de demonstração", async () => {
    const { result } = renderAuth("mock");

    await act(async () => {
      await result.current.signIn("joao.silva@empresa.com", "qualquer");
    });

    expect(result.current.user).toMatchObject({
      name: "Joao Silva",
      role: "Gestor de Frota",
    });
  });
});

describe("roleFromGroups", () => {
  it("usa o grupo de maior precedência e Operador por padrão", () => {
    expect(roleFromGroups([])).toBe("Operador");
    expect(roleFromGroups(["Operador", "Administrador"])).toBe("Administrador");
    expect(roleFromGroups(["Operador", "GestorDeFrota"])).toBe("Gestor de Frota");
  });
});
