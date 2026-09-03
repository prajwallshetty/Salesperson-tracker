"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { initials, formatKm } from "@/lib/format";
import { format } from "date-fns";
import type { Salesperson } from "@/types";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [sp, setSp] = useState<Salesperson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.salespersonId) return;
    api
      .get<Salesperson>(`/salespersons/${user.salespersonId}`)
      .then((res) => setSp(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Could not load profile")))
      .finally(() => setLoading(false));
  }, [user?.salespersonId]);

  return (
    <div>
      <PageHeader title="My Profile" back />
      <div className="space-y-4 px-4 pt-4 pb-8">
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-extrabold text-brand-700">
            {user ? initials(user.name) : "?"}
          </span>
          <p className="mt-3 text-lg font-extrabold text-slate-900">{user?.name}</p>
          <p className="text-sm text-slate-500">{user?.email}</p>
        </div>

        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : sp ? (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
            <Row label="Employee Code" value={sp.employeeCode} />
            <Row label="Phone" value={sp.phone || "—"} />
            <Row label="Territory" value={sp.territory?.name || "Unassigned"} />
            <Row label="Field Work Status" value={sp.fieldWorkStatus} />
            <Row label="Today's Distance" value={formatKm(sp.todayDistanceKm)} />
            <Row label="Last Seen" value={sp.lastSeenAt ? format(new Date(sp.lastSeenAt), "d MMM, h:mm a") : "—"} />
            <Row label="Customers Assigned" value={String(sp._count?.customers ?? 0)} />
            <Row label="Total Visits" value={String(sp._count?.visits ?? 0)} />
            <Row label="Total Orders" value={String(sp._count?.orders ?? 0)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="text-sm font-bold text-slate-800">{value}</span>
    </div>
  );
}
