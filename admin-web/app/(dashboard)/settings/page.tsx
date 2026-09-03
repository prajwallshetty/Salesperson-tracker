"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconLogout } from "@/components/icons";
import type { AuthUser } from "@/types";

export default function SettingsPage() {
  const router = useRouter();
  const storedUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [me, setMe] = useState<AuthUser | null>(storedUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setMe(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load profile")))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader title="Settings" description="Your account details." />

      <Card>
        <CardContent className="p-5">
          {loading && !me ? (
            <div className="flex items-center gap-4">
              <Skeleton className="size-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ) : me ? (
            <>
              <div className="flex items-center gap-4">
                <Avatar name={me.name} src={me.avatarUrl} size="lg" />
                <div>
                  <p className="text-lg font-semibold text-foreground">{me.name}</p>
                  <p className="text-sm text-muted-foreground">{me.email}</p>
                </div>
              </div>
              <div className="mt-5 space-y-0.5">
                <InfoRow label="Role" value={me.role} />
                <InfoRow label="Email" value={me.email} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load your profile.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="mb-1 text-sm font-semibold text-foreground">Session</p>
          <p className="mb-4 text-sm text-muted-foreground">Sign out of the admin dashboard on this device.</p>
          <Button variant="destructive" onClick={handleLogout}>
            <IconLogout className="size-4" /> Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-2.5 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
