"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { HomeIcon, UsersIcon, TargetIcon, BoxIcon, MoreIcon } from "./icons";

const tabs = [
  { to: "/home", label: "Home", icon: HomeIcon, matchPrefixes: ["/home"] },
  { to: "/customers", label: "Customers", icon: UsersIcon, matchPrefixes: ["/customers", "/visits"] },
  { to: "/follow-ups", label: "Leads", icon: TargetIcon, matchPrefixes: ["/follow-ups", "/leads"] },
  { to: "/orders", label: "Orders", icon: BoxIcon, matchPrefixes: ["/orders", "/quotations", "/collections"] },
  { to: "/more", label: "More", icon: MoreIcon, matchPrefixes: ["/more", "/performance", "/notifications", "/profile"] },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {tabs.map(({ to, label, icon: Icon, matchPrefixes }) => {
          const isActive = matchPrefixes.some((p) => pathname?.startsWith(p));
          return (
            <Link
              key={to}
              href={to}
              className={clsx(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                isActive ? "text-brand-600" : "text-slate-400"
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={isActive ? 2.4 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
