import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";

// Root-level 404 for any URL that doesn't match a route (e.g. a stale bookmark or a typo'd
// deep link). Route-specific "not found" cases inside the app shell keep using their existing
// inline empty-state handling so this doesn't change any per-page error/data-loading logic.
export default function RootNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <MapPinOff className="h-7 w-7" />
      </span>
      <p className="text-base font-bold text-foreground">Page not found</p>
      <p className="max-w-xs text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Button asChild className="mt-2">
        <Link href="/home">Go to Home</Link>
      </Button>
    </div>
  );
}
