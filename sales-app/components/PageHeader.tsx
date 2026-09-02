"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "./icons";

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
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-4 py-3.5 backdrop-blur">
      {back && (
        <button
          onClick={() => router.back()}
          className="-ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 active:bg-slate-100"
          aria-label="Back"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
