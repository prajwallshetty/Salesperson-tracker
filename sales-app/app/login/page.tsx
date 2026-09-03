"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slideUp } from "@/lib/animations";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const sessionStatus = useAuthStore((s) => s.sessionStatus);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Cookie-based auth: Providers resolves sessionStatus via GET /api/auth/me on load. Wait for
  // a real "authenticated" (not the initial "checking") before redirecting away from /login —
  // see store/auth.ts and app/(app)/layout.tsx for why this can't gate on a cached boolean.
  const isAuthed = sessionStatus === "authenticated" && !!user && user.role === "SALESPERSON";
  useEffect(() => {
    if (isAuthed) router.replace("/home");
  }, [isAuthed, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success("Welcome back!");
      router.replace("/home");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast.error(message);
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
          <h1 className="text-2xl font-extrabold tracking-tight text-white">SalesForce Pro</h1>
          <p className="mt-1 text-sm text-white/70">Field App for Salespeople</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-white/10 bg-card p-6 shadow-2xl"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@salesforcepro.com"
                className="h-[3.25rem] py-3.5 pl-10 text-base"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-[3.25rem] py-3.5 pl-10 pr-11 text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition active:bg-muted"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" size="lg" loading={submitting} className="mt-2 h-14 w-full text-base shadow-lg shadow-primary/30">
            {submitting ? "Signing in…" : "Sign In"}
          </Button>

          <p className="pt-1 text-center text-[11px] text-muted-foreground">
            This app is for field salespeople only.
          </p>
        </form>
      </motion.div>
    </div>
  );
}
