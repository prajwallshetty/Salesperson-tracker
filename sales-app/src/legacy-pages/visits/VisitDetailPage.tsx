import { ChangeEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { GeoError, friendlyGeoErrorMessage, getCurrentPosition } from "@/lib/geolocation";
import { CameraIcon, CheckIcon, ClockIcon, MapPinIcon } from "@/components/icons";
import type { Visit, VisitOutcome } from "@/types";

const OUTCOME_OPTIONS: { value: VisitOutcome; label: string }[] = [
  { value: "ORDER_PLACED", label: "Order Placed" },
  { value: "FOLLOW_UP_REQUIRED", label: "Follow-up Required" },
  { value: "NOT_INTERESTED", label: "Not Interested" },
  { value: "NO_RESPONSE", label: "No Response" },
  { value: "PAYMENT_COLLECTED", label: "Payment Collected" },
  { value: "OTHER", label: "Other" },
];

function useElapsed(startIso: string | null | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startIso) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startIso]);
  if (!startIso) return "00:00";
  const diff = Math.max(0, now - new Date(startIso).getTime());
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState<VisitOutcome | "">("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);

  const elapsed = useElapsed(visit?.checkInAt);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // There's no GET /visits/:id in the contract; fetch the list scoped to self and find it.
    api
      .get<Visit[]>("/visits")
      .then((res) => {
        const v = res.data.find((x) => x.id === id);
        if (v) setVisit(v);
        else toast.error("Visit not found");
      })
      .catch((err) => toast.error(apiErrorMessage(err, "Could not load visit")))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCheckIn() {
    if (!id) return;
    setCheckingIn(true);
    setGeoError(null);
    try {
      const point = await getCurrentPosition();
      const res = await api.post<Visit>(`/visits/${id}/checkin`, { lat: point.lat, lng: point.lng });
      setVisit(res.data);
      toast.success("Checked in");
    } catch (err) {
      if (err instanceof GeoError) {
        setGeoError(friendlyGeoErrorMessage(err.kind));
        toast.error(friendlyGeoErrorMessage(err.kind));
      } else {
        toast.error(apiErrorMessage(err, "Check-in failed"));
      }
    } finally {
      setCheckingIn(false);
    }
  }

  async function handlePhotoSelect(e: ChangeEvent<HTMLInputElement>) {
    if (!id || !e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files).slice(0, 5);
    setUploadingPhotos(true);
    try {
      const form = new FormData();
      files.forEach((f) => form.append("photos", f));
      const res = await api.post<Visit>(`/visits/${id}/photos`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setVisit(res.data);
      toast.success(`${files.length} photo${files.length > 1 ? "s" : ""} uploaded`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Photo upload failed"));
    } finally {
      setUploadingPhotos(false);
      e.target.value = "";
    }
  }

  async function handleCheckOut() {
    if (!id) return;
    setCheckingOut(true);
    setGeoError(null);
    try {
      const point = await getCurrentPosition();
      const res = await api.post<Visit>(`/visits/${id}/checkout`, {
        lat: point.lat,
        lng: point.lng,
        notes: notes || undefined,
        outcome: outcome || undefined,
        followUpDate: followUpDate || undefined,
      });
      setVisit(res.data);
      toast.success("Visit completed");
      setTimeout(() => navigate("/customers"), 900);
    } catch (err) {
      if (err instanceof GeoError) {
        setGeoError(friendlyGeoErrorMessage(err.kind));
        toast.error(friendlyGeoErrorMessage(err.kind));
      } else {
        toast.error(apiErrorMessage(err, "Check-out failed"));
      }
    } finally {
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!visit) {
    return (
      <div>
        <PageHeader title="Visit" back />
        <p className="p-6 text-center text-sm text-slate-500">Visit not found.</p>
      </div>
    );
  }

  const isCompleted = visit.status === "COMPLETED";
  const isCheckedIn = visit.status === "IN_PROGRESS";

  return (
    <div>
      <PageHeader title={visit.customer?.name ?? "Visit"} back subtitle={visit.customer?.address ?? undefined} />
      <div className="space-y-4 px-4 pt-4 pb-8">
        {geoError && (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
            {geoError}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
          {isCompleted ? (
            <>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckIcon className="h-6 w-6" />
              </div>
              <p className="text-base font-extrabold text-slate-900">Visit Completed</p>
              {visit.outcome && <p className="mt-1 text-sm text-slate-500">{visit.outcome.replace(/_/g, " ")}</p>}
            </>
          ) : isCheckedIn ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Checked in</p>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-3xl font-extrabold tabular-nums text-brand-700">
                <ClockIcon className="h-6 w-6" />
                {elapsed}
              </p>
              <p className="mt-1 text-xs text-slate-400">Duration on site</p>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-slate-500">Ready to visit this customer?</p>
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4 text-base font-extrabold text-white shadow-md active:scale-[0.98] disabled:opacity-60"
              >
                <MapPinIcon className="h-5 w-5" />
                {checkingIn ? "Checking in…" : "Check In"}
              </button>
            </>
          )}
        </div>

        {isCheckedIn && !showCheckoutForm && (
          <button
            onClick={() => setShowCheckoutForm(true)}
            className="w-full rounded-2xl bg-slate-900 py-4 text-base font-extrabold text-white active:scale-[0.98]"
          >
            Check Out
          </button>
        )}

        {(isCheckedIn || isCompleted) && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">Photos</h2>
              {!isCompleted && (
                <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
                  <CameraIcon className="h-4 w-4" />
                  {uploadingPhotos ? "Uploading…" : "Add Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={handlePhotoSelect}
                    disabled={uploadingPhotos}
                  />
                </label>
              )}
            </div>
            {!visit.photoUrls || visit.photoUrls.length === 0 ? (
              <p className="text-xs text-slate-400">No photos attached yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {visit.photoUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                    <img src={url} alt="Visit" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        {isCheckedIn && showCheckoutForm && (
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-700">Complete Visit</h2>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Outcome</label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as VisitOutcome)}
                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
              >
                <option value="">Select outcome…</option>
                {OUTCOME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="What happened during this visit?"
                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Follow-up Date (optional)</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowCheckoutForm(false)}
                className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckOut}
                disabled={checkingOut}
                className="flex-[2] rounded-xl bg-brand-600 py-3 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {checkingOut ? "Submitting…" : "Submit & Check Out"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
