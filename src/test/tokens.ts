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
  /** `null` simula a resposta de renovação, que não traz refresh token. */
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
