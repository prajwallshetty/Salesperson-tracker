"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Scoped to the (dashboard) layout, so a page-render error here still keeps
// the sidebar/topbar chrome intact — only the page content area is replaced.
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-2xl border border-border/60 bg-card px-6 py-16 text-center shadow-card">
      <span className="flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="size-6" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Something went wrong</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          This page hit an unexpected error. You can try again, or head back once it&apos;s sorted.
        </p>
      </div>
      <Button onClick={() => reset()}>
        <RotateCw className="size-4" /> Try again
      </Button>
    </div>
  );
}
