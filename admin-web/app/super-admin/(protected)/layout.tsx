"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { usePlatformAuthStore } from "@/store/platformAuth";
import { SuperAdminSidebar } from "@/components/superadmin/SuperAdminSidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function SuperAdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = usePlatformAuthStore((s) => s.status);
  const admin = usePlatformAuthStore((s) => s.admin);
  const checkSession = usePlatformAuthStore((s) => s.checkSession);
  const logout = usePlatformAuthStore((s) => s.logout);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/super-admin/login");
  }, [status, router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/super-admin/login");
  };

  if (status !== "authenticated" || !admin) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">Loading...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="hidden w-64 shrink-0 lg:block">
        <SuperAdminSidebar />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SuperAdminSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <span className="hidden text-sm font-medium text-slate-500 lg:block">Platform administration</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">{admin.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="size-3.5" /> Log out
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
