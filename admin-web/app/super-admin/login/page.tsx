"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { usePlatformAuthStore } from "@/store/platformAuth";
import { apiErrorMessage } from "@/lib/api";

export default function SuperAdminLoginPage() {
  const login = usePlatformAuthStore((s) => s.login);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome back.");
      router.replace("/super-admin/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid email or password"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <img src="/logo.png" alt="SalesGrid" className="h-16 sm:h-20 w-auto object-contain filter drop-shadow-md" />
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-1 text-lg font-semibold text-slate-800">Sign in</h2>
          <p className="mb-6 text-sm text-slate-400">Platform-level access only. Not for tenant accounts.</p>

          <form onSubmit={onSubmit}>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Email address</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                placeholder="you@salesgrid.internal"
              />
            </label>
            <label className="mb-2 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                placeholder="••••••••"
              />
            </label>

            {error && <div className="mb-4 mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</div>}

            <button
              type="submit"
              disabled={busy}
              className="mt-5 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
