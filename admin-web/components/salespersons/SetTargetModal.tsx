"use client";

import { useEffect } from "react";
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
import { todayIso } from "@/lib/format";

const schema = z.object({
  period: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  periodStart: z.string().min(1, "Start date is required"),
  periodEnd: z.string().min(1, "End date is required"),
  targetAmount: z
    .string()
    .min(1, "Target amount is required")
    .refine((v) => Number(v) > 0, "Enter an amount greater than 0"),
});

type FormValues = z.infer<typeof schema>;

interface SetTargetModalProps {
  open: boolean;
  salespersonId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function SetTargetModal({ open, salespersonId, onClose, onSaved }: SetTargetModalProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { period: "MONTHLY", periodStart: todayIso(), periodEnd: todayIso(), targetAmount: "" },
  });

  useEffect(() => {
    if (open) reset({ period: "MONTHLY", periodStart: todayIso(), periodEnd: todayIso(), targetAmount: "" });
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post(`/salespersons/${salespersonId}/targets`, {
        period: values.period,
        periodStart: new Date(values.periodStart).toISOString(),
        periodEnd: new Date(values.periodEnd).toISOString(),
        targetAmount: Number(values.targetAmount),
      });
      toast.success("Target set successfully");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to set target"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Target</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Field label="Period" required>
            <Controller
              control={control}
              name="period"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date" required error={errors.periodStart?.message}>
              <Input type="date" {...register("periodStart")} />
            </Field>
            <Field label="End date" required error={errors.periodEnd?.message}>
              <Input type="date" {...register("periodEnd")} />
            </Field>
          </div>
          <Field label="Target amount (₹)" required error={errors.targetAmount?.message}>
            <Input type="number" min={1} step="0.01" {...register("targetAmount")} placeholder="100000" />
          </Field>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Set Target
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
