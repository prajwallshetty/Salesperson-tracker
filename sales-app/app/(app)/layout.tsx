"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Layout } from "@/components/Layout";

// Equivalent of the old <ProtectedRoute><Layout /></ProtectedRoute> wrapper around every
// route except /login. This layout stays mounted across client-side navigation between
// all routes in the (app) group (Home, Customers, Visits, ...), which is what lets the
// GPS watch started by Providers (mounted even higher, in app/layout.tsx) survive tab
// switches untouched.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  // zustand's persist middleware rehydrates from localStorage asynchronously after mount.
  // Without waiting for it, a hard refresh on a protected route would see user=null on the
  // very first render and redirect to /login even for an already-authenticated user.
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  const isAuthed = !!token && !!user && user.role === "SALESPERSON";

  // zustand's persist.hasHydrated() can briefly report `true` for one render before the
  // rehydrated `token`/`user` are actually merged into state on a fresh (hard) page load —
  // a real, reproducible race, not a hypothetical. Redirecting to /login on that transient
  // false reading would bounce an already-authenticated user through /login -> /home on every
  // direct navigation or refresh. Debounce the "not authenticated" verdict briefly and
  // re-check the live store state before committing to the redirect.
  useEffect(() => {
    if (!hydrated || isAuthed) return;
    const timer = setTimeout(() => {
      const state = useAuthStore.getState();
      const stillNotAuthed = !(state.token && state.user && state.user.role === "SALESPERSON");
      if (stillNotAuthed) router.replace("/login");
    }, 75);
    return () => clearTimeout(timer);
  }, [hydrated, isAuthed, router]);

  if (!hydrated || !isAuthed) {
    return null;
  }

  return <Layout>{children}</Layout>;
}
