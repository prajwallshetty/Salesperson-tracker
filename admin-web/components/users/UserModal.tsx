"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, Check, Sparkles } from "lucide-react";
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
    password: z.string().optional(),
    phone: z.string().optional(),
    role: z.enum(["ADMIN", "SALESPERSON"]),
    employeeCode: z.string().optional(),
    territoryId: z.string().optional(),
    managerId: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.role === "ADMIN" && (!v.password || v.password.length < 6)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Password (minimum 6 characters) is required for Admin" });
    }
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

export function UserModal({ open, onClose, onCreated }: UserModalProps) {
  const territories = useTerritoryOptions();
  const [managers, setManagers] = useState<Salesperson[]>([]);
  const [createdInfo, setCreatedInfo] = useState<{ name: string; accessCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

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
    setCreatedInfo(null);
    setCopied(false);
    api.get("/salespersons", { params: { pageSize: 100 } }).then((res) => setManagers(res.data.items ?? []));
  }, [open, reset]);

  const handleCopy = async () => {
    if (!createdInfo?.accessCode) return;
    try {
      await navigator.clipboard.writeText(createdInfo.accessCode);
      setCopied(true);
      toast.success("✓ Access code copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleFinish = () => {
    setCreatedInfo(null);
    onCreated();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await api.post("/users", {
        name: values.name,
        email: values.email,
        password: values.password || undefined,
        phone: values.phone || undefined,
        role: values.role,
        employeeCode: values.role === "SALESPERSON" ? values.employeeCode : undefined,
        territoryId: values.role === "SALESPERSON" ? values.territoryId || undefined : undefined,
        managerId: values.role === "SALESPERSON" ? values.managerId || undefined : undefined,
      });

      const code = res.data?.salesperson?.accessCode;
      if (values.role === "SALESPERSON" && code) {
        setCreatedInfo({ name: values.name, accessCode: code });
        toast.success("Salesperson account created with access code!");
      } else {
        toast.success("Admin account created successfully");
        onCreated();
        onClose();
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to create user"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleFinish()}>
      <DialogContent className="max-w-xl">
        {createdInfo ? (
          <div className="py-4 space-y-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <Sparkles className="size-6" />
            </div>

            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold">Access Code Generated Successfully!</DialogTitle>
              <DialogDescription>
                Account created for <span className="font-semibold text-foreground">{createdInfo.name}</span>. Provide this access code to the salesperson to log into the Sales App.
              </DialogDescription>
            </div>

            <div className="mx-auto max-w-sm rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-xs space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Salesperson Access Code
              </span>
              <div className="font-mono text-2xl font-black tracking-widest text-primary">
                {createdInfo.accessCode}
              </div>
              <Button onClick={handleCopy} className="w-full shadow-xs">
                {copied ? <Check className="size-4 mr-2" /> : <Copy className="size-4 mr-2" />}
                {copied ? "Copied to Clipboard!" : "Copy Access Code"}
              </Button>
            </div>

            <DialogFooter className="justify-center sm:justify-center">
              <Button variant="secondary" onClick={handleFinish} className="px-8">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
              <DialogDescription>
                Create a new account. Salespersons log in using an Access Code (no password required).
              </DialogDescription>
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
                        <SelectItem value="SALESPERSON">Salesperson (Access Code login)</SelectItem>
                        <SelectItem value="ADMIN">Admin (Password login)</SelectItem>
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

                {role === "ADMIN" && (
                  <Field label="Password" required error={errors.password?.message} hint="Min 6 characters">
                    <Input type="password" {...register("password")} placeholder="••••••••" />
                  </Field>
                )}

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

                    <Field label="Reporting Manager" hint="Optional manager">
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

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

