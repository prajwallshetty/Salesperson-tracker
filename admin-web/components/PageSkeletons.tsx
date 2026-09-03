// Server-safe skeleton layouts used by route-level `loading.tsx` files under
// `app/(dashboard)/`. These render before the page's own client-side data
// fetch even starts (while the route's JS chunk streams in), so they only
// need to roughly match each page's real layout — not its live data.
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

function HeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      {withAction && <Skeleton className="h-10 w-36 rounded-xl" />}
    </div>
  );
}

function FiltersSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-40 rounded-xl" />
      ))}
    </div>
  );
}

function TableSkeleton({ cols = 5, rows = 6 }: { cols?: number; rows?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: cols }).map((_, i) => (
            <TableCell key={i}>
              <Skeleton className="h-3 w-16" />
            </TableCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, r) => (
          <TableRow key={r} className="hover:bg-transparent">
            {Array.from({ length: cols }).map((_, c) => (
              <TableCell key={c}>
                <Skeleton className="h-4 w-full max-w-[10rem]" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** List pages: Salespersons, Customers, Products, Orders, Quotations, Collections, Visits, Follow-ups, Leads. */
export function ListPageSkeleton({
  withAction = false,
  filters = 3,
  cols = 5,
  withStats = false,
}: {
  withAction?: boolean;
  filters?: number;
  cols?: number;
  withStats?: boolean;
}) {
  return (
    <div className="space-y-5">
      <HeaderSkeleton withAction={withAction} />
      {withStats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-2xl" />
          ))}
        </div>
      )}
      <FiltersSkeleton count={filters} />
      <TableSkeleton cols={cols} />
    </div>
  );
}

/** Dashboard: KPI grid + chart/top-performers row + tracking/activity row. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="mb-3 h-3.5 w-24" />
              <Skeleton className="mb-2 h-7 w-32" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 w-full rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 w-full rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** Profile pages with tabs: Salesperson / Customer detail. */
export function ProfileSkeleton({ tabs = 6 }: { tabs?: number }) {
  return (
    <div className="space-y-5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="flex gap-1.5 rounded-xl bg-muted p-1" style={{ width: "fit-content" }}>
        {Array.from({ length: tabs }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** Simple detail/read-only pages: Product detail. */
export function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

/** Map-driven pages: Live Tracking, Route History. */
export function MapPageSkeleton() {
  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-4">
      <HeaderSkeleton />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <Skeleton className="h-full w-full rounded-2xl" />
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** Generic content pages: Performance, Reports, Notifications, Settings. */
export function SimplePageSkeleton({ blocks = 2 }: { blocks?: number }) {
  return (
    <div className="space-y-5">
      <HeaderSkeleton />
      <div className="space-y-4">
        {Array.from({ length: blocks }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
