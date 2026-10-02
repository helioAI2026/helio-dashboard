import { HttpHandler, type RequestHandler } from "msw";

import type { ApiMode } from "@/config/env";
import { handlers } from "./handlers";

/** Rotas atendidas pela API real no modo híbrido; o restante continua no mock. */
export const REAL_API_PREFIXES = [
  "/api/drivers",
  "/api/events",
  "/api/settings",
  "/api/trips",
] as const;

export function mockHandlersFor(
  mode: ApiMode,
  all: RequestHandler[] = handlers,
): RequestHandler[] {
  if (mode === "mock") return all;
  return all.filter(
    (h) =>
      !(
        h instanceof HttpHandler &&
        REAL_API_PREFIXES.some((prefix) => String(h.info.path).startsWith(prefix))
      ),
  );
}
