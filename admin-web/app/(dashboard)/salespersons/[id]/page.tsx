"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { ArrowLeft, Users, Target, Pencil, Power } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton, SkeletonRow } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime, formatNumber, relativeTime } from "@/lib/format";
import { EditSalespersonModal } from "@/components/salespersons/EditSalespersonModal";
import { AssignCustomersModal } from "@/components/salespersons/AssignCustomersModal";
import { SetTargetModal } from "@/components/salespersons/SetTargetModal";
import type { Collection, Order, Salesperson, Visit } from "@/types";

const RouteHistoryPanel = dynamic(() => import("@/components/tracking/RouteHistoryPanel"), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full" />,
});

interface PerfSummary {
  todaySales: number;
  todayOrders: number;
  monthlySales: number;
  monthlyOrders: number;
  todayVisits: number;
  pendingFollowUps: number;
  monthlyCollections: number;
}

interface AttendanceRecord {
  id: string;
  date?: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status?: string;
  [key: string]: unknown;
}

const TABS = ["overview", "performance", "attendance", "visits", "orders", "collections", "route"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  overview: "Overview",
  performance: "Performance",
  attendance: "Attendance",
  visits: "Visits",
  orders: "Orders",
  collections: "Collections",
  route: "Route History",
};

export default function SalespersonDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [sp, setSp] = useState<Salesperson | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/salespersons/${id}`)
      .then((res) => setSp(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load salesperson")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const toggleStatus = async () => {
    if (!sp) return;
    const next = sp.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.patch(`/salespersons/${sp.id}/status`, { status: next });
      toast.success(`${sp.user.name} marked ${next.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update status"));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!sp) {
    return <EmptyState title="Salesperson not found" />;
  }

  return (
    <div className="space-y-5">
      <button onClick={() => router.push("/salespersons")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Salespersons
      </button>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <Avatar name={sp.user.name} src={sp.user.avatarUrl} online={sp.isOnline} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-foreground">{sp.user.name}</h1>
                <StatusBadge status={sp.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {sp.employeeCode} &middot; {sp.user.email} &middot; {sp.territory?.name ?? "Unassigned"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setAssignOpen(true)}>
              <Users /> Assign Customers
            </Button>
            <Button variant="outline" onClick={() => setTargetOpen(true)}>
              <Target /> Set Target
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
            <Button variant={sp.status === "ACTIVE" ? "destructive" : "success"} onClick={() => setToggleOpen(true)}>
              <Power /> {sp.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="flex-wrap h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t}>
              {TAB_LABEL[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <ProfileTab sp={sp} />
        </TabsContent>
        <TabsContent value="performance">
          <PerformanceTab id={sp.id} />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceTab id={sp.id} />
        </TabsContent>
        <TabsContent value="visits">
          <VisitsTab id={sp.id} />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab id={sp.id} />
        </TabsContent>
        <TabsContent value="collections">
          <CollectionsTab id={sp.id} />
        </TabsContent>
        <TabsContent value="route">
          <RouteHistoryPanel salespersonId={sp.id} salespersonName={sp.user.name} />
        </TabsContent>
      </Tabs>

      <EditSalespersonModal open={editOpen} salesperson={sp} onClose={() => setEditOpen(false)} onSaved={load} />
      <AssignCustomersModal open={assignOpen} salespersonId={sp.id} onClose={() => setAssignOpen(false)} onAssigned={load} />
      <SetTargetModal open={targetOpen} salespersonId={sp.id} onClose={() => setTargetOpen(false)} onSaved={load} />
      <ConfirmDialog
        open={toggleOpen}
        title={sp.status === "ACTIVE" ? "Deactivate salesperson?" : "Activate salesperson?"}
        message={`This will mark ${sp.user.name} as ${sp.status === "ACTIVE" ? "inactive" : "active"}.`}
        tone={sp.status === "ACTIVE" ? "danger" : "brand"}
        confirmLabel={sp.status === "ACTIVE" ? "Deactivate" : "Activate"}
        onClose={() => setToggleOpen(false)}
        onConfirm={toggleStatus}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-2.5 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function ProfileTab({ sp }: { sp: Salesperson }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="p-5">
          <p className="mb-2 text-sm font-semibold text-foreground">Personal Details</p>
          <InfoRow label="Full name" value={sp.user.name} />
          <InfoRow label="Email" value={sp.user.email ?? "-"} />
          <InfoRow label="Phone" value={sp.user.phone ?? "-"} />
          <InfoRow label="Employee code" value={sp.employeeCode} />
          <InfoRow label="Joined" value={formatDate(sp.joinedAt)} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <p className="mb-2 text-sm font-semibold text-foreground">Assignment</p>
          <InfoRow label="Territory" value={sp.territory?.name ?? "Unassigned"} />
          <InfoRow label="Manager" value={sp.manager?.user?.name ?? "None"} />
          <InfoRow label="Assigned customers" value={formatNumber(sp._count?.customers ?? 0)} />
          <InfoRow label="Total visits" value={formatNumber(sp._count?.visits ?? 0)} />
          <InfoRow label="Total orders" value={formatNumber(sp._count?.orders ?? 0)} />
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardContent className="p-5">
          <p className="mb-2 text-sm font-semibold text-foreground">Field Status</p>
          <InfoRow label="Online" value={sp.isOnline ? "Yes" : "No"} />
          <InfoRow label="Field work status" value={sp.fieldWorkStatus.replace("_", " ")} />
          <InfoRow label="Last seen" value={relativeTime(sp.lastSeenAt)} />
          <InfoRow label="Distance today" value={`${sp.todayDistanceKm.toFixed(1)} km`} />
        </CardContent>
      </Card>
    </div>
  );
}

function PerformanceTab({ id }: { id: string }) {
  const [data, setData] = useState<PerfSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/salespersons/${id}/performance-summary`)
      .then((res) => setData(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load performance")))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  if (!data) return <EmptyState title="No performance data" />;

  const cells = [
    { label: "Today's Sales", value: formatCurrency(data.todaySales) },
    { label: "Today's Orders", value: formatNumber(data.todayOrders) },
    { label: "Monthly Sales", value: formatCurrency(data.monthlySales) },
    { label: "Monthly Orders", value: formatNumber(data.monthlyOrders) },
    { label: "Today's Visits", value: formatNumber(data.todayVisits) },
    { label: "Pending Follow-ups", value: formatNumber(data.pendingFollowUps) },
    { label: "Monthly Collections", value: formatCurrency(data.monthlyCollections) },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {cells.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-lg font-bold text-foreground">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AttendanceTab({ id }: { id: string }) {
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/salespersons/${id}/attendance`)
      .then((res) => setData(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load attendance")))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Check-in</TableHead>
          <TableHead>Check-out</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
        ) : data.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={4} className="py-10">
              <EmptyState title="No attendance records" />
            </TableCell>
          </TableRow>
        ) : (
          data.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="text-foreground">{formatDate((a.date as string) ?? (a.checkInAt as string) ?? undefined)}</TableCell>
              <TableCell className="text-muted-foreground">{a.checkInAt ? formatDateTime(a.checkInAt as string) : "-"}</TableCell>
              <TableCell className="text-muted-foreground">{a.checkOutAt ? formatDateTime(a.checkOutAt as string) : "-"}</TableCell>
              <TableCell>{a.status ? <StatusBadge status={a.status} /> : "-"}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function VisitsTab({ id }: { id: string }) {
  const [data, setData] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/visits", { params: { salespersonId: id } })
      .then((res) => setData(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load visits")))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Check-in</TableHead>
          <TableHead>Check-out</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Outcome</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
        ) : data.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={5} className="py-10">
              <EmptyState title="No visits recorded" />
            </TableCell>
          </TableRow>
        ) : (
          data.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="font-medium text-foreground">{v.customer?.name ?? "-"}</TableCell>
              <TableCell className="text-muted-foreground">{v.checkInAt ? formatDateTime(v.checkInAt) : "-"}</TableCell>
              <TableCell className="text-muted-foreground">{v.checkOutAt ? formatDateTime(v.checkOutAt) : "-"}</TableCell>
              <TableCell>
                <StatusBadge status={v.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">{v.outcome?.replace(/_/g, " ") ?? "-"}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function OrdersTab({ id }: { id: string }) {
  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/orders", { params: { salespersonId: id } })
      .then((res) => setData(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load orders")))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order #</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
        ) : data.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={5} className="py-10">
              <EmptyState title="No orders yet" />
            </TableCell>
          </TableRow>
        ) : (
          data.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium text-foreground">{o.number}</TableCell>
              <TableCell className="text-muted-foreground">{o.customer?.name ?? "-"}</TableCell>
              <TableCell className="text-muted-foreground">{formatDateTime(o.createdAt)}</TableCell>
              <TableCell>
                <StatusBadge status={o.status} />
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">{formatCurrency(o.grandTotal)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function CollectionsTab({ id }: { id: string }) {
  const [data, setData] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/collections", { params: { salespersonId: id } })
      .then((res) => setData(res.data ?? []))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load collections")))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
        ) : data.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={4} className="py-10">
              <EmptyState title="No collections yet" />
            </TableCell>
          </TableRow>
        ) : (
          data.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium text-foreground">{c.customer?.name ?? "-"}</TableCell>
              <TableCell className="text-muted-foreground">{c.method.replace(/_/g, " ")}</TableCell>
              <TableCell className="text-muted-foreground">{formatDateTime(c.collectedAt)}</TableCell>
              <TableCell className="text-right font-semibold text-foreground">{formatCurrency(c.amount)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
