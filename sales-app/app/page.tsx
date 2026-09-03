"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

// Equivalent of the old router's catch-all `<Navigate to={isAuthed ? "/home" : "/login"} replace />`.
// Cookie-based auth: wait for Providers' GET /api/auth/me check to resolve sessionStatus out of
// "checking" before deciding where to send the user — see store/auth.ts.
export default function RootPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const sessionStatus = useAuthStore((s) => s.sessionStatus);

  useEffect(() => {
    if (sessionStatus === "checking") return;
    const isAuthed = sessionStatus === "authenticated" && !!user && user.role === "SALESPERSON";
    router.replace(isAuthed ? "/home" : "/login");
  }, [sessionStatus, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
    </div>
  );
}
