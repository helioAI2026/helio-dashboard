import { describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";

import { apiGet } from "./client";
import { server } from "@/api/mock/server";
import { UNAUTHORIZED_EVENT, loadTokens, saveTokens } from "@/features/auth/session";

function captureAuthorization() {
  const seen: (string | null)[] = [];
  server.use(
    http.get("/api/ping", ({ request }) => {
      seen.push(request.headers.get("Authorization"));
      return HttpResponse.json({ ok: true });
    }),
  );
  return seen;
}

describe("client", () => {
  it("envia o ID token como Bearer", async () => {
    const seen = captureAuthorization();
    saveTokens({ idToken: "id-1", refreshToken: "r", expiresAt: Date.now() + 3_600_000 });

    await apiGet("/api/ping");

    expect(seen).toEqual(["Bearer id-1"]);
  });

  it("sem sessão não envia Authorization", async () => {
    const seen = captureAuthorization();

    await apiGet("/api/ping");

    expect(seen).toEqual([null]);
  });

  it("encerra a sessão quando a API responde 401", async () => {
    server.use(http.get("/api/ping", () => new HttpResponse(null, { status: 401 })));
    saveTokens({ idToken: "id-1", refreshToken: "r", expiresAt: Date.now() + 3_600_000 });
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);

    await expect(apiGet("/api/ping")).rejects.toThrow("Erro 401");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(loadTokens()).toBeNull();
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });
});
