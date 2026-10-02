import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";

import "@/styles/globals.css";
import { router } from "@/router";
import { queryClient } from "@/api/query-client";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/features/auth/auth-context";
import { Toaster } from "@/components/ui/sonner";

async function enableMocking() {
  const { worker } = await import("@/api/mock/browser");
  return worker.start({
    onUnhandledRequest: "bypass",
    serviceWorker: { url: "/mockServiceWorker.js" },
  });
}

enableMocking().then(async () => {
  const { startLiveSimulation } = await import("@/api/mock/live");
  startLiveSimulation(queryClient);

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Toaster />
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>,
  );
});
