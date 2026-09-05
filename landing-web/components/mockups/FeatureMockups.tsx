import { MapPin, Camera, CheckCircle2, Navigation, TrendingUp, ArrowRight, FileText, ShoppingCart, Wallet, BarChart3 } from "lucide-react";
import { MockPanel, StatTile, MiniBadge, AvatarDot } from "./Primitives";

export function FieldVisitMockup() {
  return (
    <MockPanel className="shadow-glow">
      <p className="mb-3 text-sm font-bold text-foreground">Visit — Om Traders</p>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" /> Checked in
          </span>
          <span className="text-xs text-muted-foreground">9:42 AM</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MapPin className="h-4 w-4 text-primary" /> GPS verified
          </span>
          <MiniBadge tone="success">Within 40m</MiniBadge>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Camera className="h-4 w-4 text-muted-foreground" /> 2 photos attached
          </span>
        </div>
        <div className="rounded-xl bg-muted/60 px-3 py-2.5">
          <p className="text-xs font-semibold text-muted-foreground">Visit note</p>
          <p className="mt-1 text-sm text-foreground/90">Placed follow-up order, needs price list for Q3.</p>
        </div>
      </div>
    </MockPanel>
  );
}

export function LiveGpsMockup() {
  return (
    <MockPanel className="shadow-glow">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">Live Field Map</p>
        <MiniBadge tone="success">3 active</MiniBadge>
      </div>
      <div className="relative h-40 overflow-hidden rounded-xl bg-[linear-gradient(135deg,theme(colors.primary.soft),theme(colors.muted.DEFAULT))]">
        <div className="absolute left-[20%] top-[35%] flex flex-col items-center">
          <span className="flex h-3 w-3 animate-pulse rounded-full bg-primary ring-4 ring-primary/25" />
        </div>
        <div className="absolute left-[55%] top-[55%] flex flex-col items-center">
          <span className="flex h-3 w-3 animate-pulse rounded-full bg-primary ring-4 ring-primary/25" />
        </div>
        <div className="absolute left-[75%] top-[25%] flex flex-col items-center">
          <span className="flex h-3 w-3 animate-pulse rounded-full bg-primary ring-4 ring-primary/25" />
        </div>
        <Navigation className="absolute bottom-3 right-3 h-4 w-4 text-primary/40" />
      </div>
      <div className="mt-3 space-y-2">
        {[
          { name: "Kavya Reddy", note: "Updated 40s ago", tone: "success" as const },
          { name: "Arjun Mehta", note: "Updated 2m ago", tone: "muted" as const },
        ].map((p) => (
          <div key={p.name} className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-2.5 py-2">
            <AvatarDot initials={p.name.split(" ").map((n) => n[0]).join("")} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{p.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{p.note}</p>
            </div>
          </div>
        ))}
      </div>
    </MockPanel>
  );
}

export function CustomersLeadsMockup() {
  return (
    <MockPanel className="shadow-glow">
      <p className="mb-3 text-sm font-bold text-foreground">Pipeline</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "New", value: "18" },
          { label: "Qualified", value: "9" },
          { label: "Converted", value: "6" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-muted/50 py-2.5">
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {[
          { name: "Metro Wholesale", owner: "Rohan K.", tag: "Follow-up due" },
          { name: "Shree Distributors", owner: "Arjun M.", tag: "Site visit" },
        ].map((c) => (
          <div key={c.name} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-foreground">{c.name}</p>
              <p className="text-[11px] text-muted-foreground">Owner: {c.owner}</p>
            </div>
            <MiniBadge>{c.tag}</MiniBadge>
          </div>
        ))}
      </div>
    </MockPanel>
  );
}

export function TargetsMockup() {
  return (
    <MockPanel className="shadow-glow">
      <p className="mb-3 text-sm font-bold text-foreground">Monthly Target</p>
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">₹18.4L of ₹25L</span>
          <span className="font-bold text-primary">74%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[74%] rounded-full bg-primary" />
        </div>
      </div>
      <p className="mb-2 text-xs font-semibold text-muted-foreground">Top performers</p>
      <div className="space-y-2">
        {[
          { name: "Kavya Reddy", pct: 96 },
          { name: "Arjun Mehta", pct: 88 },
          { name: "Rohan Kapoor", pct: 71 },
        ].map((p, i) => (
          <div key={p.name} className="flex items-center gap-2.5">
            <span className="w-4 text-xs font-bold text-muted-foreground">{i + 1}</span>
            <AvatarDot initials={p.name.split(" ").map((n) => n[0]).join("")} />
            <span className="flex-1 text-sm font-medium text-foreground">{p.name}</span>
            <span className="flex items-center gap-1 text-xs font-bold text-success">
              <TrendingUp className="h-3 w-3" /> {p.pct}%
            </span>
          </div>
        ))}
      </div>
    </MockPanel>
  );
}

export function OrdersWorkflowMockup() {
  const steps = [
    { icon: AvatarDotIcon, label: "Lead" },
    { icon: MapPin, label: "Visit" },
    { icon: FileText, label: "Quotation" },
    { icon: ShoppingCart, label: "Order" },
    { icon: Wallet, label: "Collection" },
  ];
  return (
    <MockPanel className="shadow-glow">
      <p className="mb-4 text-sm font-bold text-foreground">From opportunity to order</p>
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3 py-3">
              <s.icon className="h-4 w-4 text-primary" />
              <span className="text-[11px] font-semibold text-foreground">{s.label}</span>
            </div>
            {i < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-success-soft px-3.5 py-3">
        <p className="text-sm font-semibold text-success">Order #SO-2609 confirmed — ₹42,500</p>
      </div>
    </MockPanel>
  );
}

function AvatarDotIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  );
}

export function ReportingMockup() {
  return (
    <MockPanel className="shadow-glow">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">Sales Report — This Month</p>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex h-28 items-end gap-2">
        {[40, 65, 50, 80, 60, 95, 72].map((h, i) => (
          <div key={i} className="flex-1 rounded-t-md bg-primary/70" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <StatTile label="Territory: North" value="₹9.1L" delta="+9%" />
        <StatTile label="Territory: South" value="₹7.6L" delta="+4%" />
      </div>
    </MockPanel>
  );
}
