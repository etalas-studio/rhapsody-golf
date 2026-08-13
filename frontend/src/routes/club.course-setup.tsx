import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/appContext";
import { useAdminClub } from "@/lib/useApi";
import { api, type ApiClub } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Upload } from "lucide-react";
import {
  MapPin, Image, X, Save, ExternalLink, Pencil,
  Phone, Mail, Clock, CheckCircle2,
  ShoppingBag, UtensilsCrossed, Sparkles,
  GraduationCap, Lock, BedDouble,
  Car, Wrench, KeyRound, Moon, Footprints, Dumbbell,
} from "lucide-react";

export const Route = createFileRoute("/club/course-setup")({
  head: () => ({ meta: [{ title: "Course Setup · Club Admin" }] }),
  component: CourseSetup,
});

// ─── Schema ────────────────────────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(1, "Required"),
  short_name: z.string().min(1, "Required"),
  location: z.string().min(1, "Required"),
  region: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").or(z.literal("")),
  operating_hours: z.string().optional(),
  description: z.string().min(1, "Required"),
  terms_and_conditions: z.string().optional(),
  maps_url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  number_of_holes: z.coerce.number().min(1).optional(),
  par: z.coerce.number().min(1).optional(),
  length_yards: z.coerce.number().min(0).optional(),
  course_rating: z.coerce.number().min(0).optional(),
  slope_rating: z.coerce.number().min(0).optional(),
  established_in: z.coerce.number().min(1800).max(2100).optional(),
  starting_price: z.coerce.number().min(0),
  facilities: z.array(z.string()),
  price_includes: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

// ─── Main component ─────────────────────────────────────────────────────────────
function CourseSetup() {
  const { selectedClubId } = useApp();
  const { data: club, loading, error, refetch } = useAdminClub(selectedClubId || undefined);
  const [editing, setEditing] = useState(false);

  if (loading) return (
    <AppShell>
      <PageHeader title="Course Setup" subtitle="Loading club profile…" />
      <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
    </AppShell>
  );

  if (error || !club) return (
    <AppShell>
      <PageHeader title="Course Setup" subtitle="Could not load club data." />
      <p className="text-sm text-destructive">{error ?? "No club found for this account."}</p>
    </AppShell>
  );

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-4 mb-6">
        <PageHeader
          title="Course Setup"
          subtitle={`Profile and settings for ${club.short_name ?? club.name}.`}
        />
        {!editing && (
          <Button onClick={() => setEditing(true)} className="gap-2 shrink-0">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <EditForm
          club={club}
          clubId={selectedClubId}
          onCancel={() => setEditing(false)}
          onSaved={() => { refetch?.(); setEditing(false); }}
        />
      ) : (
        <ViewMode club={club} />
      )}
    </AppShell>
  );
}

// ─── Amenity icon map (mirrors app.courses.$courseId) ──────────────────────────
const AMENITY_ICONS: Record<string, React.ElementType> = {
  "Accommodation": BedDouble,
  "Caddy & Golf Carts": Car,
  "Club Rental": Wrench,
  "Club Valet": KeyRound,
  "Golf Lessons": GraduationCap,
  "Locker Room": Lock,
  "Night Golf": Moon,
  "Pro Shop": ShoppingBag,
  "Restaurant & Dining": UtensilsCrossed,
  "Shoe Rental": Footprints,
  "Spa & Massage": Sparkles,
  "Health Club": Dumbbell,
};

const ALL_FACILITIES = [
  "Accommodation",
  "Caddy & Golf Carts",
  "Club Rental",
  "Club Valet",
  "Golf Lessons",
  "Locker Room",
  "Night Golf",
  "Pro Shop",
  "Restaurant & Dining",
  "Shoe Rental",
  "Spa & Massage",
  "Health Club",
] as const;

function clubBanner(themeColor: string | null) {
  return themeColor
    ? `linear-gradient(135deg, ${themeColor}, ${themeColor}bb)`
    : "linear-gradient(135deg, #1a2a40, #3a5a80)";
}

// ─── View mode ─────────────────────────────────────────────────────────────────
const E = "—"; // empty placeholder

