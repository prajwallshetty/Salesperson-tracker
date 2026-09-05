"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Building2, Users, MapPinned, CreditCard, Wallet, Tags, TrendingUp, Webhook, BarChart3, Activity, HeartPulse, Settings, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Overview", href: "/super-admin/dashboard", icon: LayoutGrid },
  { label: "Tenants", href: "/super-admin/tenants", icon: Building2 },
  { label: "Users", href: "/super-admin/users", icon: Users },
  { label: "Salespeople", href: "/super-admin/salespeople", icon: MapPinned },
  { label: "Subscriptions", href: "/super-admin/subscriptions", icon: CreditCard },
  { label: "Payments", href: "/super-admin/payments", icon: Wallet },
  { label: "Plans", href: "/super-admin/plans", icon: Tags },
  { label: "Revenue", href: "/super-admin/revenue", icon: TrendingUp },
  { label: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
  { label: "Billing Events", href: "/super-admin/billing-events", icon: Webhook },
  { label: "Activity", href: "/super-admin/activity", icon: Activity },
  { label: "System Health", href: "/super-admin/system-health", icon: HeartPulse },
  { label: "Settings", href: "/super-admin/settings", icon: Settings },
];

export function SuperAdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 px-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
          <ShieldCheck className="size-4.5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-white">Sales Grid</p>
          <p className="truncate text-[11px] leading-tight text-slate-400">Super Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <item.icon className="size-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-3.5 text-[11px] text-slate-500">Platform administration</div>
    </div>
  );
}
