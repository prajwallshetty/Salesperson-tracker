import { Badge, type BadgeProps } from "@/components/ui/badge";

type Tone = NonNullable<BadgeProps["variant"]>;

const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "success",
  ONLINE: "success",
  COMPLETED: "success",
  DELIVERED: "success",
  ACCEPTED: "success",
  CONVERTED: "success",
  PAYMENT_COLLECTED: "success",
  ORDER_PLACED: "success",

  INACTIVE: "muted",
  OFFLINE: "muted",
  CANCELLED: "muted",
  DRAFT: "muted",
  PLANNED: "muted",
  NOT_STARTED: "muted",
  ENDED: "muted",
  NOT_INTERESTED: "muted",
  NO_RESPONSE: "muted",
  OTHER: "muted",

  PENDING: "warning",
  CONTACTED: "warning",
  NEGOTIATION: "warning",
  FOLLOW_UP_REQUIRED: "warning",

  OVERDUE: "danger",
  REJECTED: "danger",
  LOST: "danger",

  CONFIRMED: "info",
  SENT: "info",
  NEW: "info",
  IN_PROGRESS: "info",

  QUALIFIED: "default",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const variant = STATUS_TONE[status] ?? "muted";
  return (
    <Badge variant={variant} dot>
      {label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
