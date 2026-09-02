"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { AlertTriangleIcon, CheckIcon, TargetIcon } from "@/components/icons";
import type { FollowUp } from "@/types";
import { format, isPast } from "date-fns";
import clsx from "clsx";

type Tab = "PENDING" | "OVERDUE" | "COMPLETED";

export default function FollowUpsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("PENDING");
  const [items, setItems] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  function load(status: Tab) {
    setLoading(true);
    api
      .get<FollowUp[]>("/followups", { params: { status } })
      .then((res) => setItems(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Could not load follow-ups")))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(tab), [tab]);

  async function markComplete(id: string) {
    setCompletingId(id);
    try {
      await api.patch(`/followups/${id}/complete`);
      toast.success("Follow-up marked complete");
      setItems((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not update follow-up"));
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Leads & Follow-ups" />
      <div className="px-4 pt-4">
        <div className="mb-4">
          <SegmentedControl
            value="followups"
            onChange={(v) => v === "leads" && router.push("/leads")}
            options={[
              { value: "leads", label: "Leads" },
              { value: "followups", label: "Follow-ups" },
            ]}
          />
        </div>

        <div className="mb-4">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: "PENDING", label: "Pending" },
              { value: "OVERDUE", label: "Overdue" },
              { value: "COMPLETED", label: "Completed" },
            ]}
          />
        </div>

        {loading ? (
          <SkeletonList count={4} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<TargetIcon className="h-10 w-10 text-slate-300" />}
            title={`No ${tab.toLowerCase()} follow-ups`}
            message="You're all caught up here."
          />
        ) : (
          <ul className="space-y-3">
            {items.map((f) => {
              const overdue = f.status === "PENDING" && isPast(new Date(f.dueDate));
              return (
                <li
                  key={f.id}
                  className={clsx(
                    "rounded-2xl border bg-white p-4",
                    overdue ? "border-red-300 bg-red-50/40" : "border-slate-200"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{f.customer?.name || f.lead?.name || "Follow-up"}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-500">
                        {overdue && <AlertTriangleIcon className="h-3.5 w-3.5 text-red-500" />}
                        <span className={overdue ? "text-red-600" : ""}>
                          Due {format(new Date(f.dueDate), "d MMM yyyy")}
                        </span>
                      </p>
                    </div>
                    {f.status === "COMPLETED" && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                        <CheckIcon className="h-3 w-3" /> Done
                      </span>
                    )}
                  </div>
                  {f.notes && <p className="mt-2 text-xs text-slate-500">{f.notes}</p>}
                  {f.status !== "COMPLETED" && (
                    <button
                      onClick={() => markComplete(f.id)}
                      disabled={completingId === f.id}
                      className="mt-3 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {completingId === f.id ? "Updating…" : "Mark Complete"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
