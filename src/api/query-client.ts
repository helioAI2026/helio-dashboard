import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "./client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Ocorreu um erro inesperado";
      toast.error(message);
    },
  }),
});
