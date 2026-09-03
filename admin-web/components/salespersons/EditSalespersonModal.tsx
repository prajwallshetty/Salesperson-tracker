"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { api, apiErrorMessage } from "@/lib/api";
import type { Salesperson, Territory } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Full name is required"),
  employeeCode: z.string().min(1, "Employee code is required"),
  phone: z.string().optional(),
  territoryId: z.string().optional(),
  managerId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
const NONE = "__none__";

interface EditSalespersonModalProps {
  open: boolean;
  salesperson: Salesperson | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditSalespersonModal({ open, salesperson, onClose, onSaved }: EditSalespersonModalProps) {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [managers, setManagers] = useState<Salesperson[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open || !salesperson) return;
    reset({
      name: salesperson.user.name,
      phone: salesperson.user.phone ?? "",
      employeeCode: salesperson.employeeCode,
      territoryId: salesperson.territoryId ?? "",
      managerId: salesperson.managerId ?? "",
    });
    api.get("/territories").then((res) => setTerritories(res.data ?? []));
    api
      .get("/salespersons?pageSize=100")
      .then((res) => setManagers((res.data.items ?? []).filter((m: Salesperson) => m.id !== salesperson.id)));
  }, [open, salesperson, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!salesperson) return;
    try {
      await api.patch(`/salespersons/${salesperson.id}`, {
        name: values.name,
        phone: values.phone || undefined,
        employeeCode: values.employeeCode,
        territoryId: values.territoryId || null,
        managerId: values.managerId || null,
      });
      toast.success("Salesperson updated");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update salesperson"));
    }
  };

  if (!salesperson) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Salesperson</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Field label="Full name" required error={errors.name?.message}>
              <Input {...register("name")} />
            </Field>
            <Field label="Employee code" required error={errors.employeeCode?.message}>
              <Input {...register("employeeCode")} />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <Input {...register("phone")} />
            </Field>
            <Field label="Territory">
              <Controller
                control={control}
                name="territoryId"
                render={({ field }) => (
                  <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Unassigned</SelectItem>
                      {territories.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Manager">
              <Controller
                control={control}
                name="managerId"
                render={({ field }) => (
                  <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {managers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>
          <DialogFooter className="mt-2">
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
