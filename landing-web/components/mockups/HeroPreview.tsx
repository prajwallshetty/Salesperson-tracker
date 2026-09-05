import { MapPin, TrendingUp, Users, Clock } from "lucide-react";
import { MockPanel, StatTile, MiniBadge, AvatarDot } from "./Primitives";

const visits = [
  { name: "Kavya Reddy", customer: "Om Traders", status: "In Progress", tone: "primary" as const },
  { name: "Arjun Mehta", customer: "Shree Distributors", status: "Completed", tone: "success" as const },
  { name: "Rohan Kapoor", customer: "Metro Wholesale", status: "Planned", tone: "muted" as const },
];

export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/10 via-transparent to-transparent blur-2xl" />
      <MockPanel className="shadow-glow">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">Today&apos;s Overview</p>
          <MiniBadge tone="success">Live</MiniBadge>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <StatTile label="Today's Sales" value="₹4.2L" delta="+18% vs yesterday" />
          <StatTile label="Active Salespeople" value="24" delta="21 in the field" tone="neutral" />
          <StatTile label="Visits Today" value="86" delta="+12 completed" />
          <StatTile label="Follow-ups Due" value="9" tone="neutral" delta="3 overdue" />
        </div>

        <div className="mt-4 rounded-xl border border-border/60 bg-background/60 p-3">
          <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            Live in the field
          </div>
          <div className="space-y-2">
            {visits.map((v) => (
              <div key={v.name} className="flex items-center gap-2.5 rounded-lg bg-card px-2.5 py-2">
                <AvatarDot initials={v.name.split(" ").map((n) => n[0]).join("")} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{v.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{v.customer}</p>
                </div>
                <MiniBadge tone={v.tone}>{v.status}</MiniBadge>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-primary-soft py-2 text-xs font-semibold text-primary">
            <TrendingUp className="h-3.5 w-3.5" /> Targets
          </div>
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-muted py-2 text-xs font-semibold text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Team
          </div>
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-muted py-2 text-xs font-semibold text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Attendance
          </div>
        </div>
      </MockPanel>
    </div>
  );
}
