import clsx from "clsx";
import { assetUrl } from "@/lib/api";
import { initials } from "@/lib/format";

const PALETTE = [
  "bg-brand-100 text-brand-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-cyan-100 text-cyan-700",
];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % PALETTE.length;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  online?: boolean;
  className?: string;
}

const SIZES: Record<string, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function Avatar({ name, src, size = "md", online, className }: AvatarProps) {
  return (
    <div className={clsx("relative inline-flex shrink-0", className)}>
      {src ? (
        <img src={assetUrl(src) ?? undefined} alt={name} className={clsx("rounded-full object-cover", SIZES[size])} />
      ) : (
        <div
          className={clsx(
            "flex items-center justify-center rounded-full font-semibold",
            SIZES[size],
            colorFor(name || "?")
          )}
        >
          {initials(name)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={clsx(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white",
            online ? "bg-emerald-500" : "bg-slate-300"
          )}
        />
      )}
    </div>
  );
}
