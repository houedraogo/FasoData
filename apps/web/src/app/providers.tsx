"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState } from "react";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import { LanguageProvider } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AnalyticsTracker />
        {children}
      </LanguageProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "12px",
            fontFamily: "Plus Jakarta Sans, sans-serif",
            fontSize: "14px",
          },
        }}
      />
    </QueryClientProvider>
  );
}
