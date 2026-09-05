"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { platformApi } from "@/lib/platformApi";
import { apiErrorMessage } from "@/lib/api";
import type { PlatformPlan } from "@/types";

interface CreateTenantDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const EMPTY_FORM = { companyName: "", slug: "", adminName: "", adminEmail: "", adminPhone: "", planKey: "", billingInterval: "MONTHLY" as "MONTHLY" | "YEARLY", trialDays: "" };

export function CreateTenantDialog({ open, onClose, onCreated }: CreateTenantDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setResult(null);
    setCopied(false);
    platformApi
      .get("/plans")
      .then((res) => setPlans((res.data as PlatformPlan[]).filter((p) => p.isActive)))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load plans")));
  }, [open]);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await platformApi.post("/tenants", {
        companyName: form.companyName,
        slug: form.slug || undefined,
        adminName: form.adminName,
        adminEmail: form.adminEmail,
        adminPhone: form.adminPhone || undefined,
        planKey: form.planKey,
        billingInterval: form.billingInterval,
        trialDays: form.trialDays ? Number(form.trialDays) : undefined,
      });
      setResult({ email: res.data.adminEmail, tempPassword: res.data.tempPassword });
      onCreated();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to create tenant"));
    } finally {
      setBusy(false);
    }
  };

  const copyPassword = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy - select and copy manually");
    }
  };

  const canSubmit = form.companyName.trim() && form.adminName.trim() && form.adminEmail.trim() && form.planKey;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-lg">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Tenant created</DialogTitle>
              <DialogDescription>Share this temporary password with the admin through your own secure channel - it won&apos;t be shown again.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Admin email</Label>
                <Input readOnly value={result.email} className="font-mono text-sm" />
              </div>
              <div>
                <Label>Temporary password</Label>
                <div className="flex gap-2">
                  <Input readOnly value={result.tempPassword} className="font-mono text-sm" />
                  <Button type="button" variant="outline" size="icon" onClick={copyPassword}>
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={onClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create tenant</DialogTitle>
              <DialogDescription>For support/sales-assisted onboarding. The plan and price are always resolved from the database.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Company name</Label>
                <Input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} placeholder="Prestige Distributors" />
              </div>
              <div className="sm:col-span-2">
                <Label>Workspace slug (optional)</Label>
                <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="Auto-generated if left blank" />
              </div>
              <div>
                <Label>Admin name</Label>
                <Input value={form.adminName} onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))} />
              </div>
              <div>
                <Label>Admin email</Label>
                <Input type="email" value={form.adminEmail} onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))} />
              </div>
              <div>
                <Label>Admin phone (optional)</Label>
                <Input value={form.adminPhone} onChange={(e) => setForm((f) => ({ ...f, adminPhone: e.target.value }))} />
              </div>
              <div>
                <Label>Plan</Label>
                <select
                  value={form.planKey}
                  onChange={(e) => setForm((f) => ({ ...f, planKey: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select a plan...</option>
                  {plans.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name} (₹{p.monthlyPrice}/mo)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Billing interval</Label>
                <select
                  value={form.billingInterval}
                  onChange={(e) => setForm((f) => ({ ...f, billingInterval: e.target.value as "MONTHLY" | "YEARLY" }))}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              <div>
                <Label>Trial days (optional)</Label>
                <Input type="number" value={form.trialDays} onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))} placeholder="Uses plan default" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button type="button" onClick={submit} loading={busy} disabled={!canSubmit}>
                Create tenant
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
