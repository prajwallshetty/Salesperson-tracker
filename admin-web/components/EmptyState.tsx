import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { EmptyState as UiEmptyState } from "@/components/ui/empty-state";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <UiEmptyState
      icon={icon ?? <Inbox className="size-6" />}
      title={title}
      description={message}
      action={action}
    />
  );
}
