import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";
import { TrackingBanner } from "./TrackingBanner";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-slate-50">
      <div className="sticky top-0 z-30">
        <OfflineBanner />
        <TrackingBanner />
      </div>
      <main className="flex-1 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
