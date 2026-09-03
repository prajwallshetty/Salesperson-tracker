"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

// Top-level safety net for errors outside the (dashboard) route group
// (e.g. on /login) or thrown before that layout mounts.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="size-7" />
      </span>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">An unexpected error occurred. Please try again.</p>
      </div>
      <button
        onClick={() => reset()}
        className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
      >
        Try again
      </button>
    </div>
  );
}
