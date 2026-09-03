"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { GeoError, friendlyGeoErrorMessage, getCurrentPosition } from "@/lib/geolocation";
import { PlusIcon, TargetIcon, XIcon } from "@/components/icons";
import type { Lead, LeadStatus } from "@/types";
import { format } from "date-fns";

const STATUS_OPTIONS: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "CONVERTED", "LOST"];

const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: "bg-slate-100 text-slate-600",
  CONTACTED: "bg-blue-100 text-blue-700",
  QUALIFIED: "bg-indigo-100 text-indigo-700",
  NEGOTIATION: "bg-amber-100 text-amber-700",
  CONVERTED: "bg-emerald-100 text-emerald-700",
  LOST: "bg-red-100 text-red-700",
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
          toast(friendlyGeoErrorMessage(err.kind) + " Converting without precise coordinates.", { icon: "ℹ️" });
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
          <button
            onClick={() => setShowCreate(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white active:bg-brand-700"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
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
            icon={<TargetIcon className="h-10 w-10 text-slate-300" />}
            title="No leads yet"
            message="Add a new lead to start tracking your pipeline."
            action={
              <button onClick={() => setShowCreate(true)} className="mt-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white">
                Add Lead
              </button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {leads.map((lead) => (
              <li key={lead.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{lead.name}</p>
                    <p className="text-xs text-slate-500">{lead.company || lead.phone || lead.email || "—"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_COLORS[lead.status]}`}>
                    {lead.status.replace(/_/g, " ")}
                  </span>
                </div>
                {lead.notes && <p className="mt-2 text-xs text-slate-400">{lead.notes}</p>}
                <p className="mt-2 text-[11px] text-slate-400">Added {format(new Date(lead.createdAt), "d MMM yyyy")}</p>

                {lead.status !== "CONVERTED" && lead.status !== "LOST" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead, e.target.value as LeadStatus)}
                      className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} disabled={s === "CONVERTED"}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => convertLead(lead)}
                      disabled={convertingId === lead.id}
                      className="ml-auto rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {convertingId === lead.id ? "Converting…" : "Convert to Customer"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showCreate && <CreateLeadModal onClose={() => setShowCreate(false)} onCreated={(l) => { setLeads((p) => [l, ...p]); setShowCreate(false); }} />}
    </div>
  );
}

function CreateLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: (l: Lead) => void }) {
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
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not create lead"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-sm space-y-3 overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">New Lead</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 active:bg-slate-100">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name *"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-brand-500"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-brand-500"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-brand-500"
        />
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-brand-500"
        />
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Source (e.g. referral, cold call)"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-brand-500"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          rows={2}
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand-600 py-3.5 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create Lead"}
        </button>
      </form>
    </div>
  );
}
