"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/Skeleton";
import { IconLogout } from "@/components/icons";
import type { AuthUser } from "@/types";

export default function SettingsPage() {
  const router = useRouter();
  const storedUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [me, setMe] = useState<AuthUser | null>(storedUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setMe(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load profile")))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-400">Your account details.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        {loading && !me ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ) : me ? (
          <>
            <div className="flex items-center gap-4">
              <Avatar name={me.name} src={me.avatarUrl} size="lg" />
              <div>
                <p className="text-lg font-semibold text-slate-800">{me.name}</p>
                <p className="text-sm text-slate-400">{me.email}</p>
              </div>
            </div>
            <div className="mt-5 space-y-0.5">
              <InfoRow label="Role" value={me.role} />
              <InfoRow label="Email" value={me.email} />
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">Unable to load your profile.</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="mb-1 text-sm font-semibold text-slate-700">Session</p>
        <p className="mb-4 text-sm text-slate-400">Sign out of the admin dashboard on this device.</p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          <IconLogout className="h-4 w-4" /> Log out
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-2.5 last:border-b-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}
