"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { GeoError, friendlyGeoErrorMessage, getCurrentPosition } from "@/lib/geolocation";
import { MapPinIcon, PhoneIcon, RefreshIcon } from "@/components/icons";
import type { Customer } from "@/types";

export default function NearbyCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [startingVisitFor, setStartingVisitFor] = useState<string | null>(null);

  async function load(radius = radiusKm) {
    setLoading(true);
    setError(null);
    try {
      const point = await getCurrentPosition();
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
          <button onClick={() => load()} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 active:bg-slate-100">
            <RefreshIcon className="h-5 w-5" />
          </button>
        }
      />
      <div className="px-4 pt-4">
        <div className="mb-4 flex gap-2">
          {[2, 5, 10, 25].map((r) => (
            <button
              key={r}
              onClick={() => {
                setRadiusKm(r);
                load(r);
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${
                radiusKm === r ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {r} km
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonList count={5} />
        ) : error ? (
          <EmptyState
            icon={<MapPinIcon className="h-10 w-10 text-slate-300" />}
            title="Couldn't get your location"
            message={error}
            action={
              <button onClick={() => load()} className="mt-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white">
                Try Again
              </button>
            }
          />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<MapPinIcon className="h-10 w-10 text-slate-300" />}
            title="No customers nearby"
            message={`No assigned customers within ${radiusKm} km of your current location.`}
          />
        ) : (
          <ul className="space-y-3">
            {customers.map((c) => (
              <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <Link href={`/customers/${c.id}`} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{c.name}</p>
                    {c.address && <p className="mt-0.5 truncate text-xs text-slate-500">{c.address}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                    {c.distanceKm?.toFixed(1)} km
                  </span>
                </Link>
                <div className="mt-3 flex gap-2">
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 active:bg-slate-50"
                    >
                      <PhoneIcon className="h-3.5 w-3.5" />
                      Call
                    </a>
                  )}
                  <button
                    onClick={() => startVisit(c.id)}
                    disabled={startingVisitFor === c.id}
                    className="flex-1 rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white active:bg-brand-700 disabled:opacity-60"
                  >
                    {startingVisitFor === c.id ? "Starting…" : "Start Visit"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
