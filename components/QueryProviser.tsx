"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserProvider } from "@/context/UserContext";
import { ReactNode, useState } from "react";

export default function QueryProvider({ children }: { children: ReactNode }) {
  // Pour éviter que QueryClient soit recréé à chaque rendu :
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 0, // 3 tentatives maximum par défaut (0 pour désactiver)
            refetchOnWindowFocus: false, // désactiver le refetch au focus, valeur par défaut true
            // refetchOnMount: false, // désactiver le refetch au montage, valeur par défaut true
            staleTime: 1 * 60 * 1000, // 1 minutes // durée avant de considérer les données comme "stale", valeur par défaut 0
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <>{children}</>
      </UserProvider>
    </QueryClientProvider>
  );
}
