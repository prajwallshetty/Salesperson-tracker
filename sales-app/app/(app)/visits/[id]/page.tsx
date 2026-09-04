"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { format } from "date-fns";
import { Camera, Check, Clock, MapPin, CalendarIcon } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { GeoError, friendlyGeoErrorMessage, getCurrentPosition, haversineKm } from "@/lib/geolocation";
import { cn } from "@/lib/utils";
import type { Visit, VisitOutcome } from "@/types";

const OUTCOME_OPTIONS: { value: VisitOutcome; label: string }[] = [
  { value: "ORDER_PLACED", label: "Order Placed" },
  { value: "FOLLOW_UP_REQUIRED", label: "Follow-up Required" },
  { value: "NOT_INTERESTED", label: "Not Interested" },
  { value: "NO_RESPONSE", label: "No Response" },
  { value: "PAYMENT_COLLECTED", label: "Payment Collected" },
  { value: "OTHER", label: "Other" },
];

function resolvePhotoUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${process.env.NEXT_PUBLIC_API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function useElapsed(startIso: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
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

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState<VisitOutcome | "">("");
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);

  const elapsed = useElapsed(visit?.checkInAt);

  // Show how far the salesperson currently is from the customer before they check in -
  // informational only (no geofence/enforcement exists in the current business rules),
  // using a single one-shot GPS read so this doesn't start continuous tracking on its own.
  useEffect(() => {
    if (!visit || visit.status !== "PLANNED" || !visit.customer?.lat || !visit.customer?.lng) return;
    let cancelled = false;
    getCurrentPosition()
      .then((point) => {
        if (cancelled) return;
        setDistanceMeters(Math.round(haversineKm(point, { lat: visit.customer!.lat as number, lng: visit.customer!.lng as number }) * 1000));
      })
      .catch(() => {
        /* silent here - the main Check In flow surfaces GPS errors when actually pressed */
      });
    return () => {
      cancelled = true;
    };
  }, [visit?.id, visit?.status, visit?.customer?.lat, visit?.customer?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

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
        followUpDate: followUpDate ? format(followUpDate, "yyyy-MM-dd") : undefined,
      });
      setVisit(res.data);
      setShowCheckoutForm(false);
      toast.success("Visit completed");
      setTimeout(() => router.push("/customers"), 900);
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
      <div className="space-y-3 px-4 pt-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!visit) {
    return (
      <div>
        <PageHeader title="Visit" back />
        <p className="p-6 text-center text-sm text-muted-foreground">Visit not found.</p>
      </div>
    );
  }

  const isCompleted = visit.status === "COMPLETED";
  const isCheckedIn = visit.status === "IN_PROGRESS";

  return (
    <div>
      <PageHeader title={visit.customer?.name ?? "Visit"} back subtitle={visit.customer?.address ?? undefined} />
      <div className="space-y-5 px-4 pt-4 pb-8">
        {geoError && (
          <div className="rounded-xl bg-warning-soft px-4 py-3 text-xs font-medium text-warning">{geoError}</div>
        )}

        <div className="rounded-2xl border border-border/60 bg-card p-6 text-center shadow-card">
          {isCompleted ? (
            <>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
                <Check className="h-7 w-7" strokeWidth={2.5} />
              </div>
              <p className="text-base font-extrabold text-foreground">Visit Completed</p>
              {visit.outcome && <p className="mt-1 text-sm text-muted-foreground">{visit.outcome.replace(/_/g, " ")}</p>}
            </>
          ) : isCheckedIn ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Checked in</p>
              <p className="mt-2 flex items-center justify-center gap-2 text-4xl font-extrabold tabular-nums tracking-tight text-primary">
                <Clock className="h-7 w-7" />
                {elapsed}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Duration on site</p>
            </>
          ) : (
            <>
              <p className="mb-1 text-sm text-muted-foreground">Ready to visit this customer?</p>
              {distanceMeters !== null && (
                <p className="mb-4 text-xs font-medium text-muted-foreground">
                  {distanceMeters < 1000 ? `${distanceMeters} m away` : `${(distanceMeters / 1000).toFixed(1)} km away`}
                </p>
              )}
              <Button onClick={handleCheckIn} loading={checkingIn} size="lg" className={cn("h-14 w-full text-base shadow-md", distanceMeters === null && "mt-3")}>
                <MapPin className="h-5 w-5" />
                {checkingIn ? "Checking in…" : "Check In"}
              </Button>
            </>
          )}
        </div>

        {isCheckedIn && (
          <Button onClick={() => setShowCheckoutForm(true)} size="lg" variant="secondary" className="h-14 w-full text-base bg-foreground text-background hover:bg-foreground/90">
            Check Out
          </Button>
        )}

        {(isCheckedIn || isCompleted) && (
          <section>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Photos</h2>
              {!isCompleted && (
                <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-primary-soft px-3.5 py-2 text-xs font-bold text-primary active:bg-primary-soft/70">
                  <Camera className="h-4 w-4" />
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
              <p className="text-xs text-muted-foreground">No photos attached yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {visit.photoUrls.map((url) => (
                  <a
                    key={url}
                    href={resolvePhotoUrl(url)}
                    target="_blank"
                    rel="noreferrer"
                    className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                  >
                    <Image
                      src={resolvePhotoUrl(url)}
                      alt="Visit"
                      fill
                      sizes="(max-width: 480px) 33vw, 160px"
                      loading="lazy"
                      className="object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <Drawer open={isCheckedIn && showCheckoutForm} onOpenChange={setShowCheckoutForm}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Complete Visit</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-5 pb-2">
            <div className="space-y-1.5">
              <Label>Outcome</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as VisitOutcome)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select outcome…" />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOME_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="What happened during this visit?"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Follow-up Date (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex h-12 w-full items-center gap-2.5 rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm",
                      !followUpDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {followUpDate ? format(followUpDate, "d MMM yyyy") : "Pick a date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={followUpDate} onSelect={setFollowUpDate} disabled={{ before: new Date() }} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DrawerFooter className="flex-row">
            <Button variant="outline" size="lg" className="flex-1" onClick={() => setShowCheckoutForm(false)}>
              Cancel
            </Button>
            <Button size="lg" className="flex-[2]" onClick={handleCheckOut} loading={checkingOut}>
              {checkingOut ? "Submitting…" : "Submit & Check Out"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
