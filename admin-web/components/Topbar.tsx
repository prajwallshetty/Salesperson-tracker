"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, LogOut, ChevronDown, Settings as SettingsIcon } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Avatar } from "@/components/Avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TITLES: Record<string, string> = {
  "/salespersons": "Salespersons",
  "/customers": "Customers",
  "/tracking": "Live Tracking",
  "/routes": "Route History",
  "/leads": "Leads",
  "/visits": "Visits",
  "/follow-ups": "Follow-ups",
  "/quotations": "Quotations",
  "/orders": "Orders",
  "/collections": "Collections",
  "/products": "Products",
  "/categories": "Categories",
  "/pricing": "Pricing",
  "/targets": "Targets",
  "/territories": "Territories",
  "/attendance": "Attendance",
  "/users": "Users & Roles",
  "/performance": "Performance",
  "/reports": "Reports",
  "/notifications": "Notifications",
  "/settings": "Settings",
};

function pageTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  const base = "/" + pathname.split("/")[1];
  return TITLES[base] ?? "Overview";
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

interface TopbarProps {
  onMenuClick: () => void;
  onSearchClick?: () => void;
}

export function Topbar({ onMenuClick, onSearchClick }: TopbarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const firstName = user?.name?.split(" ")[0] ?? "Admin";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-card/85 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={onMenuClick}
        className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="min-w-0">
        {isDashboard ? (
          <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
            {greeting()}, {firstName} <span aria-hidden>👋</span>
          </h1>
        ) : (
          <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">{pageTitle(pathname)}</h1>
        )}
      </div>

      <button
        onClick={onSearchClick}
        className="ml-2 hidden max-w-xs flex-1 items-center gap-2 rounded-xl border border-border/60 bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition hover:border-border hover:bg-muted sm:flex"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search anything...</span>
        <kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={onSearchClick}
          aria-label="Search"
        >
          <Search className="size-[18px]" />
        </Button>
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-muted">
              <Avatar name={user?.name ?? "Admin"} src={user?.avatarUrl} size="sm" />
              <span className="hidden text-sm font-medium text-foreground sm:block">{user?.name}</span>
              <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="px-2 py-1.5">
              <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
              <p className="truncate text-xs font-normal normal-case text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <SettingsIcon /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => logout()}>
              <LogOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
