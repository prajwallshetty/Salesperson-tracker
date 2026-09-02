import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { useFieldWorkStore } from "@/store/fieldwork";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { initials } from "@/lib/format";
import {
  BellIcon,
  ChevronRightIcon,
  LogoutIcon,
  TargetIcon,
  TrendingUpIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";

function MenuRow({ icon, label, to, onClick, danger }: { icon: ReactNode; label: string; to?: string; onClick?: () => void; danger?: boolean }) {
  const content = (
    <div className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50 ${danger ? "text-red-600" : "text-slate-700"}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${danger ? "bg-red-50" : "bg-slate-100"}`}>{icon}</span>
      <span className="flex-1 text-sm font-bold">{label}</span>
      {!danger && <ChevronRightIcon className="h-4 w-4 text-slate-300" />}
    </div>
  );
  if (to) return <Link to={to}>{content}</Link>;
  return <button onClick={onClick} className="w-full text-left">{content}</button>;
}

export function MorePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const tracking = useFieldWorkStore((s) => s.tracking);
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <div>
      <PageHeader title="More" />
      <div className="space-y-5 px-4 pt-4 pb-8">
        <Link to="/profile" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-base font-extrabold text-brand-700">
            {user ? initials(user.name) : "?"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-900">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <ChevronRightIcon className="h-4 w-4 text-slate-300" />
        </Link>

        <div className="space-y-2">
          <MenuRow icon={<TrendingUpIcon className="h-[18px] w-[18px]" />} label="Performance" to="/performance" />
          <MenuRow icon={<BellIcon className="h-[18px] w-[18px]" />} label="Notifications" to="/notifications" />
          <MenuRow icon={<TargetIcon className="h-[18px] w-[18px]" />} label="Leads & Follow-ups" to="/leads" />
          <MenuRow icon={<UsersIcon className="h-[18px] w-[18px]" />} label="My Profile" to="/profile" />
        </div>

        <div>
          <MenuRow
            icon={<LogoutIcon className="h-[18px] w-[18px]" />}
            label="Log Out"
            danger
            onClick={() => setConfirmLogout(true)}
          />
        </div>

        <p className="pt-2 text-center text-[11px] text-slate-400">SalesForce Pro Field App · v1.0</p>
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
