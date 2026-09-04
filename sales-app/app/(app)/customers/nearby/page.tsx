"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { List, MapPin, Map as MapIcon, Phone, RefreshCw } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonList, Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { GeoError, GeoPoint, friendlyGeoErrorMessage, getCurrentPosition } from "@/lib/geolocation";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types";

const NearbyMap = dynamic(() => import("@/components/maps/NearbyMap").then((m) => m.NearbyMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

const RADII = [2, 5, 10, 25];

export default function NearbyCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [position, setPosition] = useState<GeoPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [startingVisitFor, setStartingVisitFor] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");

  async function load(radius = radiusKm) {
    setLoading(true);
    setError(null);
    try {
      const point = await getCurrentPosition();
      setPosition(point);
      const res = await api.get<Customer[]>("/customers/nearby", {
        params: { lat: point.lat, lng: point.lng, radiusKm: radius },
      });
      setCustomers(res.data);
    } catch (err) {
      if (err instanceof GeoError) {
        setError(friendlyGeoErrorMessage(err.kind));
      } else {
        setError(apiErrorMessage(err, "Could not load nearby customers"));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startVisit(customerId: string) {
    setStartingVisitFor(customerId);
    try {
      const res = await api.post("/visits", { customerId });
      toast.success("Visit started");
      router.push(`/visits/${res.data.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not start visit"));
    } finally {
      setStartingVisitFor(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Nearby Customers"
        back
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView((v) => (v === "list" ? "map" : "list"))}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition active:bg-muted"
              aria-label={view === "list" ? "Show map" : "Show list"}
            >
              {view === "list" ? <MapIcon className="h-5 w-5" /> : <List className="h-5 w-5" />}
            </button>
            <button
              onClick={() => load()}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition active:bg-muted"
              aria-label="Refresh"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        }
      />
      <div className="px-4 pt-4">
        <div className="mb-4 flex gap-2">
          {RADII.map((r) => (
            <button
              key={r}
              onClick={() => {
                setRadiusKm(r);
                load(r);
              }}
              className={cn(
                "rounded-full px-3.5 py-2 text-xs font-bold transition-colors",
                radiusKm === r ? "bg-primary text-primary-foreground" : "border border-border/60 bg-card text-muted-foreground"
              )}
            >
              {r} km
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonList count={5} />
        ) : error ? (
          <EmptyState
            icon={<MapPin />}
            title="Couldn't get your location"
            message={error}
            action={
              <Button onClick={() => load()} className="mt-2">
                Try Again
              </Button>
            }
          />
        ) : view === "map" && position ? (
          <div className="h-[calc(100vh-13rem)] overflow-hidden rounded-2xl border border-border/60">
            <NearbyMap
              currentPosition={{ lat: position.lat, lng: position.lng }}
              customers={customers}
              onSelectCustomer={(id) => router.push(`/customers/${id}`)}
              className="h-full w-full"
            />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<MapPin />}
            title="No customers nearby"
            message={`No assigned customers within ${radiusKm} km of your current location.`}
          />
        ) : (
          <ul className="space-y-3">
            {customers.map((c) => (
              <li key={c.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
                <Link href={`/customers/${c.id}`} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{c.name}</p>
                    {c.address && <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.address}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                    {c.distanceKm?.toFixed(1)} km
                  </span>
                </Link>
                <div className="mt-3 flex gap-2">
                  {c.phone && (
                    <Button variant="outline" size="lg" className="flex-1 text-xs" asChild>
                      <a href={`tel:${c.phone}`}>
                        <Phone className="h-3.5 w-3.5" />
                        Call
                      </a>
                    </Button>
                  )}
                  <Button
                    size="lg"
                    className="flex-1 text-xs"
                    onClick={() => startVisit(c.id)}
                    loading={startingVisitFor === c.id}
                  >
                    {startingVisitFor === c.id ? "Starting…" : "Start Visit"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
