"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Building2, Ban, CheckCircle2, LogIn } from "lucide-react";
import { platformApi } from "@/lib/platformApi";
import { apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import type { PlatformTenantDetail, PlatformBillingAuditLogItem, PlatformPaymentItem, Paginated } from "@/types";

export default function SuperAdminTenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tenant, setTenant] = useState<PlatformTenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditLog, setAuditLog] = useState<Paginated<PlatformBillingAuditLogItem> | null>(null);
  const [auditLoading, setAuditLoading] = useState(true);
  const [payments, setPayments] = useState<Paginated<PlatformPaymentItem> | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState("");
  const [impersonating, setImpersonating] = useState(false);

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

  useEffect(() => {
    setPaymentsLoading(true);
    platformApi
      .get("/payments", { params: { tenantId: id, pageSize: 20 } })
      .then((res) => setPayments(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load payments")))
      .finally(() => setPaymentsLoading(false));
  }, [id]);

  const startImpersonation = async () => {
    setImpersonating(true);
    try {
      await platformApi.post(`/tenants/${id}/impersonate`, { reason: impersonateReason });
      // Full navigation (not client-side routing) - the tenant sf_token cookie the backend just
      // set needs to be picked up by a fresh request to /dashboard, and the tenant app's own
      // auth store needs to re-initialize as this impersonated identity rather than carrying
      // over any cached "logged out" state from the super-admin section.
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't start impersonation"));
      setImpersonating(false);
    }
  };

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
        description={tenant.admin ? `${tenant.slug} · ${tenant.admin.name} (${tenant.admin.email})` : tenant.slug}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImpersonateOpen(true)} disabled={tenant.status === "SUSPENDED"}>
              <LogIn className="size-4" /> Login as tenant
            </Button>
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
          </div>
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
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Leads</p>
            <p className="mt-1 text-lg font-bold text-foreground">{tenant.leadCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Visits</p>
            <p className="mt-1 text-lg font-bold text-foreground">{tenant.visitCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Orders</p>
            <p className="mt-1 text-lg font-bold text-foreground">{tenant.orderCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Collections</p>
            <p className="mt-1 text-lg font-bold text-foreground">{tenant.collectionCount}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subscription">
        <TabsList>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
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

        <TabsContent value="payments" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentsLoading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : !payments || payments.items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-10">
                    <EmptyState title="No payments yet" message="Payments appear here once Razorpay sends a real payment webhook for this tenant." />
                  </TableCell>
                </TableRow>
              ) : (
                payments.items.map((p) => (
                  <TableRow key={p.billingEventId}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.razorpayPaymentId}</TableCell>
                    <TableCell className="font-medium text-foreground">{p.amount != null ? formatCurrency(p.amount) : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "captured" ? "success" : p.status === "failed" ? "danger" : "muted"}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(p.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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

      <Dialog open={impersonateOpen} onOpenChange={(o) => !o && !impersonating && setImpersonateOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Login as {tenant.name}?</DialogTitle>
            <DialogDescription>
              This opens a 20-minute session as this tenant&apos;s admin. It is fully audited and shown to you as a persistent banner the whole time -
              your own Owner session is never affected.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason (required, for the audit log)</Label>
            <Input value={impersonateReason} onChange={(e) => setImpersonateReason(e.target.value)} placeholder="e.g. Investigating support ticket #123" autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImpersonateOpen(false)} disabled={impersonating}>
              Cancel
            </Button>
            <Button type="button" onClick={startImpersonation} loading={impersonating} disabled={impersonateReason.trim().length < 3}>
              Start impersonation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
