import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string; iconOnly?: boolean }) {
  return (
    <img
      src="/logo.png"
      alt="SalesGrid"
      className={cn("h-8 sm:h-9 w-auto object-contain shrink-0", className)}
    />
  );
}
