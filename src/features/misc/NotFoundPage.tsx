import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="grid min-h-svh place-items-center bg-background p-6 text-center">
      <div>
        <p className="font-data text-5xl font-semibold text-muted-foreground">404</p>
        <h1 className="mt-3 text-lg font-semibold">Página não encontrada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O endereço acessado não existe ou foi movido.
        </p>
        <Button asChild className="mt-5">
          <Link to="/">Voltar para a visão geral</Link>
        </Button>
      </div>
    </div>
  );
}
