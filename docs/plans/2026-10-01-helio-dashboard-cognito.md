# Helio — Dashboard com Cognito e API real (Plano 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar o dashboard à nuvem do Helio. O login passa a ser real (Cognito), as telas de motoristas, alertas e limiares passam a ler a API real, e um script publica o build no S3/CloudFront. As telas que ainda não têm backend (veículos, dispositivos, MLOps, visão geral da frota) continuam no mock.

**Architecture:** Uma variável `VITE_API_MODE` escolhe entre `mock` (comportamento atual) e `hybrid`.
- No modo `hybrid`, o worker do MSW é iniciado **sem** os handlers de `/api/drivers`, `/api/events`, `/api/settings` e `/api/trips`. Essas requisições escapam do mock (`onUnhandledRequest: "bypass"`) e vão para a API real, que o CloudFront serve na mesma origem.
- O login conversa direto com o endpoint HTTP do Cognito (`InitiateAuth` com `USER_PASSWORD_AUTH`, `RespondToAuthChallenge` para o primeiro acesso, `REFRESH_TOKEN_AUTH` para renovar), sem SDK.
- Os tokens ficam no `localStorage`. O `client.ts` anexa `Authorization: Bearer <idToken>` e, quando recebe 401, encerra a sessão.

**Tech Stack:** React 19, Vite 6, TypeScript, TanStack Query 5, MSW 2, Vitest + Testing Library. Nenhuma dependência nova.

**Spec:** `/Users/matt/Projects/Helio/infra/docs/specs/2026-10-01-helio-aws-infra-design.md` (seção "Integração — dashboard"). O contrato da API está em `/Users/matt/Projects/Helio/infra/README.md` e em `infra/src/api_*.py`.

## Ajustes ao spec (decididos ao detalhar)

- **Login sem SDK:** em vez de `amazon-cognito-identity-js` (SRP), usamos `fetch` direto no endpoint do Cognito com `USER_PASSWORD_AUTH`. O App Client já libera esse fluxo, e assim não entra nenhuma dependência e os testes ficam simples com MSW. A senha trafega por TLS até o Cognito, em vez de uma prova SRP.
- **Script de deploy no dashboard:** fica em `dashboard/scripts/deploy.sh`, e não em `infra/scripts/deploy-dashboard.sh`. É ele quem gera o build do dashboard, então mora junto.
- **`/api/trips` no modo mock:** ganha handler MSW que devolve lista vazia (detalhe dá 404), para a página do motorista não quebrar.
- **Período "Todo o período" no modo híbrido:** vira "últimos 30 dias", porque a API aceita no máximo 31 dias por consulta.
- **Campos nulos:** `frames`, `location`, `vehicleId` e `driverId` do evento passam a aceitar `null`, porque eventos reais não têm imagem, GPS nem veículo (achado do review da infra).

## Global Constraints

- Todo texto de interface em pt-BR.
- Nenhuma dependência nova no `package.json`.
- Antes de cada commit: `npx tsc -b` sem erros, `npx eslint .` sem erros e `npx prettier --write` nos arquivos alterados.
- O modo padrão continua `mock`. Sem `VITE_API_MODE=hybrid`, o app e os testes existentes se comportam exatamente como hoje.
- Grupos do Cognito → papéis: `Administrador` → "Administrador", `GestorDeFrota` → "Gestor de Frota", `Operador` → "Operador". Usuário sem grupo vira "Operador" (menor privilégio). Com mais de um grupo, vale o de maior precedência (Administrador > Gestor > Operador).
- Chave do `localStorage` para os tokens: `helio.cognito`. A chave do mock (`helio.session`) continua igual.
- Região padrão `us-east-1`. Stack `helio`.
- Commits em pt-BR no estilo `feat: ...`, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Token expirado no meio da sessão:** é renovado sem o usuário perceber. Se a renovação falhar (refresh token vencido ou revogado), a sessão é limpa e o usuário volta ao login, sem loop de 401. Testes: `renova o token expirado` e `limpa a sessão quando a renovação falha` (Task 3); `encerra a sessão quando a API responde 401` (Task 3).
2. **Várias requisições com o token vencido ao mesmo tempo:** só uma chamada de renovação vai ao Cognito. Teste: `renova uma única vez para chamadas simultâneas` (Task 3).
3. **Alerta real sem imagem, GPS, veículo ou motorista:** o drawer abre sem quebrar. Teste: `abre alerta real sem imagem, local, veículo nem motorista` (Task 5).
4. **Usuário sem grupo ou com vários grupos:** recebe o papel certo. Testes: `roleFromGroups` (Task 4).
5. **Primeiro acesso com senha nova fraca:** a mensagem do Cognito aparece em pt-BR e a tela continua na etapa de troca de senha. Teste: `senha nova fraca mostra a regra e continua na etapa` (Task 4).

## File Structure

```
dashboard/
  src/config/env.ts                  # NOVO: modo da API e config do Cognito (VITE_*)
  src/vite-env.d.ts                  # tipagem das VITE_*
  src/api/mock/mode.ts               # NOVO: quais handlers do MSW ficam ativos em cada modo
  src/api/mock/browser.ts            # usa mockHandlersFor(env.apiMode)
  src/api/mock/handlers.ts           # + /api/trips (lista vazia no mock)
  src/main.tsx                       # simulação ao vivo só no modo mock
  src/features/auth/cognito.ts       # NOVO: InitiateAuth / RespondToAuthChallenge / refresh / decode
  src/features/auth/session.ts       # NOVO: tokens no localStorage, getIdToken com renovação, evento 401
  src/features/auth/auth-context.tsx # modo híbrido (Cognito) + troca de senha
  src/features/auth/LoginPage.tsx    # login assíncrono + etapa de nova senha
  src/api/client.ts                  # Authorization: Bearer + tratamento de 401
  src/api/types.ts                   # campos nulos no evento, Trip/TripDetail, assignedDeviceId
  src/api/queries.ts                 # useTrips / useTrip
  src/features/alerts/AlertDetailDrawer.tsx, AlertsPage.tsx, useAlertFilters.ts
  src/features/overview/ActiveAlertsPanel.tsx
  src/features/drivers/DriverDetailPage.tsx  # card "Viagens recentes"
  src/test/tokens.ts, src/test/cognito.ts    # NOVOS: helpers de teste
  vite.config.ts                     # proxy /api opcional para dev híbrido
  scripts/deploy.sh                  # NOVO: build híbrido + S3 + invalidação
  README.md                          # seção "Modo híbrido e deploy"
```

---

### Task 1: Repositório, modo da API e filtro dos handlers do MSW

