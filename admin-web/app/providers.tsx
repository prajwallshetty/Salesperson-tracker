"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { useAuthStore } from "@/store/auth";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <TooltipProvider delayDuration={150}>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 3500,
          classNames: {
            toast: "rounded-2xl border border-border/60 shadow-popover font-sans",
            title: "font-semibold",
          },
        }}
      />
      {children}
    </TooltipProvider>
  );
}
