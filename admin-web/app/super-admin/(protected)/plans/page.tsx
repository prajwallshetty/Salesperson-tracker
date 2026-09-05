"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Tags } from "lucide-react";
import { platformApi } from "@/lib/platformApi";
import { apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlanFormDialog } from "@/components/superadmin/PlanFormDialog";
import { formatCurrency } from "@/lib/format";
import type { PlatformPlan } from "@/types";

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<PlatformPlan[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformPlan | null>(null);

  const load = () => {
    setLoading(true);
    platformApi
      .get("/plans")
      .then((res) => setPlans(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load plans")))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Plans"
        description="The plan catalog - one source of truth used by the landing page, signup, and every enforcement check."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> Create plan
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : !plans || plans.length === 0 ? (
        <EmptyState icon={<Tags className="size-5" />} title="No plans yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Monthly</TableHead>
              <TableHead>Yearly</TableHead>
              <TableHead>Max salespeople</TableHead>
              <TableHead>Trial days</TableHead>
              <TableHead>Razorpay plans</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.monthlyPrice === 0 ? "Contact Sales" : formatCurrency(p.monthlyPrice)}</TableCell>
                <TableCell className="text-muted-foreground">{p.annualPrice != null ? formatCurrency(p.annualPrice) : "-"}</TableCell>
                <TableCell className="text-muted-foreground">{p.maxSalespersons.toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-muted-foreground">{p.trialDays}</TableCell>
                <TableCell>
                  <Badge variant={p.razorpayMonthlyPlanId ? "success" : "muted"}>{p.razorpayMonthlyPlanId ? "Configured" : "Not configured"}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={p.isActive ? "success" : "muted"} dot>
                    {p.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setEditing(p);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PlanFormDialog open={formOpen} plan={editing} onClose={() => setFormOpen(false)} onSaved={load} />
    </div>
  );
}
