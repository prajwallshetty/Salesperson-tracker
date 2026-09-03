"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/60 bg-card/95 px-4 py-3.5 backdrop-blur-md">
      {back && (
        <button
          onClick={() => router.back()}
          className="-ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors active:bg-muted"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
