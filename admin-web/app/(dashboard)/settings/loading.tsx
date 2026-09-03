import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <Skeleton className="h-7 w-28" />
        <Skeleton className="mt-2 h-4 w-40" />
      </div>
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <Skeleton className="size-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="mb-4 h-3 w-56" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </CardContent>
      </Card>
    </div>
  );
}
