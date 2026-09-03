"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Layout } from "@/components/Layout";

// Equivalent of the old <ProtectedRoute><Layout /></ProtectedRoute> wrapper around every
// route except /login. This layout stays mounted across client-side navigation between
// all routes in the (app) group (Home, Customers, Visits, ...), which is what lets the
// GPS watch started by Providers (mounted even higher, in app/layout.tsx) survive tab
// switches untouched.
//
// Auth is cookie-based (httpOnly sf_token — see API_CONTRACT.md), so there is no locally-cached
// token to gate on. `sessionStatus` starts at "checking" on every load and Providers resolves it
// via `GET /api/auth/me` (cookie sent automatically). We must wait for that real answer instead
// of redirecting on a cached boolean — redirecting while "checking" would bounce an
// already-authenticated user through /login on every hard refresh.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const sessionStatus = useAuthStore((s) => s.sessionStatus);

  const isAuthed = sessionStatus === "authenticated" && !!user && user.role === "SALESPERSON";

  useEffect(() => {
    if (sessionStatus === "checking" || isAuthed) return;
    router.replace("/login");
  }, [sessionStatus, isAuthed, router]);

  if (sessionStatus === "checking" || !isAuthed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return <Layout>{children}</Layout>;
}
