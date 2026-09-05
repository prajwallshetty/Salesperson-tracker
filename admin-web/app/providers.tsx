"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { useAuthStore } from "@/store/auth";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  const checkSession = useAuthStore((s) => s.checkSession);

  useEffect(() => {
    // Never on /super-admin/* - that section uses a completely separate platform-admin auth
    // system (see store/platformAuth.ts) with its own cookie, and a 401 from this tenant check
    // has nothing to do with whether a platform admin is signed in.
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/super-admin")) return;
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
