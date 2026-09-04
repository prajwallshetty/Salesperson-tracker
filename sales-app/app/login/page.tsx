"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { slideUp } from "@/lib/animations";

export default function LoginPage() {
  const router = useRouter();
  const loginWithAccessCode = useAuthStore((s) => s.loginWithAccessCode);
  const user = useAuthStore((s) => s.user);
  const sessionStatus = useAuthStore((s) => s.sessionStatus);
  const [accessCode, setAccessCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cookie-based auth: Providers resolves sessionStatus via GET /api/auth/me on load. Wait for
  // a real "authenticated" (not the initial "checking") before redirecting away from /login —
  // see store/auth.ts and app/(app)/layout.tsx for why this can't gate on a cached boolean.
  const isAuthed = sessionStatus === "authenticated" && !!user && user.role === "SALESPERSON";
  useEffect(() => {
    if (isAuthed) router.replace("/home");
  }, [isAuthed, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const code = accessCode.trim();
    if (!code) {
      toast.error("Enter your access code");
      return;
    }
    setSubmitting(true);
    try {
      await loginWithAccessCode(code);
      toast.success("Welcome back!");
      router.replace("/home");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid access code";
      toast.error(message);
      inputRef.current?.select();
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionStatus === "checking" || isAuthed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-gradient-to-b from-primary via-primary to-[hsl(262_65%_32%)] px-6 py-10">
      {/* Soft decorative glow, purely presentational */}
      <div className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="show"
        className="relative mx-auto w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black tracking-tight text-white shadow-lg backdrop-blur">
            SF
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-white/70">Enter your access code to continue</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-white/10 bg-card p-6 shadow-2xl"
        >
          <div className="space-y-1.5">
            <label htmlFor="accessCode" className="text-sm font-medium text-foreground">
              Access code
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="accessCode"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="SG-XXXXXX"
                className="h-[3.25rem] w-full rounded-xl border border-input bg-background py-3.5 pl-10 pr-3 text-center text-lg font-semibold tracking-[0.15em] placeholder:tracking-normal placeholder:font-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <Button type="submit" size="lg" loading={submitting} className="mt-2 h-14 w-full text-base shadow-lg shadow-primary/30">
            {submitting ? "Signing in…" : "Continue"}
          </Button>

          <p className="pt-1 text-center text-[11px] text-muted-foreground">
            Don&apos;t have a code? Ask your admin to generate one for you.
          </p>
        </form>
      </motion.div>
    </div>
  );
}
