import { isRouteErrorResponse, useRouteError, Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function RouteError() {
  const error = useRouteError();

  let title = "Algo deu errado";
  let detail = "Ocorreu um erro inesperado ao carregar esta tela.";

  if (isRouteErrorResponse(error)) {
    title = `Erro ${error.status}`;
    detail = error.statusText || detail;
  } else if (error instanceof Error) {
    detail = error.message;
  }

  return (
    <div className="grid min-h-svh place-items-center bg-background p-6 text-center">
      <div className="max-w-md">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        <Button asChild className="mt-5" variant="outline">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
