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
