"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Activity } from "lucide-react";
import { platformApi } from "@/lib/platformApi";
import { apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { Paginated, PlatformActivityItem } from "@/types";

const PAGE_SIZE = 30;

const ACTION_LABEL: Record<string, string> = {
  TENANT_CREATED: "New tenant",
  TENANT_SUSPENDED: "Tenant suspended",
  TENANT_ACTIVATED: "Tenant activated",
  PLAN_CREATED: "Plan created",
  PLAN_UPDATED: "Plan updated",
  PLAN_SELECTED: "Plan selected at checkout",
  CHECKOUT_SUBSCRIPTION_CREATED: "New subscription",
  PLAN_UPGRADED: "Plan upgraded",
  PLAN_DOWNGRADED: "Plan downgraded",
  SUBSCRIPTION_CANCELLED: "Subscription cancelled",
  USER_DISABLED: "User disabled",
  USER_ENABLED: "User enabled",
  IMPERSONATION_STARTED: "Owner impersonation started",
  IMPERSONATION_ENDED: "Owner impersonation ended",
  PLATFORM_SUBSCRIPTION_OVERRIDE: "Subscription manually overridden",
};

function actionLabel(action: string) {
  if (ACTION_LABEL[action]) return ACTION_LABEL[action];
  if (action.startsWith("WEBHOOK_")) return `Webhook: ${action.replace("WEBHOOK_", "").replace(/_/g, " ").toLowerCase()}`;
  return action;
}

const ACTOR_LABEL: Record<string, string> = { PLATFORM_ADMIN: "Owner", TENANT_ADMIN: "Tenant admin", SYSTEM: "System" };

export default function SuperAdminActivityPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<PlatformActivityItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    platformApi
      .get("/activity", { params: { page, pageSize: PAGE_SIZE } })
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(true);
        toast.error(apiErrorMessage(err, "Failed to load activity"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [page]);

  return (
    <div className="space-y-5">
      <PageHeader title="Platform Activity" description="Every recorded platform and billing event, across every tenant." />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Tenant</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
          ) : error ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="py-10">
                <EmptyState icon={<Activity className="size-5" />} title="Couldn't load activity" action={<Button variant="outline" size="sm" onClick={load}>Retry</Button>} />
              </TableCell>
            </TableRow>
          ) : !data || data.items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="py-10">
                <EmptyState title="No activity yet" message="Tenant, plan, and billing events will appear here as they happen." />
              </TableCell>
            </TableRow>
          ) : (
            data.items.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium text-foreground">{actionLabel(e.action)}</TableCell>
                <TableCell>
                  {e.tenantId ? (
                    <Link href={`/super-admin/tenants/${e.tenantId}`} className="text-foreground hover:underline">
                      {e.tenantName ?? e.tenantId}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Platform-wide</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="muted">{ACTOR_LABEL[e.actorType] ?? e.actorType}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(e.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}
    </div>
  );
}
