import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "../../lib/api";
import { Avatar } from "../../components/Avatar";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton, SkeletonRow } from "../../components/Skeleton";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { formatCurrency, formatDate, formatDateTime, formatNumber, relativeTime } from "../../lib/format";
import { IconEdit, IconPower, IconUsers, IconTarget } from "../../components/icons";
import { EditSalespersonModal } from "./EditSalespersonModal";
import { AssignCustomersModal } from "./AssignCustomersModal";
import { SetTargetModal } from "./SetTargetModal";
import { RouteHistoryPanel } from "../Tracking/RouteHistoryPanel";
import type { Collection, FollowUp, Order, Salesperson, Visit } from "../../types";

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

const TABS = ["Profile", "Performance", "Attendance", "Visits", "Orders", "Collections", "Route History"] as const;
type Tab = (typeof TABS)[number];

export default function SalespersonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sp, setSp] = useState<Salesperson | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Profile");
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
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!sp) {
    return <EmptyState title="Salesperson not found" />;
  }

  return (
    <div className="space-y-5">
      <button onClick={() => navigate("/salespersons")} className="text-sm text-slate-400 hover:text-slate-600">
        &larr; Back to Salespersons
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center gap-4">
          <Avatar name={sp.user.name} src={sp.user.avatarUrl} online={sp.isOnline} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-800">{sp.user.name}</h1>
              <StatusBadge status={sp.status} />
            </div>
            <p className="text-sm text-slate-400">
              {sp.employeeCode} &middot; {sp.user.email} &middot; {sp.territory?.name ?? "Unassigned"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAssignOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <IconUsers className="h-4 w-4" /> Assign Customers
          </button>
          <button
            onClick={() => setTargetOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <IconTarget className="h-4 w-4" /> Set Target
          </button>
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <IconEdit className="h-4 w-4" /> Edit
          </button>
          <button
            onClick={() => setToggleOpen(true)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white ${
              sp.status === "ACTIVE" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            <IconPower className="h-4 w-4" /> {sp.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        {tab === "Profile" && <ProfileTab sp={sp} />}
        {tab === "Performance" && <PerformanceTab id={sp.id} />}
        {tab === "Attendance" && <AttendanceTab id={sp.id} />}
        {tab === "Visits" && <VisitsTab id={sp.id} />}
        {tab === "Orders" && <OrdersTab id={sp.id} />}
        {tab === "Collections" && <CollectionsTab id={sp.id} />}
        {tab === "Route History" && <RouteHistoryPanel salespersonId={sp.id} salespersonName={sp.user.name} />}
      </div>

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
    <div className="flex items-center justify-between border-b border-slate-50 py-2.5 last:border-b-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

function ProfileTab({ sp }: { sp: Salesperson }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="mb-2 text-sm font-semibold text-slate-700">Personal Details</p>
        <InfoRow label="Full name" value={sp.user.name} />
        <InfoRow label="Email" value={sp.user.email ?? "-"} />
        <InfoRow label="Phone" value={sp.user.phone ?? "-"} />
        <InfoRow label="Employee code" value={sp.employeeCode} />
        <InfoRow label="Joined" value={formatDate(sp.joinedAt)} />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="mb-2 text-sm font-semibold text-slate-700">Assignment</p>
        <InfoRow label="Territory" value={sp.territory?.name ?? "Unassigned"} />
        <InfoRow label="Manager" value={sp.manager?.user?.name ?? "None"} />
        <InfoRow label="Assigned customers" value={formatNumber(sp._count?.customers ?? 0)} />
        <InfoRow label="Total visits" value={formatNumber(sp._count?.visits ?? 0)} />
        <InfoRow label="Total orders" value={formatNumber(sp._count?.orders ?? 0)} />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-2">
        <p className="mb-2 text-sm font-semibold text-slate-700">Field Status</p>
        <InfoRow label="Online" value={sp.isOnline ? "Yes" : "No"} />
        <InfoRow label="Field work status" value={sp.fieldWorkStatus.replace("_", " ")} />
        <InfoRow label="Last seen" value={relativeTime(sp.lastSeenAt)} />
        <InfoRow label="Distance today" value={`${sp.todayDistanceKm.toFixed(1)} km`} />
      </div>
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
        <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs uppercase tracking-wide text-slate-400">{c.label}</p>
          <p className="mt-1 text-lg font-semibold text-slate-800">{c.value}</p>
        </div>
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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Check-in</th>
            <th className="px-4 py-3 font-medium">Check-out</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-10">
                <EmptyState title="No attendance records" />
              </td>
            </tr>
          ) : (
            data.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 text-slate-600">
                  {formatDate((a.date as string) ?? (a.checkInAt as string) ?? undefined)}
                </td>
                <td className="px-4 py-3 text-slate-500">{a.checkInAt ? formatDateTime(a.checkInAt as string) : "-"}</td>
                <td className="px-4 py-3 text-slate-500">{a.checkOutAt ? formatDateTime(a.checkOutAt as string) : "-"}</td>
                <td className="px-4 py-3">{a.status ? <StatusBadge status={a.status} /> : "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Check-in</th>
            <th className="px-4 py-3 font-medium">Check-out</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Outcome</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10">
                <EmptyState title="No visits recorded" />
              </td>
            </tr>
          ) : (
            data.map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-3 font-medium text-slate-700">{v.customer?.name ?? "-"}</td>
                <td className="px-4 py-3 text-slate-500">{v.checkInAt ? formatDateTime(v.checkInAt) : "-"}</td>
                <td className="px-4 py-3 text-slate-500">{v.checkOutAt ? formatDateTime(v.checkOutAt) : "-"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={v.status} />
                </td>
                <td className="px-4 py-3 text-slate-500">{v.outcome?.replace(/_/g, " ") ?? "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Order #</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10">
                <EmptyState title="No orders yet" />
              </td>
            </tr>
          ) : (
            data.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-medium text-slate-700">{o.number}</td>
                <td className="px-4 py-3 text-slate-500">{o.customer?.name ?? "-"}</td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(o.createdAt)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(o.grandTotal)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Method</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-10">
                <EmptyState title="No collections yet" />
              </td>
            </tr>
          ) : (
            data.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-slate-700">{c.customer?.name ?? "-"}</td>
                <td className="px-4 py-3 text-slate-500">{c.method.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(c.collectedAt)}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(c.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
