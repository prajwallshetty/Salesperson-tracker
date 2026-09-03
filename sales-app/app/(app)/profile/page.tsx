"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { Badge } from "@/components/ui/badge";
import { initials, formatKm } from "@/lib/format";
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
        <div className="flex flex-col items-center rounded-2xl border border-border/60 bg-card p-6 text-center shadow-card">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-2xl font-extrabold text-primary">
            {user ? initials(user.name) : "?"}
          </span>
          <p className="mt-3 text-lg font-extrabold tracking-tight text-foreground">{user?.name}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          {sp && (
            <Badge variant={sp.fieldWorkStatus === "ACTIVE" ? "success" : "muted"} className="mt-3">
              {sp.fieldWorkStatus === "ACTIVE" ? "Field Work Active" : "Not in the field"}
            </Badge>
          )}
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : sp ? (
          <div className="space-y-0.5 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <Row label="Employee Code" value={sp.employeeCode} />
            <Row label="Phone" value={sp.phone || "—"} />
            <Row label="Territory" value={sp.territory?.name || "Unassigned"} />
            <Row label="Today's Distance" value={formatKm(sp.todayDistanceKm)} />
            <Row label="Last Seen" value={sp.lastSeenAt ? format(new Date(sp.lastSeenAt), "d MMM, h:mm a") : "—"} />
            <Row label="Customers Assigned" value={String(sp._count?.customers ?? 0)} />
            <Row label="Total Visits" value={String(sp._count?.visits ?? 0)} />
            <Row label="Total Orders" value={String(sp._count?.orders ?? 0)} last />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${last ? "" : "border-b border-border/60"}`}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}
