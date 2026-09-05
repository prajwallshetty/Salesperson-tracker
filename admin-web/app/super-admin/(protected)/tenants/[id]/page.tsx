"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Building2, Ban, CheckCircle2 } from "lucide-react";
import { platformApi } from "@/lib/platformApi";
import { apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import type { PlatformTenantDetail, PlatformBillingAuditLogItem, Paginated } from "@/types";

export default function SuperAdminTenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tenant, setTenant] = useState<PlatformTenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditLog, setAuditLog] = useState<Paginated<PlatformBillingAuditLogItem> | null>(null);
  const [auditLoading, setAuditLoading] = useState(true);
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const load = () => {
    setLoading(true);
    platformApi
      .get(`/tenants/${id}`)
      .then((res) => setTenant(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load tenant")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  useEffect(() => {
    setAuditLoading(true);
    platformApi
      .get(`/tenants/${id}/billing-audit-log`, { params: { pageSize: 30 } })
      .then((res) => setAuditLog(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load billing activity")))
      .finally(() => setAuditLoading(false));
  }, [id]);

  const toggleStatus = async () => {
    if (!tenant) return;
    try {
      const next = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      await platformApi.patch(`/tenants/${tenant.id}/status`, { status: next });
      toast.success(next === "SUSPENDED" ? "Tenant suspended." : "Tenant activated.");
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update tenant status"));
    }
  };

  if (loading || !tenant) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const sub = tenant.subscription;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => router.push("/super-admin/tenants")}>
        <ArrowLeft className="size-4" /> Back to tenants
      </Button>

      <PageHeader
        title={tenant.name}
        description={tenant.slug}
        actions={
          <Button variant={tenant.status === "ACTIVE" ? "destructive" : "success"} size="sm" onClick={() => setConfirmSuspend(true)}>
            {tenant.status === "ACTIVE" ? (
              <>
                <Ban className="size-4" /> Suspend
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" /> Activate
              </>
            )}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant={tenant.status === "ACTIVE" ? "success" : "danger"} className="mt-1.5" dot>
              {tenant.status}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Users</p>
            <p className="mt-1 text-lg font-bold text-foreground">{tenant.userCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Salespeople</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {tenant.salespersonCount}
              {sub && <span className="text-sm font-normal text-muted-foreground"> / {sub.plan.maxSalespersons}</span>}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Customers</p>
            <p className="mt-1 text-lg font-bold text-foreground">{tenant.customerCount}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subscription">
        <TabsList>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="activity">Billing Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="mt-4">
          {!sub ? (
            <EmptyState icon={<Building2 className="size-5" />} title="No subscription" message="This tenant has no subscription row." />
          ) : (
            <Card>
              <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Plan" value={sub.plan.name} />
                <Field label="Status" value={sub.status} />
                <Field label="Billing interval" value={sub.billingInterval === "YEARLY" ? "Yearly" : "Monthly"} />
                <Field label="Monthly price" value={formatCurrency(sub.plan.monthlyPrice)} />
                <Field label="Trial ends" value={formatDate(sub.trialEnd)} />
                <Field label="Current period ends" value={formatDate(sub.currentPeriodEnd)} />
                <Field label="Cancel at period end" value={sub.cancelAtPeriodEnd ? "Yes" : "No"} />
                <Field label="Razorpay subscription ID" value={sub.providerSubscriptionId ?? "-"} mono />
                <Field label="Razorpay customer ID" value={tenant.razorpayCustomerId ?? "-"} mono />
                <Field
                  label="Last payment event"
                  value={tenant.lastPaymentEvent ? `${tenant.lastPaymentEvent.action} - ${formatDateTime(tenant.lastPaymentEvent.at)}` : "None yet"}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLoading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : !auditLog || auditLog.items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="py-10">
                    <EmptyState title="No billing activity yet" message="Plan changes, payments, and status changes will appear here." />
                  </TableCell>
                </TableRow>
              ) : (
                auditLog.items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-foreground">{e.action}</TableCell>
                    <TableCell className="text-muted-foreground">{e.actorType}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(e.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmSuspend}
        title={tenant.status === "ACTIVE" ? `Suspend ${tenant.name}?` : `Activate ${tenant.name}?`}
        message={
          tenant.status === "ACTIVE"
            ? "This restricts the tenant's access to the app immediately. Their data is never deleted, and reactivating restores access instantly."
            : `${tenant.name} will be able to access their workspace again.`
        }
        tone={tenant.status === "ACTIVE" ? "danger" : "brand"}
        confirmLabel={tenant.status === "ACTIVE" ? "Suspend" : "Activate"}
        onClose={() => setConfirmSuspend(false)}
        onConfirm={toggleStatus}
      />
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-medium text-foreground ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}
