"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Route-segment error boundary for everything inside the (app) tab group. The parent
// (app)/layout.tsx — which owns the persistent GPS watch started in Providers — is above
// this boundary and keeps rendering (TrackingBanner/BottomNav stay mounted, tracking is
// unaffected) even if a single page throws while rendering.
export default function AppSectionError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <p className="text-base font-bold text-foreground">Something went wrong</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        This screen hit an unexpected error. Your location tracking is unaffected — try again below.
      </p>
      <Button onClick={reset} className="mt-2">
        Try again
      </Button>
    </div>
  );
}