**Files:**
- Create: `src/config/env.ts`, `src/api/mock/mode.ts`
- Modify: `src/vite-env.d.ts`, `src/api/mock/browser.ts`, `src/api/mock/handlers.ts`, `src/main.tsx`
- Test: `src/api/mock/mode.test.ts`

**Interfaces:**
- Produces:
  - `env.ts`: `type ApiMode = "mock" | "hybrid"` e `env = { apiMode, cognitoRegion, cognitoClientId }`.
  - `mode.ts`: `REAL_API_PREFIXES` e `mockHandlersFor(mode: ApiMode, all?: RequestHandler[]): RequestHandler[]`.

- [ ] **Step 1: Commit inicial e branch**

O repositório do dashboard não tem nenhum commit. Antes de mudar qualquer coisa, registre o estado atual como base. O `.gitignore` já ignora `node_modules`, `dist` e `*.local`.

```bash
cd /Users/matt/Projects/Helio/dashboard
git status --short | grep -E "\.env|secret|credential" || echo "nada sensível"
git add -A -- . ':!docs'
git commit -m "chore: estado inicial do dashboard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git checkout -b feat/cognito-api
git add docs && git commit -m "docs: adiciona plano de integração com Cognito e API real

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Expected: o primeiro comando imprime `nada sensível`; os dois commits são criados e a branch atual é `feat/cognito-api`.

- [ ] **Step 2: Escrever o teste que deve falhar**

`src/api/mock/mode.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { HttpHandler, type RequestHandler } from "msw";

import { handlers } from "./handlers";
import { mockHandlersFor } from "./mode";

function routes(list: RequestHandler[]): string[] {
  return list
    .filter((h): h is HttpHandler => h instanceof HttpHandler)
    .map((h) => `${h.info.method} ${String(h.info.path)}`);
}

describe("mockHandlersFor", () => {
  it("no modo mock mantém todos os handlers", () => {
    expect(mockHandlersFor("mock")).toBe(handlers);
  });

  it("no modo híbrido deixa a API real atender motoristas, alertas, limiares e viagens", () => {
    const active = routes(mockHandlersFor("hybrid"));
    for (const real of [
      "GET /api/drivers",
      "GET /api/drivers/:id",
      "GET /api/drivers/:id/history",
      "GET /api/events",
      "POST /api/events/:id/acknowledge",
      "GET /api/settings/thresholds",
      "PUT /api/settings/thresholds",
      "GET /api/trips",
    ]) {
      expect(active).not.toContain(real);
    }
    for (const mocked of [
      "GET /api/fleet/stats",
      "GET /api/vehicles",
      "GET /api/devices",
      "GET /api/models",
      "GET /api/frames/:id/ir.svg",
    ]) {
      expect(active).toContain(mocked);
    }
  });
});
```

- [ ] **Step 3: Rodar e confirmar a falha**

Run: `npx vitest run src/api/mock/mode.test.ts`
Expected: FAIL com `Failed to resolve import "./mode"`.

- [ ] **Step 4: Implementar**

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: string;
  readonly VITE_COGNITO_REGION?: string;
  readonly VITE_COGNITO_CLIENT_ID?: string;
  readonly VITE_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

`src/config/env.ts`:
```ts
/**
 * Configuração vinda das variáveis VITE_* no build. Sem VITE_API_MODE=hybrid
 * o app roda 100% no mock (MSW), como antes.
 */
export type ApiMode = "mock" | "hybrid";

export const env = {
  apiMode: (import.meta.env.VITE_API_MODE === "hybrid" ? "hybrid" : "mock") as ApiMode,
  cognitoRegion: import.meta.env.VITE_COGNITO_REGION ?? "us-east-1",
  cognitoClientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? "",
};
```

`src/api/mock/mode.ts`:
```ts
import { HttpHandler, type RequestHandler } from "msw";

import type { ApiMode } from "@/config/env";
import { handlers } from "./handlers";

/** Rotas atendidas pela API real no modo híbrido; o restante continua no mock. */
export const REAL_API_PREFIXES = [
  "/api/drivers",
  "/api/events",
  "/api/settings",
  "/api/trips",
] as const;

export function mockHandlersFor(
  mode: ApiMode,
  all: RequestHandler[] = handlers,
): RequestHandler[] {
  if (mode === "mock") return all;
  return all.filter(
    (h) =>
      !(
        h instanceof HttpHandler &&
        REAL_API_PREFIXES.some((prefix) => String(h.info.path).startsWith(prefix))
      ),
  );
}
```

`src/api/mock/browser.ts`:
```ts
import { setupWorker } from "msw/browser";

import { env } from "@/config/env";
import { mockHandlersFor } from "./mode";

export const worker = setupWorker(...mockHandlersFor(env.apiMode));
```

Em `src/api/mock/handlers.ts`, logo antes do bloco `// ─── ML ───`, acrescente:
```ts
  // ─── Trips (só existem na API real; no mock a lista é vazia) ───────────────
  http.get(`${API}/trips`, async () => {
    await latency();
    return HttpResponse.json([]);
  }),
  http.get(`${API}/trips/:id`, async () => {
    await latency();
    return HttpResponse.json({ message: "Viagem não encontrada" }, { status: 404 });
  }),

```

Em `src/main.tsx`, importe `import { env } from "@/config/env";` e troque:
```ts
enableMocking().then(async () => {
  const { startLiveSimulation } = await import("@/api/mock/live");
  startLiveSimulation(queryClient);
```
por:
```ts
enableMocking().then(async () => {
  if (env.apiMode === "mock") {
    const { startLiveSimulation } = await import("@/api/mock/live");
    startLiveSimulation(queryClient);
  }
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run && npx tsc -b && npx eslint .`
Expected: todos os testes passam (42 anteriores + 2 novos), e tsc e eslint saem sem erros.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/config src/vite-env.d.ts src/api/mock src/main.tsx
git add src
git commit -m "feat: adiciona modo híbrido que libera rotas reais do MSW

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Cliente do Cognito (sem SDK)

**Files:**
- Create: `src/features/auth/cognito.ts`, `src/test/tokens.ts`, `src/test/cognito.ts`
- Test: `src/features/auth/cognito.test.ts`

**Interfaces:**
- Consumes: `env` (Task 1).
- Produces:
  - Tipos: `Tokens = { idToken, refreshToken, expiresAt }`, `SignInResult`, `IdClaims = { sub, email, name?, groups, exp }`, `class CognitoError(code, message)`.
  - Funções: `cognitoEndpoint()`, `signInWithPassword(email, password)`, `completeNewPassword(email, newPassword, session)`, `refreshTokens(refreshToken)`, `decodeIdToken(idToken)`.
  - Helpers de teste: `fakeIdToken(claims?)`, `cognitoAuthResult(claims?, refreshToken?)`, `mockCognito(respond)` (devolve a lista de chamadas `{target, body}`), `cognitoError(type)`.

