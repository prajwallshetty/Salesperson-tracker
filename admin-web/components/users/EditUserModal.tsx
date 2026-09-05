"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, apiErrorMessage } from "@/lib/api";
import type { UserAccount } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditUserModalProps {
  open: boolean;
  user: UserAccount | null;
  onClose: () => void;
  onSaved: () => void;
}

import { AccessCodeControl } from "@/components/users/AccessCodeControl";

// Editing is intentionally narrow — PATCH /api/users/:id only accepts name/phone/isActive/role
// (see API_CONTRACT.md), and role changes are rejected server-side once a linked Salesperson
// record exists either way, so this form sticks to what's actually safe to change here.
export function EditUserModal({ open, user, onClose, onSaved }: EditUserModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", phone: "" } });

  useEffect(() => {
    if (open && user) reset({ name: user.name, phone: user.phone ?? "" });
  }, [open, user, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    try {
      await api.patch(`/users/${user.id}`, { name: values.name, phone: values.phone || undefined });
      toast.success("User updated");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update user"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Full name" required error={errors.name?.message}>
            <Input {...register("name")} />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <Input {...register("phone")} placeholder="+91 90000 00000" />
          </Field>
          <p className="text-xs text-muted-foreground">
            Email and role can&apos;t be changed here — create a new account for a different role.
          </p>

          {user && (user.role === "SALESPERSON" || user.salesperson) && (
            <div className="pt-2">
              <AccessCodeControl userId={user.id} onUpdate={onSaved} />
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

