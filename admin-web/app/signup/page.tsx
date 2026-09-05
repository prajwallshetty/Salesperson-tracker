"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { apiErrorMessage } from "@/lib/api";

export default function SignupPage() {
  const signup = useAuthStore((s) => s.signup);
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signup(companyName, name, email, password);
      toast.success("Workspace created!");
      router.replace("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not create your workspace"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <img src="/logo.png" alt="SalesGrid" className="h-16 sm:h-20 w-auto object-contain filter drop-shadow-md" />
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-1 text-lg font-semibold text-slate-800">Get started</h2>
          <p className="mb-6 text-sm text-slate-400">This creates a new, private workspace just for your company.</p>

          <form onSubmit={onSubmit}>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Company name</span>
              <input
                type="text"
                required
                autoFocus
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                placeholder="Prestige Distributors"
              />
            </label>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Your name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                placeholder="Jane Doe"
              />
            </label>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Work email</span>
              <input
                type="email"
                required
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                placeholder="At least 6 characters"
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
              {busy ? "Creating workspace..." : "Create Workspace"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Already have a workspace?{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
