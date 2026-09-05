"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { platformApi } from "@/lib/platformApi";
import { apiErrorMessage } from "@/lib/api";
import type { PlatformPlan } from "@/types";

const FEATURE_KEYS = ["gpsTracking", "liveTracking", "routeHistory", "targets", "territories", "reports", "quotations", "orders", "collections"] as const;

interface PlanFormDialogProps {
  open: boolean;
  onClose: () => void;
  plan: PlatformPlan | null; // null = create
  onSaved: () => void;
}

export function PlanFormDialog({ open, onClose, plan, onSaved }: PlanFormDialogProps) {
  const [form, setForm] = useState({
    key: "",
    name: "",
    description: "",
    monthlyPrice: "",
    annualPrice: "",
    maxSalespersons: "",
    maxAdmins: "",
    trialDays: "14",
    isActive: true,
    features: {} as Record<string, boolean>,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (plan) {
      setForm({
        key: plan.key,
        name: plan.name,
        description: plan.description ?? "",
        monthlyPrice: String(plan.monthlyPrice),
        annualPrice: plan.annualPrice != null ? String(plan.annualPrice) : "",
        maxSalespersons: String(plan.maxSalespersons),
        maxAdmins: String(plan.maxAdmins),
        trialDays: String(plan.trialDays),
        isActive: plan.isActive,
        features: { ...plan.features },
      });
    } else {
      setForm({ key: "", name: "", description: "", monthlyPrice: "", annualPrice: "", maxSalespersons: "", maxAdmins: "", trialDays: "14", isActive: true, features: {} });
    }
  }, [open, plan]);

  const submit = async () => {
    setBusy(true);
    try {
      const body = {
        name: form.name,
        description: form.description || undefined,
        monthlyPrice: Number(form.monthlyPrice),
        annualPrice: form.annualPrice ? Number(form.annualPrice) : null,
        maxSalespersons: Number(form.maxSalespersons),
        maxAdmins: Number(form.maxAdmins),
        trialDays: Number(form.trialDays),
        isActive: form.isActive,
        features: form.features,
      };
      if (plan) {
        await platformApi.patch(`/plans/${plan.id}`, body);
        toast.success("Plan updated.");
      } else {
        await platformApi.post("/plans", { ...body, key: form.key.toUpperCase().trim() });
        toast.success("Plan created.");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save plan"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{plan ? `Edit ${plan.name}` : "Create plan"}</DialogTitle>
          <DialogDescription>Pricing and limits here are the single source of truth used by the landing page and every enforcement check.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!plan && (
            <div>
              <Label>Key (e.g. GROWTH)</Label>
              <Input value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} placeholder="GROWTH" />
            </div>
          )}
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
          </div>
          <div>
            <Label>Monthly price (INR)</Label>
            <Input type="number" value={form.monthlyPrice} onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: e.target.value }))} />
          </div>
          <div>
            <Label>Annual price (INR, optional)</Label>
            <Input type="number" value={form.annualPrice} onChange={(e) => setForm((f) => ({ ...f, annualPrice: e.target.value }))} />
          </div>
          <div>
            <Label>Max salespeople</Label>
            <Input type="number" value={form.maxSalespersons} onChange={(e) => setForm((f) => ({ ...f, maxSalespersons: e.target.value }))} />
          </div>
          <div>
            <Label>Max admin seats</Label>
            <Input type="number" value={form.maxAdmins} onChange={(e) => setForm((f) => ({ ...f, maxAdmins: e.target.value }))} />
          </div>
          <div>
            <Label>Trial days</Label>
            <Input type="number" value={form.trialDays} onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox checked={form.isActive} onCheckedChange={(c) => setForm((f) => ({ ...f, isActive: c === true }))} id="plan-active" />
            <Label htmlFor="plan-active" className="cursor-pointer">
              Active (visible on pricing / selectable at signup)
            </Label>
          </div>

          <div className="sm:col-span-2">
            <Label className="mb-2 block">Features</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FEATURE_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!form.features[key]}
                    onCheckedChange={(c) => setForm((f) => ({ ...f, features: { ...f.features, [key]: c === true } }))}
                  />
                  {key}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} loading={busy}>
            {plan ? "Save changes" : "Create plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