- [ ] **Step 1: Helpers de teste**

`src/test/tokens.ts`:
```ts
function base64url(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** JWT falso no formato do ID token do Cognito (assinatura não é verificada no front). */
export function fakeIdToken(claims: Record<string, unknown> = {}): string {
  return [
    base64url({ alg: "none", typ: "JWT" }),
    base64url({
      sub: "user-1",
      email: "ana@helio.dev",
      "cognito:groups": ["Administrador"],
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...claims,
    }),
    "assinatura",
  ].join(".");
}

export function cognitoAuthResult(
  claims: Record<string, unknown> = {},
  refreshToken: string | null = "refresh-1",
) {
  return {
    AuthenticationResult: {
      IdToken: fakeIdToken(claims),
      ...(refreshToken ? { RefreshToken: refreshToken } : {}),
      ExpiresIn: 3600,
      TokenType: "Bearer",
    },
  };
}
```

`src/test/cognito.ts`:
```ts
import { HttpResponse, http } from "msw";

import { server } from "@/api/mock/server";
import { cognitoEndpoint } from "@/features/auth/cognito";

export type CognitoCall = { target: string; body: Record<string, unknown> };

/** Intercepta o endpoint do Cognito; `respond` recebe a operação (ex.: "InitiateAuth") e o corpo. */
export function mockCognito(
  respond: (target: string, body: Record<string, unknown>) => Response | Promise<Response>,
): CognitoCall[] {
  const calls: CognitoCall[] = [];
  server.use(
    http.post(cognitoEndpoint(), async ({ request }) => {
      const target = (request.headers.get("X-Amz-Target") ?? "").split(".").pop() ?? "";
      const body = (await request.json()) as Record<string, unknown>;
      calls.push({ target, body });
      return respond(target, body);
    }),
  );
  return calls;
}

export function cognitoError(type: string) {
  return HttpResponse.json({ __type: type, message: type }, { status: 400 });
}
```

- [ ] **Step 2: Escrever os testes que devem falhar**

`src/features/auth/cognito.test.ts`:
```ts
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
    expect(decodeIdToken(fakeIdToken({ "cognito:groups": undefined })).groups).toEqual([]);
  });
});
```

- [ ] **Step 3: Rodar e confirmar a falha**

Run: `npx vitest run src/features/auth/cognito.test.ts`
Expected: FAIL com `Failed to resolve import "./cognito"` (também vindo de `src/test/cognito.ts`).

- [ ] **Step 4: Implementar**

`src/features/auth/cognito.ts`:
```ts
/**
 * Login direto no endpoint HTTP do Cognito (sem SDK): InitiateAuth com
 * USER_PASSWORD_AUTH, RespondToAuthChallenge para o primeiro acesso e
 * REFRESH_TOKEN_AUTH para renovar a sessão.
 */
import { env } from "@/config/env";

export type Tokens = { idToken: string; refreshToken: string; expiresAt: number };

export type SignInResult =
  | { status: "signed-in"; tokens: Tokens }
  | { status: "new-password-required"; session: string };

export type IdClaims = {
  sub: string;
  email: string;
  name?: string;
  groups: string[];
  exp: number;
};

export class CognitoError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "CognitoError";
  }
}

const MESSAGES: Record<string, string> = {
  NotAuthorizedException: "E-mail ou senha incorretos.",
  UserNotFoundException: "E-mail ou senha incorretos.",
  InvalidPasswordException:
    "A nova senha precisa ter ao menos 8 caracteres, com letra maiúscula, minúscula e número.",
  PasswordResetRequiredException: "É preciso redefinir a senha. Fale com o administrador.",
  TooManyRequestsException: "Muitas tentativas. Aguarde alguns instantes.",
  LimitExceededException: "Muitas tentativas. Aguarde alguns instantes.",
};

type AuthResult = { IdToken: string; RefreshToken?: string; ExpiresIn: number };
type AuthResponse = {
  AuthenticationResult?: AuthResult;
  ChallengeName?: string;
  Session?: string;
};

export function cognitoEndpoint(region: string = env.cognitoRegion): string {
  return `https://cognito-idp.${region}.amazonaws.com/`;
}

async function call(target: string, body: unknown): Promise<AuthResponse> {
  let response: Response;
  try {
    response = await fetch(cognitoEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new CognitoError("NetworkError", "Sem conexão com o serviço de login.");
  }
  const data = (await response.json().catch(() => ({}))) as AuthResponse & {
    __type?: string;
  };
  if (!response.ok) {
    const code = (data.__type ?? "Unknown").split("#").pop() ?? "Unknown";
    throw new CognitoError(code, MESSAGES[code] ?? "Não foi possível entrar. Tente novamente.");
  }
  return data;
}

function toTokens(result: AuthResult, previousRefreshToken?: string): Tokens {
  return {
    idToken: result.IdToken,
    refreshToken: result.RefreshToken ?? previousRefreshToken ?? "",
    expiresAt: Date.now() + result.ExpiresIn * 1000,
  };
}

function requireResult(data: AuthResponse): AuthResult {
  if (!data.AuthenticationResult) {
    throw new CognitoError("UnsupportedChallenge", "Etapa de login não suportada.");
  }
  return data.AuthenticationResult;
}

export async function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  const data = await call("InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: env.cognitoClientId,
    AuthParameters: { USERNAME: email, PASSWORD: password },
  });
  if (data.ChallengeName === "NEW_PASSWORD_REQUIRED" && data.Session) {
    return { status: "new-password-required", session: data.Session };
  }
  return { status: "signed-in", tokens: toTokens(requireResult(data)) };
}

export async function completeNewPassword(
  email: string,
  newPassword: string,
  session: string,
): Promise<Tokens> {
  const data = await call("RespondToAuthChallenge", {
    ChallengeName: "NEW_PASSWORD_REQUIRED",
    ClientId: env.cognitoClientId,
    Session: session,
    ChallengeResponses: { USERNAME: email, NEW_PASSWORD: newPassword },
  });
  return toTokens(requireResult(data));
}

export async function refreshTokens(refreshToken: string): Promise<Tokens> {
  const data = await call("InitiateAuth", {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: env.cognitoClientId,
    AuthParameters: { REFRESH_TOKEN: refreshToken },
  });
  return toTokens(requireResult(data), refreshToken);
}

