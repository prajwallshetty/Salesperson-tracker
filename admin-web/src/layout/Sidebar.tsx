import { NavLink } from "react-router-dom";
import clsx from "clsx";
import {
  IconGrid,
  IconUsers,
  IconBox,
  IconMap,
  IconRoute,
  IconLeads,
  IconQuote,
  IconOrders,
  IconFollowUp,
  IconWallet,
  IconChart,
} from "../components/icons";

const NAV = [
  { to: "/", label: "Dashboard", icon: IconGrid, end: true },
  { to: "/salespersons", label: "Salespersons", icon: IconUsers },
  { to: "/products", label: "Products", icon: IconBox },
  { to: "/tracking", label: "Live Tracking", icon: IconMap },
  { to: "/routes", label: "Route History", icon: IconRoute },
  { to: "/leads", label: "Leads", icon: IconLeads },
  { to: "/quotations", label: "Quotations", icon: IconQuote },
  { to: "/orders", label: "Orders", icon: IconOrders },
  { to: "/followups", label: "Follow-ups", icon: IconFollowUp },
  { to: "/collections", label: "Collections", icon: IconWallet },
  { to: "/performance", label: "Performance", icon: IconChart },
];

interface SidebarProps {
  open: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          SF
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-slate-800">SalesForce Pro</p>
          <p className="text-[11px] leading-tight text-slate-400">Admin Dashboard</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-100 px-5 py-4 text-[11px] text-slate-300">
        &copy; {new Date().getFullYear()} SalesForce Pro
      </div>
    </aside>
  );
}
