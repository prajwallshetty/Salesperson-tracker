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
import { useTerritoryOptions } from "@/hooks/useTerritoryOptions";
import type { Salesperson } from "@/types";

const NONE = "__none__";

const schema = z
  .object({
    name: z.string().min(1, "Full name is required"),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z.string().min(6, "Minimum 6 characters"),
    phone: z.string().optional(),
    role: z.enum(["ADMIN", "SALESPERSON"]),
    employeeCode: z.string().optional(),
    territoryId: z.string().optional(),
    managerId: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.role === "SALESPERSON" && !v.employeeCode) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["employeeCode"], message: "Employee code is required for salespersons" });
    }
  });

type FormValues = z.infer<typeof schema>;

const emptyForm: FormValues = {
  name: "",
  email: "",
  password: "",
  phone: "",
  role: "SALESPERSON",
  employeeCode: "",
  territoryId: "",
  managerId: "",
};

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

// Create-only per API_CONTRACT.md — editing an existing user is limited to
// name/phone/isActive (role changes are rejected server-side once a Salesperson
// record exists), so this modal is only ever used for POST /api/users.
export function UserModal({ open, onClose, onCreated }: UserModalProps) {
  const territories = useTerritoryOptions();
  const [managers, setManagers] = useState<Salesperson[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyForm });

  const role = watch("role");

  useEffect(() => {
    if (!open) return;
    reset(emptyForm);
    api.get("/salespersons", { params: { pageSize: 100 } }).then((res) => setManagers(res.data.items ?? []));
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post("/users", {
        name: values.name,
        email: values.email,
        password: values.password || undefined,
        phone: values.phone || undefined,
        role: values.role,
        employeeCode: values.role === "SALESPERSON" ? values.employeeCode : undefined,
        territoryId: values.role === "SALESPERSON" ? values.territoryId || undefined : undefined,
        managerId: values.role === "SALESPERSON" ? values.managerId || undefined : undefined,
      });
      toast.success(`${values.role === "ADMIN" ? "Admin" : "Salesperson"} account created`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to create user"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>Create a new login. Salespersons also get a linked field-team record.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Field label="Role" required>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALESPERSON">Salesperson</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Field label="Full name" required error={errors.name?.message}>
              <Input {...register("name")} placeholder="Jane Doe" />
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
            {role === "SALESPERSON" && (
              <>
                <Field label="Employee code" required error={errors.employeeCode?.message}>
                  <Input {...register("employeeCode")} placeholder="SP009" />
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
              </>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
