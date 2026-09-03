"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { api, apiErrorMessage } from "@/lib/api";
import { invalidateTerritoryOptions } from "@/hooks/useTerritoryOptions";
import type { Territory } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Territory name is required"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
const emptyForm: FormValues = { name: "", description: "" };

interface TerritoryModalProps {
  open: boolean;
  territory: Territory | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TerritoryModal({ open, territory, onClose, onSaved }: TerritoryModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyForm });

  useEffect(() => {
    if (!open) return;
    reset(territory ? { name: territory.name, description: territory.description ?? "" } : emptyForm);
  }, [open, territory, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = { name: values.name, description: values.description || undefined };
      if (territory) {
        await api.patch(`/territories/${territory.id}`, payload);
        toast.success("Territory updated");
      } else {
        await api.post("/territories", payload);
        toast.success("Territory created");
      }
      invalidateTerritoryOptions();
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save territory"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{territory ? "Edit Territory" : "Add Territory"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Field label="Territory name" required error={errors.name?.message}>
            <Input {...register("name")} placeholder="North Bangalore" />
          </Field>
          <Field label="Description">
            <Textarea rows={3} {...register("description")} placeholder="Coverage area, notes, etc." />
          </Field>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {territory ? "Save Changes" : "Create Territory"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