export function decodeIdToken(idToken: string): IdClaims {
  const payload = idToken.split(".")[1];
  if (!payload) throw new CognitoError("InvalidToken", "Sessão inválida.");
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const json = new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
  const raw = JSON.parse(json) as Record<string, unknown>;
  return {
    sub: String(raw.sub),
    email: String(raw.email),
    name: typeof raw.name === "string" ? raw.name : undefined,
    groups: Array.isArray(raw["cognito:groups"]) ? (raw["cognito:groups"] as string[]) : [],
    exp: Number(raw.exp),
  };
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run src/features/auth/cognito.test.ts && npx tsc -b && npx eslint .`
Expected: 7 testes passam, e tsc e eslint saem sem erros. Se o eslint reclamar de `any` em `src/test/cognito.ts`, troque `Record<string, unknown>` por `Record<string, unknown>` nos dois lugares e use `toMatchObject` nos testes (que já é o que eles fazem).

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/features/auth/cognito.ts src/features/auth/cognito.test.ts src/test
git add src
git commit -m "feat: adiciona cliente do Cognito sem SDK

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Sessão (tokens, renovação) e `Authorization` no cliente da API

**Files:**
- Create: `src/features/auth/session.ts`
- Modify: `src/api/client.ts`
- Test: `src/features/auth/session.test.ts`, `src/api/client.test.ts`

**Interfaces:**
- Consumes: `refreshTokens` e `Tokens` (Task 2); `mockCognito`, `cognitoAuthResult` e `cognitoError` (Task 2).
- Produces: `UNAUTHORIZED_EVENT = "helio:unauthorized"`, `loadTokens()`, `saveTokens(tokens)`, `clearTokens()`, `getIdToken(): Promise<string | null>` e `notifyUnauthorized()`.

- [ ] **Step 1: Escrever os testes que devem falhar**

`src/features/auth/session.test.ts`:
```ts
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
    saveTokens({ idToken: "id-valido", refreshToken: "r", expiresAt: Date.now() + 3_600_000 });

    expect(await getIdToken()).toBe("id-valido");
    expect(calls).toHaveLength(0);
  });

  it("renova o token expirado", async () => {
    mockCognito(() => HttpResponse.json(cognitoAuthResult({}, null)));
    saveTokens({ idToken: "id-velho", refreshToken: "refresh-x", expiresAt: Date.now() - 1 });

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
    saveTokens({ idToken: "id-velho", refreshToken: "revogado", expiresAt: Date.now() - 1 });

    expect(await getIdToken()).toBeNull();
    expect(loadTokens()).toBeNull();
  });
});
```

`src/api/client.test.ts`:
```ts
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
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/features/auth/session.test.ts src/api/client.test.ts`
Expected: FAIL com `Failed to resolve import "./session"` / `"@/features/auth/session"`.

- [ ] **Step 3: Implementar**

`src/features/auth/session.ts`:
```ts
import { refreshTokens, type Tokens } from "./cognito";

const STORAGE_KEY = "helio.cognito";
/** Renova um pouco antes de expirar, para não mandar token vencido. */
const EXPIRY_SKEW_MS = 60_000;

export const UNAUTHORIZED_EVENT = "helio:unauthorized";

export function loadTokens(): Tokens | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: Tokens): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    /* ignore */
  }
}

