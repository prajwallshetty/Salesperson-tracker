"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { apiErrorMessage } from "@/lib/api";

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const router = useRouter();
  const [email, setEmail] = useState("admin@salesforcepro.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      router.replace("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid email or password"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-white">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold backdrop-blur">
            SF
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">SalesForce Pro</h1>
          <p className="mt-1 text-sm text-white/70">Admin Dashboard</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-1 text-lg font-semibold text-slate-800">Sign in</h2>
          <p className="mb-6 text-sm text-slate-400">Enter your admin credentials to continue.</p>

          <form onSubmit={onSubmit}>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Email address</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                placeholder="you@company.com"
              />
            </label>
            <label className="mb-2 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                placeholder="••••••••"
              />
            </label>

            {error && (
              <div className="mb-4 mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-5 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Demo admin: admin@salesforcepro.com / Admin@123
          </p>
        </div>
      </div>
    </div>
  );
}
