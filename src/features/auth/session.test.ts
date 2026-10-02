import { describe, expect, it } from "vitest";
import { HttpResponse } from "msw";

import { getIdToken, loadTokens, saveTokens } from "./session";
import { cognitoError, mockCognito } from "@/test/cognito";
import { cognitoAuthResult } from "@/test/tokens";

describe("session", () => {
  it("sem sessão salva não há token", async () => {
    expect(await getIdToken()).toBeNull();
  });

  it("usa o token salvo enquanto ele é válido", async () => {
    const calls = mockCognito(() => HttpResponse.json(cognitoAuthResult()));
    saveTokens({
      idToken: "id-valido",
      refreshToken: "r",
      expiresAt: Date.now() + 3_600_000,
    });

    expect(await getIdToken()).toBe("id-valido");
    expect(calls).toHaveLength(0);
  });

  it("renova o token expirado", async () => {
    mockCognito(() => HttpResponse.json(cognitoAuthResult({}, null)));
    saveTokens({
      idToken: "id-velho",
      refreshToken: "refresh-x",
      expiresAt: Date.now() - 1,
    });

    const token = await getIdToken();

    expect(token).not.toBe("id-velho");
    expect(loadTokens()).toMatchObject({ idToken: token, refreshToken: "refresh-x" });
  });

  it("renova uma única vez para chamadas simultâneas", async () => {
    const calls = mockCognito(() => HttpResponse.json(cognitoAuthResult()));
    saveTokens({ idToken: "id-velho", refreshToken: "r", expiresAt: Date.now() - 1 });

    const [a, b] = await Promise.all([getIdToken(), getIdToken()]);

    expect(a).toBe(b);
    expect(calls).toHaveLength(1);
  });

  it("limpa a sessão quando a renovação falha", async () => {
    mockCognito(() => cognitoError("NotAuthorizedException"));
    saveTokens({
      idToken: "id-velho",
      refreshToken: "revogado",
      expiresAt: Date.now() - 1,
    });

    expect(await getIdToken()).toBeNull();
    expect(loadTokens()).toBeNull();
  });
});
