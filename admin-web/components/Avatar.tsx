import { Avatar as UiAvatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { assetUrl } from "@/lib/api";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  online?: boolean;
  className?: string;
}

const SIZES: Record<string, string> = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-9 text-sm",
  lg: "size-16 text-lg",
};

const DOT_SIZES: Record<string, string> = {
  xs: "size-1.5",
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3.5",
};

export function Avatar({ name, src, size = "md", online, className }: AvatarProps) {
  const resolved = assetUrl(src);
  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <UiAvatar className={SIZES[size]}>
        {resolved && <AvatarImage src={resolved} alt={name} />}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </UiAvatar>
      {online !== undefined && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-card",
            DOT_SIZES[size],
            online ? "bg-success" : "bg-muted-foreground/40"
          )}
        />
      )}
    </div>
  );
}
