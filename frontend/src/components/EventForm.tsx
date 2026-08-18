import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ApiEvent, ApiEventFormData } from "@/lib/api";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ImageIcon, Loader2, X } from "lucide-react";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  venue: z.string().min(1, "Venue is required"),
  maps_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  date: z.string().min(1, "Date is required"),
  starting_time: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM"),
  registration_deadline: z.string().min(1, "Registration deadline is required"),
  quota: z.coerce.number().int().min(1, "Min 1"),
  entry_fee: z.coerce.number().int().min(0, "Min 0"),
  hero_image_url: z.string().url().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface EventFormProps {
  initial?: ApiEvent;
  onSubmit: (data: ApiEventFormData) => Promise<void>;
  submitLabel?: string;
}

export function EventForm({ initial, onSubmit, submitLabel = "Save" }: EventFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(initial?.hero_image_url ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      venue: initial?.venue ?? "",
      maps_url: initial?.maps_url ?? "",
      date: initial?.date ? initial.date.slice(0, 10) : "",
      starting_time: initial?.starting_time ?? "",
      registration_deadline: initial?.registration_deadline
        ? initial.registration_deadline.slice(0, 10)
        : "",
      quota: initial?.quota ?? 0,
      entry_fee: initial?.entry_fee ?? 0,
      hero_image_url: initial?.hero_image_url ?? "",
    },
  });

  async function handleFormSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await onSubmit({
        ...values,
        maps_url: values.maps_url || undefined,
        hero_image_url: values.hero_image_url || undefined,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      <Field label="Event Title *" error={errors.title?.message}>
        <Controller control={control} name="title"
          render={({ field }) => <Input {...field} placeholder="Event name" />} />
      </Field>

      <Field label="Description / Rundown *" error={errors.description?.message}>
        <Controller control={control} name="description"
          render={({ field }) => (
            <Textarea {...field} placeholder="Event information, schedule, rundown..." rows={5} />
          )} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Date *" error={errors.date?.message}>
          <Controller control={control} name="date"
            render={({ field }) => <Input {...field} type="date" />} />
        </Field>
        <Field label="Starting Time *" error={errors.starting_time?.message}>
          <Controller control={control} name="starting_time"
            render={({ field }) => <Input {...field} type="time" placeholder="07:00" />} />
        </Field>
      </div>

      <Field label="Registration Deadline *" error={errors.registration_deadline?.message}>
        <Controller control={control} name="registration_deadline"
          render={({ field }) => <Input {...field} type="date" />} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Quota (participants) *" error={errors.quota?.message}>
          <Controller control={control} name="quota"
            render={({ field }) => <Input {...field} type="number" min={0} />} />
        </Field>
        <Field label="Registration Fee (IDR) *" error={errors.entry_fee?.message}>
          <Controller control={control} name="entry_fee"
            render={({ field }) => <Input {...field} type="number" min={0} placeholder="0 = Free" />} />
        </Field>
      </div>

      <Field label="Venue / Address *" error={errors.venue?.message}>
        <Controller control={control} name="venue"
          render={({ field }) => <Input {...field} placeholder="Venue name or full address" />} />
      </Field>

      <Field label="Google Maps URL" error={errors.maps_url?.message}>
        <Controller control={control} name="maps_url"
          render={({ field }) => <Input {...field} placeholder="https://maps.google.com/..." type="url" />} />
      </Field>

      <Field label="Hero Image" error={errors.hero_image_url?.message}>
        <Controller control={control} name="hero_image_url" render={({ field }) => (
          <>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) { toast.error("Image size must be under 5MB"); return; }
                setUploading(true);
                try {
                  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
                  const path = `events/${initial?.id ?? Date.now()}/hero.${ext}`;
                  const { error } = await supabase.storage.from("event-images").upload(path, file, { upsert: true });
                  if (error) throw error;
                  const { data: { publicUrl } } = supabase.storage.from("event-images").getPublicUrl(path);
                  field.onChange(publicUrl);
                  setPreview(publicUrl);
                } catch (err: unknown) {
                  toast.error((err as Error).message ?? "Upload failed");
                } finally {
                  setUploading(false);
                }
              }}
            />
            {preview ? (
              <div className="relative rounded-lg overflow-hidden border aspect-video">
                <img src={preview} alt="Hero" className="w-full h-full object-cover" />
                <button type="button" onClick={() => { field.onChange(""); setPreview(""); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg aspect-video text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-6 h-6" />}
                <span className="text-sm mt-2">{uploading ? "Uploading..." : "Click to choose image"}</span>
                <span className="text-xs mt-1">JPG, PNG, WebP · max 5MB</span>
              </button>
            )}
          </>
        )} />
      </Field>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Menyimpan..." : submitLabel}
      </Button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
