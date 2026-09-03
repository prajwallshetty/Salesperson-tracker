"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { MapPinned } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import type { Visit, VisitStatus } from "@/types";

type Tab = "IN_PROGRESS" | "PLANNED" | "COMPLETED";

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "PLANNED", label: "Planned" },
  { value: "COMPLETED", label: "Completed" },
];

const STATUS_VARIANT: Record<VisitStatus, "success" | "warning" | "muted" | "danger"> = {
  COMPLETED: "success",
  IN_PROGRESS: "warning",
  PLANNED: "muted",
  MISSED: "danger",
  CANCELLED: "muted",
};

const EMPTY_COPY: Record<Tab, { title: string; message: string }> = {
  IN_PROGRESS: { title: "No visit in progress", message: "Check in at a customer to start one." },
  PLANNED: { title: "No planned visits", message: "Start a visit from a customer's profile to add one here." },
  COMPLETED: { title: "No completed visits yet", message: "Visits you finish will show up here." },
};

export default function VisitsPage() {
  const [tab, setTab] = useState<Tab>("IN_PROGRESS");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<Visit[]>("/visits", { params: { status: tab } })
      .then((res) => setVisits(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Could not load visits")))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div>
      <PageHeader title="Visits" />
      <div className="px-4 pt-4">
        <div className="mb-4">
          <SegmentedControl value={tab} onChange={setTab} options={TAB_OPTIONS} />
        </div>

        {loading ? (
          <SkeletonList count={4} />
        ) : visits.length === 0 ? (
          <EmptyState icon={<MapPinned />} title={EMPTY_COPY[tab].title} message={EMPTY_COPY[tab].message} />
        ) : (
          <ul className="space-y-3">
            {visits.map((v) => {
              const timeLabel =
                v.status === "COMPLETED" && v.checkOutAt
                  ? `Checked out ${format(new Date(v.checkOutAt), "d MMM, h:mm a")}`
                  : v.checkInAt
                    ? `Checked in ${format(new Date(v.checkInAt), "d MMM, h:mm a")}`
                    : v.plannedAt
                      ? `Planned for ${format(new Date(v.plannedAt), "d MMM, h:mm a")}`
                      : `Added ${format(new Date(v.createdAt), "d MMM yyyy")}`;
              return (
                <li key={v.id}>
                  <Link
                    href={`/visits/${v.id}`}
                    className="block rounded-2xl border border-border/60 bg-card p-4 shadow-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-foreground">{v.customer?.name ?? "Customer"}</p>
                        {v.customer?.address && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{v.customer.address}</p>
                        )}
                      </div>
                      <Badge variant={STATUS_VARIANT[v.status]} className="shrink-0">
                        {v.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-2.5 text-xs font-medium text-muted-foreground">{timeLabel}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
