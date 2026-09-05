"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  UserCheck,
  Radar,
  Route,
  Flame,
  Footprints,
  CalendarClock,
  FileText,
  ShoppingCart,
  Wallet,
  Package,
  Boxes,
  Tags,
  Target,
  Map as MapIcon,
  ClipboardCheck,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  Bell,
  Building2,
  CreditCard,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthStore } from "@/store/auth";

interface NavLeaf {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  // Server-side enforcement already exists on every /api/users/* route — this only
  // hides the nav entry so a non-admin doesn't see a link that would just 403.
  adminOnly?: boolean;
}

interface NavGroup {
  heading?: string;
  items: NavLeaf[];
}

const GROUPS: NavGroup[] = [
  { items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutGrid }] },
  {
    heading: "Sales",
    items: [
      { label: "Salespersons", href: "/salespersons", icon: Users },
      { label: "Customers", href: "/customers", icon: UserCheck },
      { label: "Live Tracking", href: "/tracking", icon: Radar },
      { label: "Route History", href: "/routes", icon: Route },
      { label: "Leads", href: "/leads", icon: Flame },
      { label: "Visits", href: "/visits", icon: Footprints },
      { label: "Follow-ups", href: "/follow-ups", icon: CalendarClock },
      { label: "Quotations", href: "/quotations", icon: FileText },
      { label: "Orders", href: "/orders", icon: ShoppingCart },
      { label: "Collections", href: "/collections", icon: Wallet },
    ],
  },
  {
    heading: "Catalog",
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "Categories", href: "/categories", icon: Boxes },
      { label: "Pricing", href: "/pricing", icon: Tags },
    ],
  },
  {
    heading: "Management",
    items: [
      { label: "Targets", href: "/targets", icon: Target },
      { label: "Territories", href: "/territories", icon: MapIcon },
      { label: "Attendance", href: "/attendance", icon: ClipboardCheck },
      { label: "Performance", href: "/performance", icon: TrendingUp },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    heading: "Settings",
    items: [
      { label: "Users & Roles", href: "/users", icon: ShieldCheck, adminOnly: true },
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Company Settings", href: "/settings", icon: Building2 },
      { label: "Billing & Subscription", href: "/billing", icon: CreditCard, adminOnly: true },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
}

export function Sidebar({ collapsed = false, onToggleCollapse, onNavigate, variant = "desktop" }: SidebarProps) {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);
  const isCollapsed = variant === "desktop" && collapsed;
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((item) => !item.adminOnly || role === "ADMIN") })).filter(
    (g) => g.items.length > 0
  );

  return (
    <div className="flex h-full flex-col bg-card">
      <div className={cn("flex h-16 shrink-0 items-center gap-2.5 border-b border-border/60 px-5", isCollapsed && "justify-center px-0")}>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card border border-border/60 p-0.5 shadow-xs overflow-hidden">
          <img src="/logo.png" alt="SalesGrid Logo" className="h-full w-full object-contain" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-foreground">SalesGrid</p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">Admin Dashboard</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.heading && !isCollapsed && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.heading}
              </p>
            )}
            {group.heading && isCollapsed && <div className="mx-2 mb-2 h-px bg-border/60" />}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = !!item.href && (pathname === item.href || pathname.startsWith(item.href + "/"));
                const content = item.href ? (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      isCollapsed && "justify-center px-0 py-2.5",
                      isActive
                        ? "bg-primary-soft text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-[18px] shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                ) : (
                  <div
                    className={cn(
                      "flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/50",
                      isCollapsed && "justify-center px-0 py-2.5"
                    )}
                  >
                    <item.icon className="size-[18px] shrink-0" />
                    {!isCollapsed && (
                      <span className="flex flex-1 items-center justify-between gap-2 truncate">
                        {item.label}
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                          Soon
                        </span>
                      </span>
                    )}
                  </div>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.label} delayDuration={200}>
                      <TooltipTrigger asChild>{content}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                }
                return <div key={item.label}>{content}</div>;
              })}
            </div>
          </div>
        ))}
      </nav>

      {variant === "desktop" && onToggleCollapse && (
        <div className="border-t border-border/60 p-3">
          <button
            onClick={onToggleCollapse}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              isCollapsed && "justify-center px-0"
            )}
          >
            {isCollapsed ? <ChevronsRight className="size-[18px]" /> : <ChevronsLeft className="size-[18px]" />}
            {!isCollapsed && "Collapse"}
          </button>
        </div>
      )}
      {!onToggleCollapse && (
        <div className="border-t border-border/60 px-5 py-3.5 text-[11px] text-muted-foreground/60">
          &copy; {new Date().getFullYear()} SalesGrid
        </div>
      )}
    </div>
  );
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sf_sidebar_collapsed");
      if (stored) setCollapsed(stored === "1");
    } catch {
      // ignore
    }
  }, []);
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("sf_sidebar_collapsed", next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };
  return [collapsed, toggle] as const;
}
