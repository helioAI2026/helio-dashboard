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
