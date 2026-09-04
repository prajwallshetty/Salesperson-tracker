"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw, Power, KeyRound } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatDateTime } from "@/lib/format";

interface AccessCodeInfo {
  accessCode: string;
  accessCodeEnabled: boolean;
  accessCodeLastUsedAt: string | null;
}

// Salesperson-app login uses this code instead of email/password (see server's
// POST /auth/access-code-login). Only an authenticated admin can view/regenerate/disable it -
// every other endpoint that returns a Salesperson strips this field before it reaches the
// browser (server/src/middleware/redactAccessCode.ts).
export function AccessCodeCard({ salespersonId }: { salespersonId: string }) {
  const [info, setInfo] = useState<AccessCodeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get<AccessCodeInfo>(`/salespersons/${salespersonId}/access-code`)
      .then((res) => setInfo(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load access code")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [salespersonId]);

  const copyCode = async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.accessCode);
      toast.success("Access code copied");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const regenerate = async () => {
    try {
      const res = await api.post<AccessCodeInfo>(`/salespersons/${salespersonId}/access-code/regenerate`);
      setInfo(res.data);
      toast.success("New access code generated");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to regenerate access code"));
    }
  };

  const toggleEnabled = async () => {
    if (!info) return;
    setToggling(true);
    try {
      const res = await api.patch<AccessCodeInfo>(`/salespersons/${salespersonId}/access-code`, {
        enabled: !info.accessCodeEnabled,
      });
      setInfo(res.data);
      toast.success(res.data.accessCodeEnabled ? "Access code enabled" : "Access code disabled");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update access code"));
    } finally {
      setToggling(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Sales App Access Code</p>
        </div>

        {loading ? (
          <Skeleton className="h-12 w-full" />
        ) : !info ? (
          <p className="text-sm text-muted-foreground">Couldn&apos;t load access code.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-muted px-3 py-2 text-base font-bold tracking-widest text-foreground">
                {info.accessCode}
              </code>
              <Button variant="outline" size="sm" onClick={copyCode}>
                <Copy /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRegenerateOpen(true)}>
                <RefreshCw /> Regenerate
              </Button>
              <Button
                variant={info.accessCodeEnabled ? "destructive" : "success"}
                size="sm"
                loading={toggling}
                onClick={toggleEnabled}
              >
                <Power /> {info.accessCodeEnabled ? "Disable" : "Enable"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {info.accessCodeEnabled ? "Active" : "Disabled — this salesperson cannot sign in"} &middot; Last used{" "}
              {info.accessCodeLastUsedAt ? formatDateTime(info.accessCodeLastUsedAt) : "never"}
            </p>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={regenerateOpen}
        title="Regenerate access code?"
        message="The current code will stop working immediately. Share the new code with the salesperson."
        tone="danger"
        confirmLabel="Regenerate"
        onClose={() => setRegenerateOpen(false)}
        onConfirm={regenerate}
      />
    </Card>
  );
}
