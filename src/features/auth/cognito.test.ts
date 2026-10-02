import { describe, expect, it } from "vitest";
import { HttpResponse } from "msw";

import {
  completeNewPassword,
  decodeIdToken,
  refreshTokens,
  signInWithPassword,
} from "./cognito";
import { cognitoError, mockCognito } from "@/test/cognito";
import { cognitoAuthResult, fakeIdToken } from "@/test/tokens";

describe("cognito", () => {
  it("entra com usuário e senha", async () => {
    const calls = mockCognito(() => HttpResponse.json(cognitoAuthResult()));
    const before = Date.now();

    const result = await signInWithPassword("ana@helio.dev", "Senha1234");

    expect(result.status).toBe("signed-in");
    if (result.status !== "signed-in") return;
    expect(result.tokens.refreshToken).toBe("refresh-1");
    expect(result.tokens.expiresAt).toBeGreaterThanOrEqual(before + 3600 * 1000);
    expect(calls[0]).toMatchObject({
      target: "InitiateAuth",
      body: {
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: { USERNAME: "ana@helio.dev", PASSWORD: "Senha1234" },
      },
    });
  });

  it("devolve o desafio de nova senha no primeiro acesso", async () => {
    mockCognito(() =>
      HttpResponse.json({ ChallengeName: "NEW_PASSWORD_REQUIRED", Session: "sess-1" }),
    );

    expect(await signInWithPassword("ana@helio.dev", "Temp1234")).toEqual({
      status: "new-password-required",
      session: "sess-1",
    });
  });

  it("traduz senha errada", async () => {
    mockCognito(() => cognitoError("NotAuthorizedException"));

    await expect(signInWithPassword("ana@helio.dev", "errada")).rejects.toThrow(
      "E-mail ou senha incorretos.",
    );
  });

  it("conclui a troca de senha com a sessão do desafio", async () => {
    const calls = mockCognito(() => HttpResponse.json(cognitoAuthResult()));

    const tokens = await completeNewPassword("ana@helio.dev", "NovaSenha123", "sess-1");

    expect(tokens.refreshToken).toBe("refresh-1");
    expect(calls[0]).toMatchObject({
      target: "RespondToAuthChallenge",
      body: {
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        Session: "sess-1",
        ChallengeResponses: { USERNAME: "ana@helio.dev", NEW_PASSWORD: "NovaSenha123" },
      },
    });
  });

  it("renova os tokens mantendo o refresh token anterior", async () => {
    const calls = mockCognito(() => HttpResponse.json(cognitoAuthResult({}, null)));

    const tokens = await refreshTokens("refresh-antigo");

    expect(tokens.refreshToken).toBe("refresh-antigo");
    expect(calls[0]!.body).toMatchObject({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: { REFRESH_TOKEN: "refresh-antigo" },
    });
  });

  it("decodifica o ID token com acentos e grupos", () => {
    const claims = decodeIdToken(
      fakeIdToken({ name: "João Araújo", "cognito:groups": ["GestorDeFrota"] }),
    );

    expect(claims).toMatchObject({
      sub: "user-1",
      email: "ana@helio.dev",
      name: "João Araújo",
      groups: ["GestorDeFrota"],
    });
  });

  it("ID token sem grupos tem lista vazia", () => {
    expect(decodeIdToken(fakeIdToken({ "cognito:groups": undefined })).groups).toEqual(
      [],
    );
  });
});
