import Link from "next/link";
import { Compass } from "lucide-react";

// Top-level 404 for unmatched URLs. Deliberately outside the (dashboard)
// chrome — an unknown route shouldn't assume the sidebar/topbar are relevant
// (e.g. a stale bookmark from before a route was renamed).
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Compass className="size-7" />
      </span>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
