"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowRightLeft, Plus, Target } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { GeoError, friendlyGeoErrorMessage, getCurrentPosition } from "@/lib/geolocation";
import type { Lead, LeadStatus } from "@/types";

const STATUS_OPTIONS: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "CONVERTED", "LOST"];

const STATUS_VARIANT: Record<LeadStatus, "muted" | "info" | "default" | "warning" | "success" | "danger"> = {
  NEW: "muted",
  CONTACTED: "info",
  QUALIFIED: "default",
  NEGOTIATION: "warning",
  CONVERTED: "success",
  LOST: "danger",
};

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api
      .get<Lead[]>("/leads")
      .then((res) => setLeads(res.data))
      .catch((err) => toast.error(apiErrorMessage(err, "Could not load leads")))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function updateStatus(lead: Lead, status: LeadStatus) {
    try {
      const res = await api.patch<Lead>(`/leads/${lead.id}`, { status });
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? res.data : l)));
      toast.success("Lead updated");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not update lead"));
    }
  }

  async function convertLead(lead: Lead) {
    setConvertingId(lead.id);
    try {
      const point = await getCurrentPosition().catch((err) => {
        if (err instanceof GeoError) {
          toast(friendlyGeoErrorMessage(err.kind) + " Converting without precise coordinates.");
        }
        return null;
      });
      const res = await api.post(`/leads/${lead.id}/convert`, point ? { lat: point.lat, lng: point.lng } : {});
      toast.success(`${lead.name} converted to a customer`);
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: "CONVERTED" } : l)));
      router.push(`/customers/${res.data.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not convert lead"));
    } finally {
      setConvertingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Leads & Follow-ups"
        right={
          <Button size="icon" className="h-9 w-9 rounded-full" onClick={() => setShowCreate(true)} aria-label="Add lead">
            <Plus className="h-5 w-5" />
          </Button>
        }
      />
      <div className="px-4 pt-4">
        <div className="mb-4">
          <SegmentedControl
            value="leads"
            onChange={(v) => v === "followups" && router.push("/follow-ups")}
            options={[
              { value: "leads", label: "Leads" },
              { value: "followups", label: "Follow-ups" },
            ]}
          />
        </div>

        {loading ? (
          <SkeletonList count={4} />
        ) : leads.length === 0 ? (
          <EmptyState
            icon={<Target />}
            title="No leads yet"
            message="Add a new lead to start tracking your pipeline."
            action={<Button onClick={() => setShowCreate(true)}>Add Lead</Button>}
          />
        ) : (
          <ul className="space-y-3">
            {leads.map((lead) => (
              <li key={lead.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.company || lead.phone || lead.email || "—"}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[lead.status]} className="shrink-0">
                    {lead.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {lead.notes && <p className="mt-2 text-xs text-muted-foreground">{lead.notes}</p>}
                <p className="mt-2 text-[11px] text-muted-foreground">Added {format(new Date(lead.createdAt), "d MMM yyyy")}</p>

                {lead.status !== "CONVERTED" && lead.status !== "LOST" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Select value={lead.status} onValueChange={(v) => updateStatus(lead, v as LeadStatus)}>
                      <SelectTrigger className="h-9 w-auto flex-1 text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s} disabled={s === "CONVERTED"}>
                            {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="success"
                      size="sm"
                      className="h-9"
                      onClick={() => convertLead(lead)}
                      loading={convertingId === lead.id}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      {convertingId === lead.id ? "Converting…" : "Convert"}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateLeadDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(l) => {
          setLeads((p) => [l, ...p]);
          setShowCreate(false);
        }}
      />
    </div>
  );
}

function CreateLeadDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (l: Lead) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Lead name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<Lead>("/leads", {
        name: name.trim(),
        phone: phone || undefined,
        email: email || undefined,
        company: company || undefined,
        source: source || undefined,
        notes: notes || undefined,
      });
      toast.success("Lead created");
      onCreated(res.data);
      setName("");
      setPhone("");
      setEmail("");
      setCompany("");
      setSource("");
      setNotes("");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not create lead"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <form onSubmit={handleSubmit} className="flex max-h-[88vh] flex-col">
          <DrawerHeader>
            <DrawerTitle>New Lead</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-3 overflow-y-auto px-5 pb-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Referral, cold call…" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DrawerFooter>
            <Button type="submit" size="lg" className="h-14 w-full text-base" loading={submitting}>
              {submitting ? "Creating…" : "Create Lead"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
