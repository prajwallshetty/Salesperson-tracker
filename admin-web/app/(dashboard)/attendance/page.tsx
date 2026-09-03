"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { FilterSelect } from "@/components/FilterSelect";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSalespersonOptions } from "@/hooks/useSalespersonOptions";
import { formatDate, formatTime } from "@/lib/format";
import type { AttendanceRow, Paginated } from "@/types";

const PAGE_SIZE = 15;

function formatDuration(min: number | null): string {
  if (min === null || min === undefined) return "-";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function AttendanceListPage() {
  const salespersons = useSalespersonOptions();
  const [salespersonId, setSalespersonId] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AttendanceRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => setPage(1), [salespersonId, status, dateFrom, dateTo]);

  const load = () => {
    setLoading(true);
    setError(false);
    api
      .get("/attendance", {
        params: {
          salespersonId: salespersonId || undefined,
          status: status || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(true);
        toast.error(apiErrorMessage(err, "Failed to load attendance"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [salespersonId, status, dateFrom, dateTo, page]);

  return (
    <div className="space-y-5">
      <PageHeader title="Attendance" description="Daily check-in/check-out records across the field sales team." />

      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          value={salespersonId}
          onChange={setSalespersonId}
          placeholder="All salespersons"
          options={salespersons.map((s) => ({ value: s.id, label: s.user.name }))}
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          options={[
            { value: "PRESENT", label: "Present" },
            { value: "INCOMPLETE", label: "Incomplete" },
            { value: "ABSENT", label: "Absent" },
          ]}
        />
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
        <span className="text-sm text-muted-foreground">to</span>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Salesperson</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead>Distance</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
          ) : error ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="py-10">
                <EmptyState
                  icon={<ClipboardCheck className="size-5" />}
                  title="Couldn't load attendance"
                  message="Something went wrong reaching the server."
                  action={
                    <Button variant="outline" size="sm" onClick={load}>
                      Retry
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ) : !data || data.items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="py-10">
                <EmptyState icon={<ClipboardCheck className="size-5" />} title="No attendance records found" message="Try adjusting your filters." />
              </TableCell>
            </TableRow>
          ) : (
            data.items.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={a.salespersonName} src={a.avatarUrl} size="sm" />
                    <span className="font-medium text-foreground">{a.salespersonName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(a.date)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {a.checkInAt ? (
                    <>
                      {formatTime(a.checkInAt)}
                      {a.checkInLat && a.checkInLng && (
                        <span className="ml-1.5 text-[11px] text-muted-foreground/70">
                          ({a.checkInLat.toFixed(3)}, {a.checkInLng.toFixed(3)})
                        </span>
                      )}
                    </>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {a.checkOutAt ? (
                    <>
                      {formatTime(a.checkOutAt)}
                      {a.checkOutLat && a.checkOutLng && (
                        <span className="ml-1.5 text-[11px] text-muted-foreground/70">
                          ({a.checkOutLat.toFixed(3)}, {a.checkOutLng.toFixed(3)})
                        </span>
                      )}
                    </>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {a.totalDistanceKm !== null ? `${a.totalDistanceKm.toFixed(1)} km` : "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDuration(a.totalDurationMin)}</TableCell>
                <TableCell>
                  <StatusBadge status={a.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}
    </div>
  );
}
