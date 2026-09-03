"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin, Phone, Search, Users } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
            className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3.5 py-2 text-xs font-bold text-primary active:bg-primary-soft/70"
          >
            <MapPin className="h-3.5 w-3.5" />
            Nearby
          </Link>
        }
      />
      <div className="px-4 pt-4">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="w-full rounded-xl border border-input bg-card py-3 pl-10 pr-4 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40"
          />
        </div>

        {loading ? (
          <SkeletonList count={5} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No customers found"
            message={search ? "Try a different search term." : "You don't have any assigned customers yet."}
          />
        ) : (
          <ul className="space-y-3">
            {customers.map((c) => (
              <li key={c.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
                <Link href={`/customers/${c.id}`} className="block">
                  <p className="font-bold text-foreground">{c.name}</p>
                  {c.address && <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.address}</p>}
                  {c.territory?.name && (
                    <Badge variant="muted" className="mt-2">
                      {c.territory.name}
                    </Badge>
                  )}
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
