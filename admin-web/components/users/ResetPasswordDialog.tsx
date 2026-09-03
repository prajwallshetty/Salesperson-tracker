"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, apiErrorMessage } from "@/lib/api";
import type { UserAccount } from "@/types";

interface ResetPasswordDialogProps {
  open: boolean;
  user: UserAccount | null;
  onClose: () => void;
}

export function ResetPasswordDialog({ open, user, onClose }: ResetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const error = password.length > 0 && password.length < 6 ? "Minimum 6 characters" : "";

  const close = () => {
    setPassword("");
    onClose();
  };

  const onSubmit = async () => {
    if (!user || password.length < 6) return;
    setBusy(true);
    try {
      await api.post(`/users/${user.id}/reset-password`, { password });
      toast.success(`Password reset for ${user.name}`);
      close();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to reset password"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && close()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>{user ? `Set a new password for ${user.name}.` : ""}</DialogDescription>
        </DialogHeader>
        <Field label="New password" required error={error} hint="Min 6 characters">
          <Input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} loading={busy} disabled={password.length < 6}>
            Reset Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
