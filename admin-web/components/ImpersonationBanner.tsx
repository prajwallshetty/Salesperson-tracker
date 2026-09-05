"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";

/**
 * Persistent, impossible-to-miss banner shown for the whole lifetime of an Owner "Login as
 * tenant" session (see /super-admin/tenants/[id] and POST /api/platform/tenants/:id/impersonate).
 * Its presence is driven entirely by GET /auth/me's `impersonation` field, itself derived
 * server-side from a claim baked into the session JWT at mint time - never something this
 * component decides or a browser value it trusts on its own.
 */
export function ImpersonationBanner() {
  const [ending, setEnding] = useState(false);

  const exit = async () => {
    setEnding(true);
    try {
      await api.post("/auth/impersonation/end");
      window.location.href = "/super-admin/tenants";
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't end impersonation"));
      setEnding(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 bg-warning px-4 py-2 text-sm font-semibold text-warning-foreground">
      <span className="flex items-center gap-2">
        <ShieldAlert className="size-4 shrink-0" /> OWNER IMPERSONATION MODE - you are viewing this workspace as its admin
      </span>
      <button
        type="button"
        onClick={exit}
        disabled={ending}
        className="shrink-0 rounded-full bg-black/10 px-3 py-1 text-xs font-bold uppercase tracking-wide hover:bg-black/20 disabled:opacity-60"
      >
        {ending ? "Exiting..." : "Exit impersonation"}
      </button>
    </div>
  );
}
