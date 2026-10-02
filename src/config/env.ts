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
