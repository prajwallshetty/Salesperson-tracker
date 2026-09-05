"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/store/auth";
import { Sidebar, useSidebarCollapsed } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// The command palette (cmdk + its search logic) is only ever needed after the
// user opens it with Ctrl/Cmd+K, so keep it out of every dashboard page's
// initial bundle and mount it on demand instead.
const CommandPalette = dynamic(() => import("@/components/CommandPalette").then((m) => m.CommandPalette), {
  ssr: false,
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Only mount the palette (and trigger its lazy chunk fetch) once it has
  // actually been opened at least once — never eagerly on page load.
  const [paletteMounted, setPaletteMounted] = useState(false);
  const openPalette = () => {
    setPaletteMounted(true);
    setPaletteOpen(true);
  };

  useEffect(() => {
    // `status` is only trustworthy once the live GET /auth/me check (fired once from
    // Providers on app mount) has resolved - see store/auth.ts. Redirect only once it
    // has settled to "unauthenticated"; a cached `user` alone never grants access.
    if (status === "loading") return;
    if (status === "unauthenticated" || !user || user.role !== "ADMIN") {
      router.replace("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteMounted(true);
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (status !== "authenticated" || !user || user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {user.impersonation?.active && <ImpersonationBanner />}
      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "hidden shrink-0 border-r border-border/60 transition-[width] duration-200 lg:block",
            collapsed ? "w-[76px]" : "w-64"
          )}
        >
          <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar variant="mobile" onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenuClick={() => setMobileOpen(true)} onSearchClick={openPalette} />
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      {paletteMounted && <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />}
    </div>
  );
}
