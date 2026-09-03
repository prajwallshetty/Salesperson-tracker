"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { api, apiErrorMessage, assetUrl } from "@/lib/api";
import type { Product } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().min(1, "Category is required"),
  unit: z.string().min(1, "Unit is required"),
  price: z.string().min(1, "Price is required").refine((v) => Number(v) >= 0, "Enter a valid price"),
  taxPercent: z.string().min(1, "Tax % is required").refine((v) => Number(v) >= 0, "Enter a valid tax %"),
  discountPercent: z.string().refine((v) => v === "" || Number(v) >= 0, "Enter a valid discount %"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const emptyForm: FormValues = {
  name: "",
  sku: "",
  category: "",
  unit: "",
  price: "",
  taxPercent: "",
  discountPercent: "0",
  description: "",
};

interface ProductModalProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProductModal({ open, product, onClose, onSaved }: ProductModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyForm });

  useEffect(() => {
    if (!open) return;
    setImageFile(null);
    if (product) {
      reset({
        name: product.name,
        sku: product.sku,
        category: product.category,
        unit: product.unit,
        price: String(product.price),
        taxPercent: String(product.taxPercent),
        discountPercent: String(product.discountPercent),
        description: product.description ?? "",
      });
      setPreview(assetUrl(product.imageUrl));
    } else {
      reset(emptyForm);
      setPreview(null);
    }
  }, [open, product, reset]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const uploadImage = async (productId: string) => {
    if (!imageFile) return;
    const fd = new FormData();
    fd.append("image", imageFile);
    await api.post(`/products/${productId}/image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        name: values.name,
        sku: values.sku,
        category: values.category,
        unit: values.unit,
        price: Number(values.price),
        taxPercent: Number(values.taxPercent),
        discountPercent: Number(values.discountPercent || 0),
        description: values.description || undefined,
      };
      if (product) {
        await api.patch(`/products/${product.id}`, payload);
        await uploadImage(product.id);
        toast.success("Product updated");
      } else {
        const res = await api.post("/products", payload);
        const created: Product = res.data;
        await uploadImage(created.id);
        toast.success("Product created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save product"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4 flex items-center gap-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="flex size-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-input bg-muted/40 text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="size-7" />
              )}
            </div>
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                Upload image
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">PNG or JPG, uploaded on save.</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Field label="Product name" required error={errors.name?.message}>
              <Input {...register("name")} placeholder="Green Tea 100 bags" />
            </Field>
            <Field label="SKU" required error={errors.sku?.message}>
              <Input {...register("sku")} placeholder="SKU-1011" />
            </Field>
            <Field label="Category" required error={errors.category?.message}>
              <Input {...register("category")} placeholder="Beverages" />
            </Field>
            <Field label="Unit" required error={errors.unit?.message}>
              <Input {...register("unit")} placeholder="Box / Case (48)" />
            </Field>
            <Field label="Price (₹)" required error={errors.price?.message}>
              <Input type="number" step="0.01" min={0} {...register("price")} />
            </Field>
            <Field label="Tax %" required error={errors.taxPercent?.message}>
              <Input type="number" step="0.01" min={0} {...register("taxPercent")} />
            </Field>
            <Field label="Discount %" error={errors.discountPercent?.message}>
              <Input type="number" step="0.01" min={0} {...register("discountPercent")} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea rows={3} {...register("description")} placeholder="Short product description" />
          </Field>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {product ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
