"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { api, apiErrorMessage } from "@/lib/api";
import type { Salesperson, Territory } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Full name is required"),
  employeeCode: z.string().min(1, "Employee code is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(6, "Minimum 6 characters"),
  phone: z.string().optional(),
  territoryId: z.string().optional(),
  managerId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = { name: "", email: "", password: "", phone: "", employeeCode: "", territoryId: "", managerId: "" };
const NONE = "__none__";

interface AddSalespersonModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddSalespersonModal({ open, onClose, onCreated }: AddSalespersonModalProps) {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [managers, setManagers] = useState<Salesperson[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  useEffect(() => {
    if (!open) return;
    reset(DEFAULTS);
    api.get("/territories").then((res) => setTerritories(res.data ?? []));
    api.get("/salespersons?pageSize=100").then((res) => setManagers(res.data.items ?? []));
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post("/salespersons", {
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
        employeeCode: values.employeeCode,
        territoryId: values.territoryId || undefined,
        managerId: values.managerId || undefined,
      });
      toast.success("Salesperson created");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to create salesperson"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Salesperson</DialogTitle>
          <DialogDescription>Create a login for a new field sales team member.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Field label="Full name" required error={errors.name?.message}>
              <Input {...register("name")} placeholder="Jane Doe" />
            </Field>
            <Field label="Employee code" required error={errors.employeeCode?.message}>
              <Input {...register("employeeCode")} placeholder="SP009" />
            </Field>
            <Field label="Email" required error={errors.email?.message}>
              <Input type="email" {...register("email")} placeholder="jane@company.com" />
            </Field>
            <Field label="Password" required error={errors.password?.message} hint="Min 6 characters">
              <Input type="password" {...register("password")} placeholder="••••••••" />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <Input {...register("phone")} placeholder="+91 90000 00000" />
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
            <Field label="Manager" hint="Optional reporting manager">
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
              Create Salesperson
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