export function clearTokens(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

let refreshing: Promise<string | null> | null = null;

/** ID token válido para a API; renova se necessário. `null` quando não há sessão. */
export async function getIdToken(): Promise<string | null> {
  const tokens = loadTokens();
  if (!tokens) return null;
  if (tokens.expiresAt - EXPIRY_SKEW_MS > Date.now()) return tokens.idToken;

  refreshing ??= refreshTokens(tokens.refreshToken)
    .then((next) => {
      saveTokens(next);
      return next.idToken;
    })
    .catch(() => {
      clearTokens();
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** Sessão recusada pela API: limpa os tokens e avisa o AuthProvider. */
export function notifyUnauthorized(): void {
  clearTokens();
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}
```

Em `src/api/client.ts`:
1. Acrescente o import, logo abaixo do comentário do topo:
```ts
import { getIdToken, notifyUnauthorized } from "@/features/auth/session";
```
2. Troque o início de `request` por:
```ts
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getIdToken();
  const response = await fetch(resolve(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 401 && token) notifyUnauthorized();
```
O restante da função (`if (!response.ok) { ... }` em diante) fica igual.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run && npx tsc -b && npx eslint .`
Expected: todos os testes passam, e tsc e eslint saem sem erros.

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/features/auth/session.ts src/features/auth/session.test.ts src/api/client.ts src/api/client.test.ts
git add src
git commit -m "feat: envia o token do Cognito à API e renova a sessão

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Login real (AuthProvider híbrido + tela com troca de senha)

**Files:**
- Modify: `src/features/auth/auth-context.tsx`, `src/features/auth/LoginPage.tsx`
- Test: `src/features/auth/auth-context.test.tsx`, `src/features/auth/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `signInWithPassword`, `completeNewPassword`, `decodeIdToken` (Task 2); `loadTokens`, `saveTokens`, `clearTokens`, `UNAUTHORIZED_EVENT` (Task 3); `env`, `ApiMode` (Task 1).
- Produces:
  - `AuthProvider({ children, mode? })`; `mode` é `env.apiMode` por padrão.
  - `useAuth()` devolve `{ mode, user, isAuthenticated, signIn(email, password): Promise<SignInOutcome>, completeNewPassword(newPassword): Promise<void>, signOut() }`.
  - `type SignInOutcome = "signed-in" | "new-password-required"`, `type Role` e `roleFromGroups(groups): Role`.

- [ ] **Step 1: Escrever os testes que devem falhar**

`src/features/auth/auth-context.test.tsx`:
```tsx
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
    saveTokens({ idToken: fakeIdToken(), refreshToken: "r", expiresAt: Date.now() + 3_600_000 });

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
    saveTokens({ idToken: fakeIdToken(), refreshToken: "r", expiresAt: Date.now() + 3_600_000 });
    const { result } = renderAuth();

    act(() => {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    });

    expect(result.current.user).toBeNull();
  });

  it("sair apaga os tokens", () => {
    saveTokens({ idToken: fakeIdToken(), refreshToken: "r", expiresAt: Date.now() + 3_600_000 });
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

    expect(result.current.user).toMatchObject({ name: "Joao Silva", role: "Gestor de Frota" });
  });
});

describe("roleFromGroups", () => {
  it("usa o grupo de maior precedência e Operador por padrão", () => {
    expect(roleFromGroups([])).toBe("Operador");
    expect(roleFromGroups(["Operador", "Administrador"])).toBe("Administrador");
    expect(roleFromGroups(["Operador", "GestorDeFrota"])).toBe("Gestor de Frota");
  });
});
```

`src/features/auth/LoginPage.test.tsx`:
```tsx
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

async function enterCredentials(user: ReturnType<typeof userEvent.setup>, password = "Temp1234") {
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

    expect(await screen.findByText(/ao menos 8 caracteres, com letra maiúscula/)).toBeInTheDocument();
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
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/features/auth/auth-context.test.tsx src/features/auth/LoginPage.test.tsx`
Expected: FAIL. `roleFromGroups` não existe, `AuthProvider` ignora `mode`, e a tela não tem "Nova senha".

- [ ] **Step 3: Implementar `auth-context.tsx`**

Substitua o arquivo inteiro por:
```tsx
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { env, type ApiMode } from "@/config/env";
import {
  completeNewPassword as cognitoCompleteNewPassword,
  decodeIdToken,
  signInWithPassword,
} from "./cognito";
import { UNAUTHORIZED_EVENT, clearTokens, loadTokens, saveTokens } from "./session";

export type Role = "Gestor de Frota" | "Operador" | "Administrador";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type SignInOutcome = "signed-in" | "new-password-required";

const STORAGE_KEY = "helio.session";

type AuthContextValue = {
  mode: ApiMode;
  user: CurrentUser | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<SignInOutcome>;
  completeNewPassword: (newPassword: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Ordem de precedência: o primeiro grupo encontrado define o papel. */
const ROLE_BY_GROUP: [string, Role][] = [
  ["Administrador", "Administrador"],
  ["GestorDeFrota", "Gestor de Frota"],
  ["Operador", "Operador"],
];

export function roleFromGroups(groups: string[]): Role {
  return ROLE_BY_GROUP.find(([group]) => groups.includes(group))?.[1] ?? "Operador";
}

function nameFromEmail(email: string): string {
  const handle = email.split("@")[0] ?? "operador";
  return handle
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function readMockUser(): CurrentUser | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

function userFromIdToken(idToken: string): CurrentUser {
  const claims = decodeIdToken(idToken);
  return {
    id: claims.sub,
    name: claims.name ?? nameFromEmail(claims.email),
    email: claims.email,
    role: roleFromGroups(claims.groups),
  };
}

function readCognitoUser(): CurrentUser | null {
  const tokens = loadTokens();
  if (!tokens) return null;
  try {
    return userFromIdToken(tokens.idToken);
  } catch {
    return null;
  }
}

export function AuthProvider({
  children,
  mode = env.apiMode,
}: {
  children: ReactNode;
  mode?: ApiMode;
}) {
  const [user, setUser] = useState<CurrentUser | null>(() =>
    mode === "hybrid" ? readCognitoUser() : readMockUser(),
  );
  const [challenge, setChallenge] = useState<{ email: string; session: string } | null>(null);

  useEffect(() => {
    if (mode !== "hybrid") return;
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [mode]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInOutcome> => {
      if (mode === "mock") {
        const next: CurrentUser = {
          id: "usr_local",
          name: nameFromEmail(email),
          email,
          role: "Gestor de Frota",
        };
        setUser(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return "signed-in";
      }

      const result = await signInWithPassword(email, password);
      if (result.status === "new-password-required") {
        setChallenge({ email, session: result.session });
        return "new-password-required";
      }
      saveTokens(result.tokens);
      setUser(userFromIdToken(result.tokens.idToken));
      return "signed-in";
    },
    [mode],
  );

  const completeNewPassword = useCallback(
    async (newPassword: string) => {
      if (!challenge) throw new Error("Nenhuma troca de senha pendente.");
      const tokens = await cognitoCompleteNewPassword(
        challenge.email,
        newPassword,
        challenge.session,
      );
      saveTokens(tokens);
      setChallenge(null);
      setUser(userFromIdToken(tokens.idToken));
    },
    [challenge],
  );

  const signOut = useCallback(() => {
    setUser(null);
    setChallenge(null);
    if (mode === "hybrid") {
      clearTokens();
      return;
    }
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const value = useMemo<AuthContextValue>(
    () => ({
      mode,
      user,
      isAuthenticated: user !== null,
      signIn,
      completeNewPassword,
      signOut,
    }),
    [mode, user, signIn, completeNewPassword, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return ctx;
}
```

- [ ] **Step 4: Implementar `LoginPage.tsx`**

Substitua o arquivo inteiro por:
```tsx
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Activity } from "lucide-react";

import { useAuth } from "./auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LocationState = { from?: { pathname: string } };

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "Não foi possível entrar. Tente novamente.";
}

export function LoginPage() {
  const { mode, signIn, completeNewPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<"credentials" | "new-password">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? "/";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Informe e-mail e senha para continuar.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const outcome = await signIn(email.trim(), password);
      if (outcome === "new-password-required") {
        setStep("new-password");
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNewPassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setError("A nova senha precisa ter ao menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await completeNewPassword(newPassword);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setSubmitting(false);
    }
  }

  const subtitle =
    mode === "mock"
      ? "Ambiente de demonstração — qualquer e-mail e senha são aceitos."
      : step === "new-password"
        ? "Primeiro acesso: defina uma nova senha para continuar."
        : "Use o e-mail e a senha cadastrados pelo administrador.";

  return (
    <div className="grid min-h-svh place-items-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Activity className="size-5" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-base font-semibold leading-none">Helio</p>
            <p className="kicker mt-1">Monitoramento de fadiga</p>
          </div>
        </div>

        <h1 className="text-lg font-semibold">
          {step === "new-password" ? "Definir nova senha" : "Entrar no painel"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

        {step === "credentials" ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="gestor@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleNewPassword} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirme a nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Mínimo de 8 caracteres, com letra maiúscula, minúscula e número.
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Salvando…" : "Salvar e entrar"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
```

Com o botão desabilitado durante o envio, o texto muda para "Entrando…". Os testes clicam antes disso e esperam pelo resultado com `findBy`, então não dependem desse texto.

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `grep -rn "signIn(" src --include=*.tsx | grep -v test`, depois `npx vitest run && npx tsc -b && npx eslint .`
Expected:
- O `grep` só encontra `LoginPage.tsx` e `auth-context.tsx`. Qualquer outro chamador precisa passar a senha e usar `await`.
- Todos os testes passam, inclusive `RequireAuth.test.tsx`, que continua no modo mock.
- tsc e eslint saem sem erros.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/features/auth
git add src
git commit -m "feat: adiciona login real com Cognito e troca de senha no primeiro acesso

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Eventos reais com campos nulos e período "Todo o período"

**Files:**
- Modify: `src/api/types.ts`, `src/features/alerts/AlertDetailDrawer.tsx`, `src/features/alerts/AlertsPage.tsx`, `src/features/overview/ActiveAlertsPanel.tsx`, `src/features/alerts/useAlertFilters.ts`
- Test: `src/features/alerts/AlertDetailDrawer.test.tsx`, `src/features/alerts/useAlertFilters.test.ts`

**Interfaces:**
- Consumes: `env`, `ApiMode` (Task 1).
- Produces:
  - `DrowsinessEvent` com `vehicleId: string | null`, `driverId: string | null`, `location: Coordinates | null`, `frames: {ir, landmarks} | null`, `tripId?: string` e `deviceId?: string`.
  - `Driver` com `assignedDeviceId?: string | null`.
  - `periodStart(period, mode?, now?)` exportada.

- [ ] **Step 1: Escrever os testes que devem falhar**

`src/features/alerts/AlertDetailDrawer.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HttpResponse, http } from "msw";

import { AlertDetailDrawer } from "./AlertDetailDrawer";
import { server } from "@/api/mock/server";
import { AppProviders } from "@/test/utils";

/** Evento como a API real devolve: sem imagem, GPS, veículo nem motorista. */
const realEvent = {
  id: "evt-real",
  tripId: "ride-1",
  deviceId: "helio-edge-01",
  vehicleId: null,
  driverId: null,
  timestamp: "2026-10-02T01:15:03.000Z",
  score: 91,
  severity: "critical",
  durationSec: 3.2,
  triggers: ["perclos", "eye-closure"],
  location: null,
  frames: null,
  acknowledgedAt: null,
  acknowledgedBy: null,
};

describe("AlertDetailDrawer", () => {
  it("abre alerta real sem imagem, local, veículo nem motorista", async () => {
    server.use(http.get("/api/events/:id", () => HttpResponse.json(realEvent)));

    render(
      <MemoryRouter>
        <AlertDetailDrawer eventId="evt-real" onClose={() => {}} />
      </MemoryRouter>,
      { wrapper: AppProviders },
    );

    expect(await screen.findByText("Sem imagem para este alerta")).toBeInTheDocument();
    expect(screen.getAllByText("evt-real").length).toBeGreaterThan(0);
  });
});
```

`src/features/alerts/useAlertFilters.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { periodStart } from "./useAlertFilters";

const NOW = Date.parse("2026-10-02T12:00:00.000Z");

describe("periodStart", () => {
  it("no mock, 'Todo o período' não limita a data", () => {
    expect(periodStart("all", "mock", NOW)).toBeUndefined();
  });

  it("na API real, 'Todo o período' vira os últimos 30 dias (limite da API)", () => {
    expect(periodStart("all", "hybrid", NOW)).toBe("2026-09-02T12:00:00.000Z");
  });

  it("períodos fixos são iguais nos dois modos", () => {
    expect(periodStart("24h", "hybrid", NOW)).toBe("2026-10-01T12:00:00.000Z");
    expect(periodStart("7d", "mock", NOW)).toBe("2026-09-25T12:00:00.000Z");
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/features/alerts/AlertDetailDrawer.test.tsx src/features/alerts/useAlertFilters.test.ts`
Expected: o drawer falha com `TypeError: Cannot read properties of null (reading 'ir')`, e `periodStart` falha por não ser exportada (`is not a function`).

- [ ] **Step 3: Tipos**

Em `src/api/types.ts`, troque o tipo `DrowsinessEvent` por:
```ts
export type DrowsinessEvent = {
  id: string;
  /** Nulo em eventos reais quando o motorista não tem veículo vinculado. */
  vehicleId: string | null;
  /** Nulo em eventos reais quando o dispositivo não está vinculado a um motorista. */
  driverId: string | null;
  /** Só na API real: viagem e dispositivo de origem. */
  tripId?: string;
  deviceId?: string;
  timestamp: string;
  score: number;
  severity: Severity;
  durationSec: number;
  triggers: EventTrigger[];
  /** O edge ainda não envia GPS. */
  location: Coordinates | null;
  /** O edge ainda não envia imagens. */
  frames: {
    ir: string;
    landmarks: string;
  } | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
};
```
e, em `Driver`, logo após `assignedVehicleId: string | null;`:
```ts
  /** Só na API real: dispositivo do Helio vinculado ao motorista. */
  assignedDeviceId?: string | null;
```

Run: `npx tsc -b`
Expected: erros apenas em `AlertDetailDrawer.tsx`, `AlertsPage.tsx` e `ActiveAlertsPanel.tsx`, os pontos corrigidos abaixo. Se aparecer outro arquivo, aplique o mesmo padrão (`?? "—"` para texto, `? :` para blocos) e registre no ledger.

- [ ] **Step 4: Corrigir as telas**

`src/features/alerts/AlertDetailDrawer.tsx`:
1. Troque
```tsx
  const vehicle = useVehicle(event.data?.vehicleId);
  const driver = useDriver(event.data?.driverId);
```
por
```tsx
  const vehicle = useVehicle(event.data?.vehicleId ?? undefined);
  const driver = useDriver(event.data?.driverId ?? undefined);
```
2. Troque o bloco que vai de `{/* IR frame + landmarks */}` até o `</label>` do switch "Sobrepor marcos faciais", inclusive, por:
```tsx
              {/* IR frame + landmarks */}
              {event.data.frames ? (
                <>
                  <div className="relative overflow-hidden rounded-lg border border-border bg-black">
                    <img
                      src={event.data.frames.ir}
                      alt="Quadro em infravermelho no momento do alerta"
                      className="w-full"
                      width={320}
                      height={240}
                    />
                    {showLandmarks && (
                      <img
                        src={event.data.frames.landmarks}
                        alt="Marcos faciais detectados"
                        className="pointer-events-none absolute inset-0 size-full"
                      />
                    )}
                    <div className="absolute left-2 top-2">
                      <SeverityPill severity={event.data.severity} score={event.data.score} />
                    </div>
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={showLandmarks} onCheckedChange={setShowLandmarks} />
                    <ScanFace className="size-3.5" />
                    Sobrepor marcos faciais
                  </label>
                </>
              ) : (
                <div className="relative grid aspect-[4/3] place-items-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                  Sem imagem para este alerta
                  <div className="absolute left-2 top-2">
                    <SeverityPill severity={event.data.severity} score={event.data.score} />
                  </div>
                </div>
              )}
```
3. Troque `: event.data.vehicleId}` por `: (event.data.vehicleId ?? "—")}`.
4. Troque
```tsx
                    {formatCoords(
                      event.data.location.lat,
                      event.data.location.lng,
                    )}
```
por
```tsx
                    {event.data.location
                      ? formatCoords(event.data.location.lat, event.data.location.lng)
                      : "—"}
```

`src/features/alerts/AlertsPage.tsx`:
- Troque `const v = vehicleById.get(row.original.vehicleId);` por
  `const v = row.original.vehicleId ? vehicleById.get(row.original.vehicleId) : undefined;`
- Troque `{v ? formatPlate(v.plate) : row.original.vehicleId}` por
  `{v ? formatPlate(v.plate) : (row.original.vehicleId ?? "—")}`
- Troque `driverById.get(row.original.driverId)?.name ?? "—",` por
  `(row.original.driverId ? driverById.get(row.original.driverId)?.name : undefined) ?? "—",`

`src/features/overview/ActiveAlertsPanel.tsx`:
- Troque `const vehicle = byId.get(event.vehicleId);` por
  `const vehicle = event.vehicleId ? byId.get(event.vehicleId) : undefined;`
- Troque `{vehicle ? formatPlate(vehicle.plate) : event.vehicleId}` por
  `{vehicle ? formatPlate(vehicle.plate) : (event.vehicleId ?? "—")}`

`src/features/alerts/useAlertFilters.ts`: acrescente `import { env, type ApiMode } from "@/config/env";` e troque a função `periodStart` por:
```ts
const DAY_MS = 86_400_000;
/** A API real aceita no máximo 31 dias por consulta. */
const REAL_API_MAX_DAYS = 30;

export function periodStart(
  period: AlertPeriod,
  mode: ApiMode = env.apiMode,
  now: number = Date.now(),
): string | undefined {
  if (period === "all") {
    return mode === "hybrid" ? new Date(now - REAL_API_MAX_DAYS * DAY_MS).toISOString() : undefined;
  }
  const days = period === "24h" ? 1 : period === "7d" ? 7 : 30;
  return new Date(now - days * DAY_MS).toISOString();
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run && npx tsc -b && npx eslint .`
Expected: todos os testes passam, e tsc e eslint saem sem erros.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/api/types.ts src/features/alerts src/features/overview/ActiveAlertsPanel.tsx
git add src
git commit -m "fix: aceita eventos reais sem imagem, GPS, veículo ou motorista

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Viagens na página do motorista

**Files:**
- Modify: `src/api/types.ts`, `src/api/queries.ts`, `src/features/drivers/DriverDetailPage.tsx`
- Test: `src/features/drivers/drivers.test.tsx` (novo caso)

**Interfaces:**
- Consumes: `apiGet` e o handler `/api/trips` do mock (Task 1).
- Produces:
  - Tipos: `Trip = { id, deviceId, driverId: string | null, startedAt, lastEventAt, maxScore, alertCount }` e `TripDetail = Trip & { events: DrowsinessEvent[] }`.
  - `TripFilters = { driverId?, from?, to? }`, `queryKeys.trips(filters)`, `queryKeys.trip(id)`, `useTrips(filters)` (ativa só com `driverId`) e `useTrip(id)`.

- [ ] **Step 1: Escrever o teste que deve falhar**

Acrescente ao final de `src/features/drivers/drivers.test.tsx`, dentro do `describe("Drivers", ...)`:
```tsx
  it("mostra as viagens recentes do motorista", async () => {
    const driverId = listDrivers()[0]!.id;
    server.use(
      http.get("/api/trips", ({ request }) => {
        expect(new URL(request.url).searchParams.get("driverId")).toBe(driverId);
        return HttpResponse.json([
          {
            id: "ride-1",
            deviceId: "helio-edge-01",
            driverId,
            startedAt: "2026-10-02T10:00:00.000Z",
            lastEventAt: "2026-10-02T11:30:00.000Z",
            maxScore: 88,
            alertCount: 2,
          },
        ]);
      }),
    );

    render(
      <MemoryRouter initialEntries={[`/motoristas/${driverId}`]}>
        <Routes>
          <Route path="/motoristas/:driverId" element={<DriverDetailPage />} />
        </Routes>
      </MemoryRouter>,
      { wrapper: AppProviders },
    );

    expect(await screen.findByText("Viagens recentes")).toBeInTheDocument();
    expect(await screen.findByText("2 alertas")).toBeInTheDocument();
    expect(screen.getByText("pico 88")).toBeInTheDocument();
  });
```
e, no topo do arquivo, os imports:
```tsx
import { HttpResponse, http } from "msw";
import { server } from "@/api/mock/server";
import { listDrivers } from "@/api/mock/db";
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/features/drivers/drivers.test.tsx`
Expected: o novo caso falha com `Unable to find an element with the text: Viagens recentes`.

- [ ] **Step 3: Implementar**

Em `src/api/types.ts`, acrescente ao final:
```ts
export type Trip = {
  id: string;
  deviceId: string;
  driverId: string | null;
  startedAt: string;
  lastEventAt: string;
  maxScore: number;
  alertCount: number;
};

export type TripDetail = Trip & { events: DrowsinessEvent[] };
```

Em `src/api/queries.ts`:
1. Acrescente `Trip` e `TripDetail` ao import de tipos de `@/api/types`.
2. Logo após o tipo `EventFilters`, acrescente:
```ts
export type TripFilters = {
  driverId?: string;
  from?: string;
  to?: string;
};
```
3. Em `queryKeys`, logo após `event: ...`, acrescente:
```ts
  trips: (filters: TripFilters) => ["trips", filters] as const,
  trip: (id: string) => ["trips", "detail", id] as const,
```
4. Logo após a função `useEvent`, acrescente:
```ts
export function useTrips(filters: TripFilters) {
  const p = new URLSearchParams();
  if (filters.driverId) p.set("driverId", filters.driverId);
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  const qs = p.toString();
  return useQuery({
    queryKey: queryKeys.trips(filters),
    queryFn: () => apiGet<Trip[]>(`/api/trips${qs ? `?${qs}` : ""}`),
    enabled: Boolean(filters.driverId),
  });
}

export function useTrip(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.trip(id ?? ""),
    queryFn: () => apiGet<TripDetail>(`/api/trips/${id}`),
    enabled: Boolean(id),
  });
}
```

Em `src/features/drivers/DriverDetailPage.tsx`:
1. Acrescente `useTrips` ao import de `@/api/queries` e troque o import de format por
   `import { formatDateTime, formatDuration, formatPlate, formatRelative } from "@/lib/format";`
2. Logo após `const events = useEvents({ driverId, pageSize: 12 });`, acrescente
   `const trips = useTrips({ driverId });`
3. Logo **antes** do `<Card className="mt-4">` que contém "Alertas recentes", acrescente:
```tsx
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Viagens recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {trips.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : trips.data && trips.data.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {trips.data.map((trip) => (
                <li key={trip.id} className="flex items-center gap-3 py-2.5 text-xs">
                  <span className="flex items-center gap-1 font-data text-muted-foreground">
                    <Clock className="size-3" />
                    {formatDateTime(trip.startedAt)}
                  </span>
                  <span className="flex-1 text-muted-foreground">
                    {formatDuration(
                      (Date.parse(trip.lastEventAt) - Date.parse(trip.startedAt)) / 1000,
                    )}
                  </span>
                  <span>
                    {trip.alertCount} {trip.alertCount === 1 ? "alerta" : "alertas"}
                  </span>
                  <span className="font-data">pico {trip.maxScore}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma viagem nos últimos 7 dias.
            </p>
          )}
        </CardContent>
      </Card>

```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run && npx tsc -b && npx eslint .`
Expected: todos os testes passam, e tsc e eslint saem sem erros.

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/api src/features/drivers
git add src
git commit -m "feat: mostra as viagens recentes na página do motorista

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Proxy de desenvolvimento, script de deploy, README e publicação

**Files:**
- Modify: `vite.config.ts`, `README.md`
- Create: `scripts/deploy.sh`

**Interfaces:**
- Consumes: os outputs da stack `helio`: `SiteBucketName`, `DistributionId`, `UserPoolClientId` e `DashboardUrl`.
- Produces: `scripts/deploy.sh`, que usa as variáveis `STACK_NAME` (padrão `helio`) e `AWS_REGION` (padrão `us-east-1`).

- [ ] **Step 1: Proxy opcional no Vite**

Substitua `vite.config.ts` por:
```ts
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  // Em dev híbrido, /api/* que o MSW deixa passar vai para o CloudFront (mesma API da produção).
  const proxyTarget = loadEnv(mode, process.cwd(), "").VITE_API_PROXY_TARGET;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      chunkSizeWarningLimit: 900,
    },
    server: proxyTarget
      ? { proxy: { "/api": { target: proxyTarget, changeOrigin: true } } }
      : undefined,
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: true,
    },
  };
});
```

Run: `npx vitest run && npx tsc -b && npx eslint .`
Expected: tudo continua verde.

- [ ] **Step 2: Escrever `scripts/deploy.sh`**

```bash
#!/usr/bin/env bash
# Gera o build no modo híbrido (Cognito + API real) e publica no S3/CloudFront da stack do Helio.
set -euo pipefail
cd "$(dirname "$0")/.."

STACK="${STACK_NAME:-helio}"
REGION="${AWS_REGION:-us-east-1}"

output() {
  aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

BUCKET=$(output SiteBucketName)
DISTRIBUTION=$(output DistributionId)
CLIENT_ID=$(output UserPoolClientId)
URL=$(output DashboardUrl)

echo "==> Configuração do build (.env.production.local)"
cat > .env.production.local <<EOF
VITE_API_MODE=hybrid
VITE_COGNITO_REGION=$REGION
VITE_COGNITO_CLIENT_ID=$CLIENT_ID
EOF

echo "==> Build"
npm run build

echo "==> Enviando para s3://$BUCKET"
# Arquivos com hash no nome: cache longo. O resto (index.html, service worker): sem cache.
aws s3 sync dist/assets "s3://$BUCKET/assets" --delete \
  --cache-control "public,max-age=31536000,immutable" --only-show-errors
aws s3 sync dist "s3://$BUCKET" --exclude "assets/*" --delete \
  --cache-control "no-cache" --only-show-errors

echo "==> Invalidando o CloudFront"
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths "/*" \
  --query Invalidation.Id --output text >/dev/null

echo "Publicado em $URL"
```

Run: `chmod +x scripts/deploy.sh && bash -n scripts/deploy.sh && echo ok`
Expected: `ok`.

- [ ] **Step 3: README**

Acrescente ao final de `README.md`:
````markdown
## Modo híbrido (Cognito + API real) e deploy

O app tem dois modos, escolhidos por `VITE_API_MODE`:

| Modo | Login | Dados |
|---|---|---|
| `mock` (padrão) | qualquer e-mail/senha | tudo do MSW |
| `hybrid` | Cognito | motoristas, alertas, limiares e viagens da API real; veículos, dispositivos, MLOps e visão geral seguem no MSW |

A infraestrutura fica no repositório `helio-infra` (stack CloudFormation `helio`).

### Publicar
```bash
scripts/deploy.sh          # STACK_NAME e AWS_REGION opcionais
```
Gera `.env.production.local` a partir dos outputs da stack, faz o build, envia para o S3 e invalida o CloudFront.

### Desenvolver contra a API real
Crie `.env.development.local` (ignorado pelo git):
```
VITE_API_MODE=hybrid
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_CLIENT_ID=<UserPoolClientId da stack>
VITE_API_PROXY_TARGET=<DashboardUrl da stack>
```
Com `npm run dev`, as rotas reais passam pelo proxy do Vite até o CloudFront.

### Usuários
São criados pelo administrador no Cognito, nos grupos `Administrador`, `GestorDeFrota` ou `Operador`. No primeiro acesso, a tela pede uma nova senha.
````

- [ ] **Step 4: Commit**

```bash
npx prettier --write vite.config.ts README.md
git add vite.config.ts README.md scripts/deploy.sh
git commit -m "feat: adiciona script de deploy e proxy para desenvolvimento híbrido

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Publicar e verificar**

Run:
```bash
cd /Users/matt/Projects/Helio/dashboard
scripts/deploy.sh
URL=$(aws cloudformation describe-stacks --stack-name helio --query "Stacks[0].Outputs[?OutputKey=='DashboardUrl'].OutputValue" --output text)
CLIENT=$(aws cloudformation describe-stacks --stack-name helio --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text)
curl -s -o /dev/null -w "index %{http_code}\n" "$URL/entrar"
for js in $(aws s3 ls "s3://$(aws cloudformation describe-stacks --stack-name helio --query "Stacks[0].Outputs[?OutputKey=='SiteBucketName'].OutputValue" --output text)/assets/" | awk '/\.js$/{print $4}'); do curl -s "$URL/assets/$js"; done | grep -c "$CLIENT"
```
Expected:
- `Publicado em https://...cloudfront.net`.
- `index 200`.
- Um número ≥ 1, o que confirma que o build publicado embute o client id do Cognito.

Peça então ao usuário para testar no navegador:
1. Abrir `<DashboardUrl>/entrar`.
2. Entrar com o e-mail de administrador e a senha temporária recebida por e-mail.
3. Definir a nova senha.
4. Em **Motoristas**, ver Ana Souza e Bruno Lima.
5. Em **Alertas**, ver os alertas do smoke test e abrir um deles. O drawer deve mostrar "Sem imagem para este alerta".
6. Clicar em reconhecer o alerta.
7. Em **Configurações**, alterar um limiar.
