"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, UserCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SearchInput } from "@/components/SearchInput";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, apiErrorMessage } from "@/lib/api";
import type { Customer, Salesperson, Territory } from "@/types";

interface AssignMembersModalProps {
  open: boolean;
  territory: Territory | null;
  onClose: () => void;
  onAssigned: () => void;
}

// Territories has no dedicated "assign" endpoint - per API_CONTRACT.md, moving a
// salesperson or customer in/out of a territory reuses the existing
// PATCH /api/salespersons/:id / PATCH /api/customers/:id with { territoryId }.
export function AssignMembersModal({ open, territory, onClose, onAssigned }: AssignMembersModalProps) {
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setLoading(true);
    Promise.all([
      api.get("/salespersons", { params: { pageSize: 500 } }).then((res) => res.data.items ?? []),
      api.get("/customers", { params: { pageSize: 500 } }).then((res) => res.data.items ?? res.data ?? []),
    ])
      .then(([sp, cu]) => {
        setSalespersons(sp);
        setCustomers(cu);
      })
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load members")))
      .finally(() => setLoading(false));
  }, [open]);

  const filteredSalespersons = useMemo(
    () => salespersons.filter((s) => s.user.name.toLowerCase().includes(search.toLowerCase())),
    [salespersons, search]
  );
  const filteredCustomers = useMemo(
    () => customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [customers, search]
  );

  const setSalespersonTerritory = async (sp: Salesperson, territoryId: string | null) => {
    setBusyId(sp.id);
    try {
      await api.patch(`/salespersons/${sp.id}`, { territoryId });
      setSalespersons((prev) => prev.map((s) => (s.id === sp.id ? { ...s, territoryId } : s)));
      toast.success(territoryId ? `${sp.user.name} assigned` : `${sp.user.name} unassigned`);
      onAssigned();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update salesperson"));
    } finally {
      setBusyId(null);
    }
  };

  const setCustomerTerritory = async (c: Customer, territoryId: string | null) => {
    setBusyId(c.id);
    try {
      await api.patch(`/customers/${c.id}`, { territoryId });
      setCustomers((prev) => prev.map((x) => (x.id === c.id ? { ...x, territoryId } : x)));
      toast.success(territoryId ? `${c.name} assigned` : `${c.name} unassigned`);
      onAssigned();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update customer"));
    } finally {
      setBusyId(null);
    }
  };

  if (!territory) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign to {territory.name}</DialogTitle>
          <DialogDescription>Move salespersons and customers into or out of this territory.</DialogDescription>
        </DialogHeader>
        <SearchInput value={search} onChange={setSearch} placeholder="Search..." />
        <Tabs defaultValue="salespersons">
          <TabsList>
            <TabsTrigger value="salespersons">Salespersons</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>
          <TabsContent value="salespersons">
            <div className="max-h-80 overflow-y-auto rounded-xl border border-border/60">
              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filteredSalespersons.length === 0 ? (
                <div className="p-4">
                  <EmptyState icon={<UserCheck className="size-5" />} title="No salespersons found" />
                </div>
              ) : (
                filteredSalespersons.map((sp) => {
                  const isMember = sp.territoryId === territory.id;
                  return (
                    <div key={sp.id} className="flex items-center justify-between gap-3 border-b border-border/40 px-3 py-2.5 last:border-b-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{sp.user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {sp.territory ? sp.territory.name : "Unassigned"}
                        </p>
                      </div>
                      {isMember ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant="success" dot>
                            In territory
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            loading={busyId === sp.id}
                            onClick={() => setSalespersonTerritory(sp, null)}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" loading={busyId === sp.id} onClick={() => setSalespersonTerritory(sp, territory.id)}>
                          Assign
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
          <TabsContent value="customers">
            <div className="max-h-80 overflow-y-auto rounded-xl border border-border/60">
              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-4">
                  <EmptyState icon={<Users className="size-5" />} title="No customers found" />
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const isMember = c.territoryId === territory.id;
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-3 border-b border-border/40 px-3 py-2.5 last:border-b-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.territory?.name ?? "Unassigned"}</p>
                      </div>
                      {isMember ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant="success" dot>
                            In territory
                          </Badge>
                          <Button size="sm" variant="outline" loading={busyId === c.id} onClick={() => setCustomerTerritory(c, null)}>
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" loading={busyId === c.id} onClick={() => setCustomerTerritory(c, territory.id)}>
                          Assign
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