function ViewMode({ club }: { club: ApiClub }) {
  const heroImg = club.banner_url;
  const locationStr = [club.location, club.region].filter(Boolean).join(", ");

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Hero banner */}
      <div className="h-64 relative rounded-xl overflow-hidden">
        {heroImg ? (
          <img src={heroImg} alt={club.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: clubBanner(club.theme_color) }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-xl" />
        <div className="absolute bottom-5 left-5 right-5">
          <h2 className="font-display text-2xl text-white leading-tight">{club.name}</h2>
          {locationStr && (
            <p className="flex items-center gap-1 text-sm text-white/80 mt-1">
              <MapPin className="h-3 w-3 shrink-0" />{locationStr}
            </p>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <Card className="shadow-elegant">
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <InfoRow label="Club Name" value={club.name} />
            <InfoRow label="Short Name" value={club.short_name} />
            <InfoRow label="Location" value={club.location} />
            <InfoRow label="Region" value={club.region} />
            <InfoRow label="Established" value={club.established_in} />
          </div>
          <Separator />
          <InfoRow label="Address" value={club.address} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={club.phone} />
            <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={club.email} />
          </div>
          <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Operating Hours" value={club.operating_hours} />
          <Separator />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Description</p>
            <p className="text-sm leading-relaxed">{club.description || <span className="text-muted-foreground italic">Not set</span>}</p>
          </div>
        </CardContent>
      </Card>

      {/* Course Details */}
      <Card className="shadow-elegant">
        <CardHeader><CardTitle>Course Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
            <InfoRow label="Holes" value={club.number_of_holes ?? club.holes} />
            <InfoRow label="Par" value={club.par} />
            <InfoRow label="Length (yds)" value={club.length_yards?.toLocaleString()} />
            <InfoRow label="Course Rating" value={club.course_rating} />
            <InfoRow label="Slope Rating" value={club.slope_rating} />
            {club.rating ? <InfoRow label="Rating" value={`★ ${club.rating.toFixed(1)} / 5`} /> : null}
          </div>
        </CardContent>
      </Card>

      {/* Facilities */}
      <Card className="shadow-elegant">
        <CardHeader><CardTitle>Facilities</CardTitle></CardHeader>
        <CardContent>
          {club.facilities && club.facilities.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {club.facilities.map((f) => {
                const Icon = AMENITY_ICONS[f] ?? CheckCircle2;
                return (
                  <div key={f} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span>{f}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No facilities listed.</p>
          )}
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card className="shadow-elegant">
        <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <InfoRow label="Starting Price" value={club.starting_price ? `Rp ${club.starting_price.toLocaleString("id-ID")}` : undefined} />
          {club.price_includes && club.price_includes.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Price Shown Includes</p>
                <div className="grid grid-cols-2 gap-2">
                  {club.price_includes.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      <Card className="shadow-elegant">
        <CardHeader><CardTitle className="flex items-center gap-2"><Image className="h-4 w-4" />Photo Gallery</CardTitle></CardHeader>
        <CardContent>
          {club.image_urls && club.image_urls.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {club.image_urls.map((url, i) => (
                <div key={i} className="rounded-xl overflow-hidden border aspect-video">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No gallery photos.</p>
          )}
        </CardContent>
      </Card>

      {/* Terms & Conditions */}
      <Card className="shadow-elegant">
        <CardHeader><CardTitle>Terms &amp; Conditions</CardTitle></CardHeader>
        <CardContent>
          {club.terms_and_conditions ? (
            <p className="text-sm whitespace-pre-line leading-relaxed">{club.terms_and_conditions}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No terms &amp; conditions set.</p>
          )}
        </CardContent>
      </Card>

      {/* Location (Maps URL) */}
      <Card className="shadow-elegant">
        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" />Location (Maps URL)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {locationStr && <p className="text-sm text-muted-foreground">{locationStr}</p>}
          {club.maps_url ? (
            <>
              <div className="rounded-xl overflow-hidden border h-52">
                <iframe
                  src={club.maps_url.includes("embed") ? club.maps_url : `https://maps.google.com/maps?q=${encodeURIComponent(club.maps_url)}&output=embed`}
                  width="100%" height="100%" style={{ border: 0 }} loading="lazy" title="Course location"
                />
              </div>
              <a href={club.maps_url} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-card py-3 text-sm font-medium hover:bg-muted transition">
                <MapPin className="h-4 w-4 text-primary" />
                Open in Google Maps <ExternalLink className="h-3 w-3" />
              </a>
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">No maps URL set.</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value?: string | number | null; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">{icon}{label}</p>
      <p className="text-sm mt-0.5">{value ?? <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}

// ─── Edit form ─────────────────────────────────────────────────────────────────
function EditForm({
  club,
  clubId,
  onCancel,
  onSaved,
}: {
  club: ApiClub;
  clubId: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(club.facilities ?? []);
  const [selectedPriceIncludes, setSelectedPriceIncludes] = useState<string[]>(club.price_includes ?? []);
  const [customPriceItem, setCustomPriceItem] = useState("");
  // Hero: existing URL from DB, or blob URL for local preview
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string>(club.banner_url ?? "");
  const [heroFile, setHeroFile] = useState<File | null>(null);
  // Gallery: existing URLs from DB + pending local files with previews
  const [pendingGallery, setPendingGallery] = useState<Array<{ file: File; previewUrl: string }>>([]);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function handleHeroSelect(file: File) {
    if (heroPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(heroPreviewUrl);
    setHeroFile(file);
    setHeroPreviewUrl(URL.createObjectURL(file));
    if (heroInputRef.current) heroInputRef.current.value = "";
  }

  function handleGallerySelect(files: File[]) {
    const items = files.map((f) => ({ file: f, previewUrl: URL.createObjectURL(f) }));
    setPendingGallery((prev) => [...prev, ...items]);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: club.name,
      short_name: club.short_name ?? "",
      location: club.location ?? "",
      region: club.region ?? "",
      address: club.address ?? "",
      phone: club.phone ?? "",
      email: club.email ?? "",
      operating_hours: club.operating_hours ?? "",
      description: club.description ?? "",
      terms_and_conditions: club.terms_and_conditions ?? "",
      maps_url: club.maps_url ?? "",
      number_of_holes: club.number_of_holes ?? club.holes ?? 18,
      par: club.par ?? 72,
      length_yards: club.length_yards ?? undefined,
      course_rating: club.course_rating ?? undefined,
      slope_rating: club.slope_rating ?? undefined,
      established_in: club.established_in ?? undefined,
      starting_price: club.starting_price ?? 0,
      facilities: club.facilities ?? [],
      price_includes: club.price_includes ?? [],
    },
  });

  // image_urls: committed URLs from DB + any newly uploaded ones (after save)
  const [imageUrls, setImageUrls] = useState<string[]>(club.image_urls ?? []);
  const mapsUrl = watch("maps_url");

  async function uploadFile(file: File, path: string): Promise<string> {
    const { error } = await supabase.storage.from("club-images").upload(path, file, { upsert: true });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return supabase.storage.from("club-images").getPublicUrl(path).data.publicUrl;
  }

  async function onSubmit(data: FormValues) {
    setSaving(true);
    setSaveError(null);
    try {
      // Upload hero if a new file was selected
      let finalPhotoUrl = heroPreviewUrl.startsWith("blob:") ? "" : heroPreviewUrl;
      if (heroFile) {
        const ext = heroFile.name.split(".").pop() ?? "jpg";
        finalPhotoUrl = await uploadFile(heroFile, `${clubId}/hero-${Date.now()}.${ext}`);
      }

      // Upload pending gallery files
      let finalImageUrls = [...imageUrls];
      if (pendingGallery.length > 0) {
        const base = Date.now();
        const uploaded = await Promise.all(
          pendingGallery.map(({ file }, i) => {
            const ext = file.name.split(".").pop() ?? "jpg";
            return uploadFile(file, `${clubId}/gallery-${base}-${i}.${ext}`);
          })
        );
        finalImageUrls = [...finalImageUrls, ...uploaded];
      }

      // Revoke blob URLs now that upload succeeded
      if (heroFile && heroPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(heroPreviewUrl);
      pendingGallery.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));

      await api.admin.updateClub(clubId, {
        name: data.name,
        short_name: data.short_name,
        location: data.location,
        region: data.region,
        address: data.address,
        phone: data.phone,
        email: data.email,
        operating_hours: data.operating_hours,
        description: data.description,
        banner_url: finalPhotoUrl || null,
        maps_url: data.maps_url || null,
        image_urls: finalImageUrls,
        number_of_holes: data.number_of_holes,
        par: data.par,
        length_yards: data.length_yards,
        course_rating: data.course_rating,
        slope_rating: data.slope_rating,
        established_in: data.established_in,
        starting_price: data.starting_price,
        facilities: selectedFacilities,
        price_includes: selectedPriceIncludes,
        terms_and_conditions: data.terms_and_conditions || null,
      } as Partial<ApiClub>);
      onSaved();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    {/* Hidden file inputs outside <form> — avoids form-submit side effects on file selection */}
    <input
      ref={heroInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => { const file = e.target.files?.[0]; if (file) handleHeroSelect(file); }}
    />
    <input
      ref={galleryInputRef}
      type="file"
      accept="image/*"
      multiple
      className="hidden"
      onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) handleGallerySelect(files); }}
    />
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* Basic Info */}
      <Card className="shadow-elegant">
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Club Name *" error={errors.name?.message}>
              <Input {...register("name")} />
            </Field>
            <Field label="Short Name *" error={errors.short_name?.message}>
              <Input {...register("short_name")} />
            </Field>
          </div>
          <Field label="Location *" error={errors.location?.message}>
            <Input {...register("location")} placeholder="e.g. South Jakarta, DKI Jakarta" />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Region" error={errors.region?.message}>
              <Input {...register("region")} placeholder="e.g. DKI Jakarta" />
            </Field>
            <Field label="Established" error={errors.established_in?.message}>
              <Input {...register("established_in")} type="number" placeholder="e.g. 1989" />
            </Field>
          </div>
          <Field label="Address" error={errors.address?.message}>
            <Textarea {...register("address")} rows={2} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Phone" error={errors.phone?.message}>
              <Input {...register("phone")} placeholder="+62 21 …" />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input {...register("email")} type="email" />
            </Field>
          </div>
          <Field label="Operating Hours" error={errors.operating_hours?.message}>
            <Input {...register("operating_hours")} placeholder="e.g. 06:00 – 18:00 daily" />
          </Field>
          <Field label="Description *" error={errors.description?.message}>
            <Textarea {...register("description")} rows={4} />
          </Field>
          <Field label="Terms &amp; Conditions" error={errors.terms_and_conditions?.message}>
            <Textarea {...register("terms_and_conditions")} rows={8} placeholder="e.g. Arrival Policy: Please arrive 15 minutes early.&#10;&#10;Refund: No refunds within 24 hours.&#10;&#10;Cancellation: ..." />
          </Field>
        </CardContent>
      </Card>

      {/* Course specs */}
      <Card className="shadow-elegant">
        <CardHeader><CardTitle>Course Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Holes" error={errors.number_of_holes?.message}>
            <Input {...register("number_of_holes")} type="number" min={1} />
          </Field>
          <Field label="Par" error={errors.par?.message}>
            <Input {...register("par")} type="number" min={1} />
          </Field>
          <Field label="Length (yards)" error={errors.length_yards?.message}>
            <Input {...register("length_yards")} type="number" min={0} />
          </Field>
          <Field label="Course Rating" error={errors.course_rating?.message}>
            <Input {...register("course_rating")} type="number" step={0.1} min={0} />
          </Field>
          <Field label="Slope Rating" error={errors.slope_rating?.message}>
            <Input {...register("slope_rating")} type="number" step={0.1} min={0} />
          </Field>
        </CardContent>
      </Card>

      {/* Facilities */}
      <Card className="shadow-elegant">
        <CardHeader><CardTitle>Facilities</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ALL_FACILITIES.map((facility) => {
              const Icon = AMENITY_ICONS[facility] ?? CheckCircle2;
              const active = selectedFacilities.includes(facility);
              return (
                <button
                  key={facility}
                  type="button"
                  onClick={() =>
                    setSelectedFacilities((prev) =>
                      active ? prev.filter((f) => f !== facility) : [...prev, facility]
                    )
                  }
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{facility}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Tap to toggle facilities available at your club.</p>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card className="shadow-elegant">
        <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Starting Price (IDR)" error={errors.starting_price?.message}>
            <Input {...register("starting_price")} type="number" min={0} step={50000} placeholder="e.g. 1250000" />
          </Field>
          <p className="text-xs text-muted-foreground -mt-2">Shown to golfers as the "from" price on the course listing.</p>
        </CardContent>
      </Card>

      {/* Price Includes */}
      <Card className="shadow-elegant">
        <CardHeader><CardTitle>Price Shown Includes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {["Caddy", "Shared Buggy", "Insurance", "Green Fee", "All Applicable Taxes"].map((item) => {
              const active = selectedPriceIncludes.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setSelectedPriceIncludes((prev) =>
                      active ? prev.filter((i) => i !== item) : [...prev, item]
                    )
                  }
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{item}</span>
                </button>
              );
            })}
            {/* Custom items added via free text */}
            {selectedPriceIncludes
              .filter((i) => !["Caddy", "Shared Buggy", "Insurance", "Green Fee", "All Applicable Taxes"].includes(i))
              .map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSelectedPriceIncludes((prev) => prev.filter((i) => i !== item))}
                  className="flex items-center gap-2 rounded-xl border border-primary bg-primary/10 text-primary font-medium px-3 py-2.5 text-sm text-left transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item}</span>
                  <X className="h-3 w-3 shrink-0 opacity-60" />
                </button>
              ))}
          </div>
          {/* Free text input */}
          <div className="flex gap-2">
            <Input
              value={customPriceItem}
              onChange={(e) => setCustomPriceItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const val = customPriceItem.trim();
                  if (val && !selectedPriceIncludes.includes(val)) {
                    setSelectedPriceIncludes((prev) => [...prev, val]);
                  }
                  setCustomPriceItem("");
                }
              }}
              placeholder="Add custom item and press Enter…"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const val = customPriceItem.trim();
                if (val && !selectedPriceIncludes.includes(val)) {
                  setSelectedPriceIncludes((prev) => [...prev, val]);
                }
                setCustomPriceItem("");
              }}
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Hero photo */}
      <Card className="shadow-elegant">
        <CardHeader><CardTitle className="flex items-center gap-2"><Image className="h-4 w-4" />Hero Photo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {heroPreviewUrl && (
            <div className="relative rounded-lg overflow-hidden border h-40 group">
              <img src={heroPreviewUrl} alt="Hero preview" className="w-full h-full object-cover" />
              {heroFile && (
                <span className="absolute bottom-1 left-1 bg-background/80 text-xs rounded px-1.5 py-0.5">
                  Pending upload
                </span>
              )}
              <button
                type="button"
                onClick={() => { if (heroPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(heroPreviewUrl); setHeroPreviewUrl(""); setHeroFile(null); }}
                className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => heroInputRef.current?.click()}
            className="flex items-center gap-2 w-full justify-start px-4 py-3 h-auto border-dashed"
          >
            <Upload className="h-4 w-4" /> {heroPreviewUrl ? "Replace photo" : "Choose hero photo"}
          </Button>
        </CardContent>
      </Card>

      {/* Gallery */}
      <Card className="shadow-elegant">
        <CardHeader><CardTitle className="flex items-center gap-2"><Image className="h-4 w-4" />Photo Gallery</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(imageUrls.length > 0 || pendingGallery.length > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {imageUrls.map((url, i) => (
                <div key={`saved-${i}`} className="relative rounded-xl overflow-hidden border aspect-video group">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrls((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {pendingGallery.map(({ previewUrl }, i) => (
                <div key={`pending-${i}`} className="relative rounded-xl overflow-hidden border aspect-video group">
                  <img src={previewUrl} alt={`New ${i + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 bg-background/80 text-xs rounded px-1.5 py-0.5">Pending</span>
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(previewUrl);
                      setPendingGallery((prev) => prev.filter((_, j) => j !== i));
                    }}
                    className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => galleryInputRef.current?.click()}
            className="flex items-center gap-2 w-full justify-start px-4 py-3 h-auto border-dashed"
          >
            <Upload className="h-4 w-4" /> Add photos (multiple allowed)
          </Button>
        </CardContent>
      </Card>

      {/* Maps */}
      <Card className="shadow-elegant">
        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" />Location (Maps URL)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Google Maps URL" error={errors.maps_url?.message}>
            <div className="flex gap-2">
              <Input {...register("maps_url")} placeholder="https://maps.google.com/…" className="flex-1" />
              {mapsUrl && (
                <Button type="button" variant="outline" size="icon" asChild>
                  <a href={mapsUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                </Button>
              )}
            </div>
          </Field>
          {mapsUrl && (
            <div className="rounded-lg overflow-hidden border h-48">
              <iframe
                src={mapsUrl.includes("embed") ? mapsUrl : `https://maps.google.com/maps?q=${encodeURIComponent(mapsUrl)}&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                title="Course location preview"
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">Paste the Google Maps share link. Shown to golfers on the course detail page.</p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 pb-6">
        <Button type="submit" disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        {saveError && <span className="text-sm text-destructive">{saveError}</span>}
      </div>
    </form>
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
