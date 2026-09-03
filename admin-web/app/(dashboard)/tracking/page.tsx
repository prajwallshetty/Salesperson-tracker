"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/Skeleton";

const LiveTrackingView = dynamic(() => import("@/components/tracking/LiveTrackingView"), {
  ssr: false,
  loading: () => <Skeleton className="h-[calc(100vh-8.5rem)] w-full" />,
});

export default function TrackingPage() {
  return <LiveTrackingView />;
}
