"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Home, Users, MapPinned, Package, Ellipsis } from "lucide-react";

const tabs = [
  { to: "/home", label: "Home", icon: Home, matchPrefixes: ["/home"] },
  { to: "/customers", label: "Customers", icon: Users, matchPrefixes: ["/customers"] },
  { to: "/visits", label: "Visits", icon: MapPinned, matchPrefixes: ["/visits"] },
  { to: "/orders", label: "Orders", icon: Package, matchPrefixes: ["/orders", "/quotations", "/collections"] },
  {
    to: "/more",
    label: "More",
    icon: Ellipsis,
    matchPrefixes: ["/more", "/performance", "/notifications", "/profile", "/leads", "/follow-ups"],
  },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {tabs.map(({ to, label, icon: Icon, matchPrefixes }) => {
          const isActive = matchPrefixes.some((p) => pathname?.startsWith(p));
          return (
            <Link
              key={to}
              href={to}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold"
            >
              <span className="relative flex h-8 w-12 items-center justify-center">
                {isActive && (
                  <motion.span
                    layoutId="bottomNavActivePill"
                    className="absolute inset-0 rounded-full bg-primary-soft"
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  />
                )}
                <Icon
                  className={cn("relative h-5 w-5 transition-colors", isActive ? "text-primary" : "text-muted-foreground")}
                  strokeWidth={isActive ? 2.4 : 2}
                />
              </span>
              <span className={cn("transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
