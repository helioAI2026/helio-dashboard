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
  PasswordResetRequiredException:
    "É preciso redefinir a senha. Fale com o administrador.",
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
    throw new CognitoError(
      code,
      MESSAGES[code] ?? "Não foi possível entrar. Tente novamente.",
    );
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

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<SignInResult> {
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
    groups: Array.isArray(raw["cognito:groups"])
      ? (raw["cognito:groups"] as string[])
      : [],
    exp: Number(raw.exp),
  };
}
