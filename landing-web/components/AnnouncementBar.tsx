import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function AnnouncementBar() {
  return (
    <div className="bg-primary py-2 text-center text-sm font-medium text-primary-foreground">
      <span className="hidden sm:inline">Everything your field sales team needs — in one platform.</span>
      <span className="sm:hidden">One platform for field sales.</span>{" "}
      <Link href="#product" className="ml-1 inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
        Explore Sales Grid <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
