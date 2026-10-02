import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Activity } from "lucide-react";

import { useAuth } from "./auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LocationState = { from?: { pathname: string } };

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? "/";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Informe e-mail e senha para continuar.");
      return;
    }
    signIn(email.trim());
    navigate(redirectTo, { replace: true });
  }

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

        <h1 className="text-lg font-semibold">Entrar no painel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ambiente de demonstração — qualquer e-mail e senha são aceitos.
        </p>

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

          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
