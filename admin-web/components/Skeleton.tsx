import { Skeleton as UiSkeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { TableRow, TableCell } from "@/components/ui/table";

export function Skeleton({ className }: { className?: string }) {
  return <UiSkeleton className={className} />;
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <TableRow className="hover:bg-transparent">
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}>
          <UiSkeleton className="h-4 w-full max-w-[10rem]" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-5">
        <UiSkeleton className="mb-3 h-3.5 w-24" />
        <UiSkeleton className="mb-2 h-7 w-32" />
        <UiSkeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}
