"use client";

import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "@/store/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      {children}
    </>
  );
}
