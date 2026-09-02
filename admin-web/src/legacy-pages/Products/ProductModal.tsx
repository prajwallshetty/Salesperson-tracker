import { useEffect, useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { Modal } from "../../components/Modal";
import { FieldWrap, TextField, TextArea } from "../../components/FormField";
import { IconImage } from "../../components/icons";
import { api, apiErrorMessage } from "../../lib/api";
import type { Product } from "../../types";

interface ProductModalProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  unit: "",
  price: "",
  taxPercent: "",
  discountPercent: "0",
  description: "",
};

export function ProductModal({ open, product, onClose, onSaved }: ProductModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setImageFile(null);
    if (product) {
      setForm({
        name: product.name,
        sku: product.sku,
        category: product.category,
        unit: product.unit,
        price: String(product.price),
        taxPercent: String(product.taxPercent),
        discountPercent: String(product.discountPercent),
        description: product.description ?? "",
      });
      setPreview(product.imageUrl);
    } else {
      setForm(emptyForm);
      setPreview(null);
    }
  }, [open, product]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        category: form.category,
        unit: form.unit,
        price: Number(form.price),
        taxPercent: Number(form.taxPercent),
        discountPercent: Number(form.discountPercent || 0),
        description: form.description || undefined,
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
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={product ? "Edit Product" : "Add Product"} width="max-w-2xl">
      <form onSubmit={onSubmit}>
        <div className="mb-4 flex items-center gap-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-brand-400 hover:text-brand-500"
          >
            {preview ? (
              <img src={preview} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <IconImage className="h-7 w-7" />
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Upload image
            </button>
            <p className="mt-1 text-xs text-slate-400">PNG or JPG, uploaded on save.</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <FieldWrap label="Product name" required>
            <TextField required value={form.name} onChange={set("name")} placeholder="Green Tea 100 bags" />
          </FieldWrap>
          <FieldWrap label="SKU" required>
            <TextField required value={form.sku} onChange={set("sku")} placeholder="SKU-1011" />
          </FieldWrap>
          <FieldWrap label="Category" required>
            <TextField required value={form.category} onChange={set("category")} placeholder="Beverages" />
          </FieldWrap>
          <FieldWrap label="Unit" required>
            <TextField required value={form.unit} onChange={set("unit")} placeholder="Box / Case (48)" />
          </FieldWrap>
          <FieldWrap label="Price (₹)" required>
            <TextField type="number" step="0.01" required min={0} value={form.price} onChange={set("price")} />
          </FieldWrap>
          <FieldWrap label="Tax %" required>
            <TextField type="number" step="0.01" required min={0} value={form.taxPercent} onChange={set("taxPercent")} />
          </FieldWrap>
          <FieldWrap label="Discount %">
            <TextField type="number" step="0.01" min={0} value={form.discountPercent} onChange={set("discountPercent")} />
          </FieldWrap>
        </div>
        <FieldWrap label="Description">
          <TextArea rows={3} value={form.description} onChange={set("description")} placeholder="Short product description" />
        </FieldWrap>

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Saving..." : product ? "Save Changes" : "Create Product"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
