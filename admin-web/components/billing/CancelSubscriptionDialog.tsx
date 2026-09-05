"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CancelSubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  renewalDate: string | null;
  onConfirm: (immediately: boolean) => Promise<void>;
}

export function CancelSubscriptionDialog({ open, onClose, renewalDate, onConfirm }: CancelSubscriptionDialogProps) {
  const [immediately, setImmediately] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm(immediately);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel subscription</DialogTitle>
          <DialogDescription>Your data and account are never deleted when you cancel — you can resubscribe any time.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setImmediately(false)}
            className={cn(
              "w-full rounded-xl border p-3 text-left text-sm transition-colors",
              !immediately ? "border-primary bg-primary-soft/40" : "border-border hover:bg-muted"
            )}
          >
            <p className="font-semibold text-foreground">Cancel at end of billing period (recommended)</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {renewalDate ? `Keep full access until ${new Date(renewalDate).toLocaleDateString("en-IN")}, then your plan won't renew.` : "Keep access until your current period ends, then your plan won't renew."}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setImmediately(true)}
            className={cn(
              "w-full rounded-xl border p-3 text-left text-sm transition-colors",
              immediately ? "border-destructive bg-destructive/5" : "border-border hover:bg-muted"
            )}
          >
            <p className="font-semibold text-foreground">Cancel immediately</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Paid functionality is restricted right away. This cannot be undone.</p>
          </button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Never mind
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} loading={busy}>
            {immediately ? "Cancel immediately" : "Cancel at period end"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
