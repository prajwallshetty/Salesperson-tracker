"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { ChevronRight, LogOut, Target, TrendingUp, Bell, User } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useFieldWorkStore } from "@/store/fieldwork";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

function MenuRow({
  icon,
  label,
  to,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-card transition active:bg-muted",
        danger ? "text-danger" : "text-foreground"
      )}
    >
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl [&_svg]:h-[18px] [&_svg]:w-[18px]", danger ? "bg-danger-soft" : "bg-muted")}>
        {icon}
      </span>
      <span className="flex-1 text-sm font-bold">{label}</span>
      {!danger && <ChevronRight className="h-4 w-4 text-muted-foreground/50" />}
    </div>
  );
  if (to) return <Link href={to}>{content}</Link>;
  return (
    <button onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}

export default function MorePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const tracking = useFieldWorkStore((s) => s.tracking);
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <div>
      <PageHeader title="More" />
      <div className="space-y-5 px-4 pt-4 pb-8">
        <Link href="/profile" className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-base font-extrabold text-primary">
            {user ? initials(user.name) : "?"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-foreground">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </Link>

        <div className="space-y-2">
          <MenuRow icon={<TrendingUp />} label="Performance" to="/performance" />
          <MenuRow icon={<Bell />} label="Notifications" to="/notifications" />
          <MenuRow icon={<Target />} label="Leads & Follow-ups" to="/leads" />
          <MenuRow icon={<User />} label="My Profile" to="/profile" />
        </div>

        <div>
          <MenuRow icon={<LogOut />} label="Log Out" danger onClick={() => setConfirmLogout(true)} />
        </div>

        <p className="pt-2 text-center text-[11px] text-muted-foreground">SalesForce Pro Field App · v1.0</p>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Log out?"
        message={
          tracking
            ? "Location tracking is currently active. Logging out will stop tracking for this session."
            : "You'll need to sign in again to access the field app."
        }
        confirmLabel="Log Out"
        danger
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}
