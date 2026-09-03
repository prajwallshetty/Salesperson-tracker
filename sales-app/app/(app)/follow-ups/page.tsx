"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import { AlertTriangle, Check, Target } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FollowUp } from "@/types";
import { cn } from "@/lib/utils";

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
    // Optimistic UI: a follow-up completion is a non-financial status flag, not an
    // order/quotation/collection/visit state — safe to reflect immediately and roll back
    // on failure rather than making the salesperson wait on a round-trip for this list to
    // update.
    const previous = items;
    setItems((prev) => prev.filter((f) => f.id !== id));
    try {
      await api.patch(`/followups/${id}/complete`);
      toast.success("Follow-up marked complete");
    } catch (err) {
      setItems(previous);
      toast.error(apiErrorMessage(err, "Could not update follow-up"));
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Leads & Follow-ups" />
      <div className="px-4 pt-4">
        <div className="mb-3">
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
          <EmptyState icon={<Target />} title={`No ${tab.toLowerCase()} follow-ups`} message="You're all caught up here." />
        ) : (
          <ul className="space-y-3">
            {items.map((f) => {
              const overdue = f.status === "PENDING" && isPast(new Date(f.dueDate));
              return (
                <li
                  key={f.id}
                  className={cn(
                    "rounded-2xl border p-4 shadow-card",
                    overdue ? "border-danger/40 bg-danger-soft" : "border-border/60 bg-card"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">{f.customer?.name || f.lead?.name || "Follow-up"}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold">
                        {overdue && <AlertTriangle className="h-3.5 w-3.5 text-danger" />}
                        <span className={overdue ? "text-danger" : "text-muted-foreground"}>
                          Due {format(new Date(f.dueDate), "d MMM yyyy")}
                        </span>
                      </p>
                    </div>
                    {f.status === "COMPLETED" && (
                      <Badge variant="success" className="shrink-0">
                        <Check className="h-3 w-3" /> Done
                      </Badge>
                    )}
                  </div>
                  {f.notes && <p className="mt-2 text-xs text-muted-foreground">{f.notes}</p>}
                  {f.status !== "COMPLETED" && (
                    <Button
                      onClick={() => markComplete(f.id)}
                      loading={completingId === f.id}
                      size="lg"
                      variant={overdue ? "destructive" : "secondary"}
                      className={cn("mt-3 h-11 w-full text-sm", !overdue && "bg-foreground text-background hover:bg-foreground/90")}
                    >
                      {completingId === f.id ? "Updating…" : "Mark Complete"}
                    </Button>
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
