import { HttpResponse, http } from "msw";

import { server } from "@/api/mock/server";
import { cognitoEndpoint } from "@/features/auth/cognito";

export type CognitoCall = { target: string; body: Record<string, unknown> };

/** Intercepta o endpoint do Cognito; `respond` recebe a operação (ex.: "InitiateAuth") e o corpo. */
export function mockCognito(
  respond: (
    target: string,
    body: Record<string, unknown>,
  ) => Response | Promise<Response>,
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
