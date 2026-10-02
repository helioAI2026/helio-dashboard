import { setupWorker } from "msw/browser";

import { env } from "@/config/env";
import { mockHandlersFor } from "./mode";

export const worker = setupWorker(...mockHandlersFor(env.apiMode));
