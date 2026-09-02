"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

// Equivalent of the old router's catch-all `<Navigate to={isAuthed ? "/home" : "/login"} replace />`.
export default function RootPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const isAuthed = !!token && !!user && user.role === "SALESPERSON";
    router.replace(isAuthed ? "/home" : "/login");
  }, [hydrated, token, user, router]);

  return null;
}
