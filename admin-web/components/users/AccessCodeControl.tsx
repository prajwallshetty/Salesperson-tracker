"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, RefreshCw, Power, Check, KeyRound } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Skeleton } from "@/components/Skeleton";

export interface AccessCodeInfo {
  salespersonId?: string;
  accessCode: string;
  accessCodeEnabled: boolean;
  accessCodeLastUsedAt: string | null;
}

interface AccessCodeControlProps {
  userId?: string;
  salespersonId?: string;
  initialCode?: string;
  compact?: boolean;
  onUpdate?: () => void;
}

export function AccessCodeControl({
  userId,
  salespersonId,
  initialCode,
  compact = false,
  onUpdate,
}: AccessCodeControlProps) {
  const [info, setInfo] = useState<AccessCodeInfo | null>(
    initialCode ? { accessCode: initialCode, accessCodeEnabled: true, accessCodeLastUsedAt: null } : null
  );
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(!initialCode);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const endpoint = userId ? `/users/${userId}/access-code` : `/salespersons/${salespersonId}/access-code`;

  useEffect(() => {
    if (!initialCode && (userId || salespersonId)) {
      if (!userId && !salespersonId) return;
      setLoading(true);
      api
        .get<AccessCodeInfo>(endpoint)
        .then((res) => setInfo(res.data))
        .catch((err) => toast.error(apiErrorMessage(err, "Failed to load access code")))
        .finally(() => setLoading(false));
    }
  }, [userId, salespersonId, initialCode, endpoint]);

  const load = () => {
    if (!userId && !salespersonId) return;
    setLoading(true);
    api
      .get<AccessCodeInfo>(endpoint)
      .then((res) => setInfo(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load access code")))
      .finally(() => setLoading(false));
  };

  const copyCode = async () => {
    if (!info?.accessCode) return;
    try {
      await navigator.clipboard.writeText(info.accessCode);
      setCopied(true);
      toast.success("✓ Access code copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await api.post<AccessCodeInfo>(`${endpoint}/regenerate`);
      setInfo(res.data);
      setShowCode(true); // Automatically reveal newly generated code for admin convenience
      toast.success("New access code generated successfully");
      setRegenerateOpen(false);
      onUpdate?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to regenerate access code"));
    } finally {
      setRegenerating(false);
    }
  };

  const toggleEnabled = async () => {
    if (!info) return;
    setToggling(true);
    try {
      const res = await api.patch<AccessCodeInfo>(endpoint, {
        enabled: !info.accessCodeEnabled,
      });
      setInfo(res.data);
      toast.success(res.data.accessCodeEnabled ? "Access code enabled" : "Access code disabled");
      onUpdate?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update access code"));
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <Skeleton className={compact ? "h-8 w-36" : "h-12 w-full"} />;
  }

  if (!info) {
    return (
      <Button variant="outline" size="sm" onClick={load}>
        <KeyRound className="size-3.5 mr-1" /> Generate Code
      </Button>
    );
  }

  const maskedCode = showCode
    ? info.accessCode
    : info.accessCode
    ? `${info.accessCode.substring(0, 3)}${"•".repeat(Math.max(0, info.accessCode.length - 3))}`
    : "SG-••••••";

  if (compact) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <Badge
            variant={info.accessCodeEnabled ? "success" : "muted"}
            dot
            className="font-mono text-xs tracking-wider"
          >
            {maskedCode}
          </Badge>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowCode(!showCode)}
            title={showCode ? "Hide code" : "Show code"}
          >
            {showCode ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </Button>

          <Button variant="ghost" size="icon-sm" onClick={copyCode} title="Copy code">
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sales App Access Code
          </span>
        </div>
        <Badge variant={info.accessCodeEnabled ? "success" : "danger"} dot>
          {info.accessCodeEnabled ? "Active" : "Disabled"}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3.5 py-2 font-mono text-sm font-bold tracking-widest text-foreground shadow-inner">
          <span>{maskedCode}</span>
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="text-muted-foreground hover:text-foreground transition-colors ml-1"
            title={showCode ? "Hide access code" : "Show access code"}
          >
            {showCode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        <Button variant="outline" size="sm" onClick={copyCode}>
          {copied ? <Check className="size-3.5 text-emerald-500 mr-1" /> : <Copy className="size-3.5 mr-1" />}
          {copied ? "Copied" : "Copy"}
        </Button>

        <Button variant="outline" size="sm" loading={regenerating} onClick={() => setRegenerateOpen(true)}>
          <RefreshCw className="size-3.5 mr-1" /> Regenerate
        </Button>

        <Button
          variant={info.accessCodeEnabled ? "destructive" : "success"}
          size="sm"
          loading={toggling}
          onClick={toggleEnabled}
        >
          <Power className="size-3.5 mr-1" /> {info.accessCodeEnabled ? "Disable" : "Enable"}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {info.accessCodeEnabled
          ? "Salesperson signs into the Sales App using this access code."
          : "Access code is currently disabled — this salesperson cannot log in."}
      </p>

      <ConfirmDialog
        open={regenerateOpen}
        title="Regenerate access code?"
        message="The current access code will stop working immediately. The salesperson will need to sign in with the new code."
        tone="danger"
        confirmLabel="Regenerate"
        onClose={() => setRegenerateOpen(false)}
        onConfirm={handleRegenerate}
      />
    </div>
  );
}
