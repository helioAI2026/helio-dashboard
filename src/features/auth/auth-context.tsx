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
  const [challenge, setChallenge] = useState<{ email: string; session: string } | null>(
    null,
  );

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
