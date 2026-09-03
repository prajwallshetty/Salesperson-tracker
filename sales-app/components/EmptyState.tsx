import { ReactNode } from "react";
import { EmptyState as UiEmptyState } from "@/components/ui/empty-state";

/**
 * Thin adapter over the shared ui/empty-state primitive so existing call sites using
 * the legacy `message` prop name keep working with the new premium presentation.
 */
export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return <UiEmptyState icon={icon} title={title} description={message} action={action} />;
}
