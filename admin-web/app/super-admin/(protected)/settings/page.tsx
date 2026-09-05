"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { platformApi } from "@/lib/platformApi";
import { apiErrorMessage } from "@/lib/api";
import { usePlatformAuthStore } from "@/store/platformAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SuperAdminSettingsPage() {
  const admin = usePlatformAuthStore((s) => s.admin);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await platformApi.patch("/me/password", { currentPassword, newPassword });
      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update password"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader title="Settings" description="Your platform admin account." />

      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-foreground">{admin?.name}</p>
          <p className="text-sm text-muted-foreground">{admin?.email}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="mb-1 text-sm font-semibold text-foreground">Change password</p>
          <p className="mb-4 text-sm text-muted-foreground">Changing this signs you out of every other session.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Current password</Label>
              <Input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <Label>New password</Label>
              <Input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <Button type="submit" loading={busy}>
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
