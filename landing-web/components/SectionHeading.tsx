import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-2xl", align === "center" ? "text-center" : "text-left mx-0", className)}>
      {eyebrow && (
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
      )}
      <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  );
}
