"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { api, apiErrorMessage } from "@/lib/api";
import type { Category } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const emptyForm: FormValues = { name: "", description: "", isActive: true };

interface CategoryModalProps {
  open: boolean;
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}

export function CategoryModal({ open, category, onClose, onSaved }: CategoryModalProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyForm });

  useEffect(() => {
    if (!open) return;
    if (category) {
      reset({ name: category.name, description: category.description ?? "", isActive: category.isActive });
    } else {
      reset(emptyForm);
    }
  }, [open, category, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (category) {
        await api.patch(`/categories/${category.id}`, {
          name: values.name,
          description: values.description || undefined,
        });
        if (values.isActive !== category.isActive) {
          await api.patch(`/categories/${category.id}/status`, { isActive: values.isActive });
        }
        toast.success("Category updated");
      } else {
        await api.post("/categories", {
          name: values.name,
          description: values.description || undefined,
        });
        toast.success("Category created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save category"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Field label="Category name" required error={errors.name?.message}>
            <Input {...register("name")} placeholder="Beverages" />
          </Field>
          <Field label="Description">
            <Textarea rows={3} {...register("description")} placeholder="Short description shown to the team" />
          </Field>
          {category && (
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <label className="mb-1 flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/60 px-3.5 py-2.5">
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                  <Label className="cursor-pointer">Active</Label>
                </label>
              )}
            />
          )}
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {category ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
