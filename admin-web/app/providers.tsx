"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { useAuthStore } from "@/store/auth";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  const checkSession = useAuthStore((s) => s.checkSession);

  useEffect(() => {
    // The only reliable "am I logged in" signal now that auth is an httpOnly cookie -
    // see store/auth.ts. Runs once per app load; the dashboard layout blocks on
    // `status` until this resolves.
    checkSession();
  }, [checkSession]);

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
