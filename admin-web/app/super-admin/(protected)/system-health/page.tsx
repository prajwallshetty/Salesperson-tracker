"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HeartPulse, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { platformApi } from "@/lib/platformApi";
import { apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/Skeleton";
import { formatDateTime } from "@/lib/format";
import type { PlatformSystemHealth } from "@/types";

const STATUS_META = {
  healthy: { variant: "success" as const, icon: CheckCircle2, label: "Healthy" },
  degraded: { variant: "warning" as const, icon: AlertTriangle, label: "Degraded" },
  down: { variant: "danger" as const, icon: XCircle, label: "Down" },
};

export default function SuperAdminSystemHealthPage() {
  const [data, setData] = useState<PlatformSystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    platformApi
      .get("/system-health")
      .then((res) => setData(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load system health")))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="System Health"
        description="Live status of the services this platform depends on."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} /> Refresh
          </Button>
        }
      />

      {loading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              {(() => {
                const meta = STATUS_META[data.overall];
                const Icon = meta.icon;
                return (
                  <>
                    <Icon className={data.overall === "healthy" ? "size-6 text-success" : data.overall === "degraded" ? "size-6 text-warning" : "size-6 text-danger"} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Overall: {meta.label}</p>
                      <p className="text-xs text-muted-foreground">Checked {formatDateTime(data.checkedAt)} · {data.environment}</p>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {data.services.map((s) => {
              const meta = STATUS_META[s.status];
              return (
                <Card key={s.name}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{s.name}</p>
                      <Badge variant={meta.variant} dot>
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{s.detail}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
