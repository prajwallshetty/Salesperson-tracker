"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { MapPinIcon, PhoneIcon, SearchIcon, UsersIcon } from "@/components/icons";
import type { Customer, Paginated } from "@/types";

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startingVisitFor, setStartingVisitFor] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      api
        .get<Paginated<Customer>>("/customers", { params: { search: search || undefined, pageSize: 100 } })
        .then((res) => {
          if (active) setCustomers(res.data.items);
        })
        .catch((err) => toast.error(apiErrorMessage(err, "Could not load customers")))
        .finally(() => active && setLoading(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [search]);

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
        title="Customers"
        right={
          <Link
            href="/customers/nearby"
            className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700"
          >
            <MapPinIcon className="h-3.5 w-3.5" />
            Nearby
          </Link>
        }
      />
      <div className="px-4 pt-4">
        <div className="relative mb-4">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {loading ? (
          <SkeletonList count={5} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-10 w-10 text-slate-300" />}
            title="No customers found"
            message={search ? "Try a different search term." : "You don't have any assigned customers yet."}
          />
        ) : (
          <ul className="space-y-3">
            {customers.map((c) => (
              <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <Link href={`/customers/${c.id}`} className="block">
                  <p className="font-bold text-slate-900">{c.name}</p>
                  {c.address && <p className="mt-0.5 truncate text-xs text-slate-500">{c.address}</p>}
                  {c.territory?.name && (
                    <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {c.territory.name}
                    </span>
                  )}
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
