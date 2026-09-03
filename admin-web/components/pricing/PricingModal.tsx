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
import type { Customer, PriceListEntry, Product } from "@/types";

const NONE = "__none__";

const schema = z
  .object({
    productId: z.string().min(1, "Select a product"),
    territoryId: z.string().optional(),
    customerId: z.string().optional(),
    price: z.string().min(1, "Price is required").refine((v) => Number(v) >= 0, "Enter a valid price"),
    discountPercent: z.string().refine((v) => v === "" || (Number(v) >= 0 && Number(v) <= 100), "0-100"),
    taxPercent: z.string().refine((v) => v === "" || (Number(v) >= 0 && Number(v) <= 100), "0-100"),
    effectiveFrom: z.string().min(1, "Start date is required"),
    effectiveTo: z.string().optional(),
  })
  .refine((v) => !v.effectiveTo || v.effectiveTo >= v.effectiveFrom, {
    message: "End date must be on or after the start date",
    path: ["effectiveTo"],
  });

type FormValues = z.infer<typeof schema>;

const emptyForm: FormValues = {
  productId: "",
  territoryId: "",
  customerId: "",
  price: "",
  discountPercent: "0",
  taxPercent: "0",
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: "",
};

interface PricingModalProps {
  open: boolean;
  entry: PriceListEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

export function PricingModal({ open, entry, onClose, onSaved }: PricingModalProps) {
  const territories = useTerritoryOptions();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyForm });

  useEffect(() => {
    if (!open) return;
    api.get("/products", { params: { pageSize: 200, isActive: "true" } }).then((res) => setProducts(res.data.items ?? []));
    api.get("/customers", { params: { pageSize: 200 } }).then((res) => setCustomers(res.data.items ?? res.data ?? []));
    if (entry) {
      reset({
        productId: entry.productId,
        territoryId: entry.territoryId ?? "",
        customerId: entry.customerId ?? "",
        price: String(entry.price),
        discountPercent: String(entry.discountPercent),
        taxPercent: String(entry.taxPercent),
        effectiveFrom: entry.effectiveFrom.slice(0, 10),
        effectiveTo: entry.effectiveTo ? entry.effectiveTo.slice(0, 10) : "",
      });
    } else {
      reset(emptyForm);
    }
  }, [open, entry, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        productId: values.productId,
        territoryId: values.territoryId || undefined,
        customerId: values.customerId || undefined,
        price: Number(values.price),
        discountPercent: Number(values.discountPercent || 0),
        taxPercent: Number(values.taxPercent || 0),
        effectiveFrom: new Date(values.effectiveFrom).toISOString(),
        effectiveTo: values.effectiveTo ? new Date(values.effectiveTo).toISOString() : undefined,
      };
      if (entry) {
        await api.patch(`/pricing/${entry.id}`, payload);
        toast.success("Price list entry updated");
      } else {
        await api.post("/pricing", payload);
        toast.success("Price list entry created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save price list entry"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit Price Override" : "Add Price Override"}</DialogTitle>
          <DialogDescription>
            More specific scopes win: customer &gt; territory &gt; generic override &gt; product default.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Field label="Product" required error={errors.productId?.message}>
            <Controller
              control={control}
              name="productId"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Field label="Territory scope" hint="Optional — leave unscoped to apply generically">
              <Controller
                control={control}
                name="territoryId"
                render={({ field }) => (
                  <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any territory" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Any territory</SelectItem>
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
            <Field label="Customer scope" hint="Optional — most specific, wins over territory">
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Any customer</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
            <Field label="Price (₹)" required error={errors.price?.message}>
              <Input type="number" step="0.01" min={0} {...register("price")} />
            </Field>
            <Field label="Discount %" error={errors.discountPercent?.message}>
              <Input type="number" step="0.01" min={0} max={100} {...register("discountPercent")} />
            </Field>
            <Field label="Tax %" error={errors.taxPercent?.message}>
              <Input type="number" step="0.01" min={0} max={100} {...register("taxPercent")} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Field label="Effective from" required error={errors.effectiveFrom?.message}>
              <Input type="date" {...register("effectiveFrom")} />
            </Field>
            <Field label="Effective to" hint="Optional — leave blank for no end date" error={errors.effectiveTo?.message}>
              <Input type="date" {...register("effectiveTo")} />
            </Field>
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {entry ? "Save Changes" : "Create Override"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
