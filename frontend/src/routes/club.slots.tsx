import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/appContext";
import { api, type ApiAdminTeeSlot, type ApiTeeConfig } from "@/lib/api";
import { formatIDR } from "@/lib/mockData";
import { format, addDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import { Lock, Unlock, Pencil, Check, X, Sparkles, Settings2, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/club/slots")({
  head: () => ({ meta: [{ title: "Tee Time Manager · Club Admin" }] }),
  component: SlotManager,
});

function addMins(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function toMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

type BandKey = "early" | "prime" | "twilight";
const BAND_META: Record<BandKey, { label: string; color: string }> = {
  early:    { label: "Early",    color: "text-sky-500" },
  prime:    { label: "Prime",    color: "text-amber-500" },
  twilight: { label: "Twilight", color: "text-violet-500" },
};

type BandRanges = Record<BandKey, { start: string; end: string }>;

function SlotManager() {
  const { selectedClubId } = useApp();
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<ApiAdminTeeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [genDays, setGenDays] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [genPreview, setGenPreview] = useState<{ start_date: string; last_slot_date: string | null } | null>(null);
  const [windowStart, setWindowStart] = useState(0); // index into dates[]
  const WINDOW = 14;

  const dates = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const lastDate = genPreview?.last_slot_date ? new Date(genPreview.last_slot_date) : null;
    const days = lastDate && lastDate > base
      ? Math.ceil((lastDate.getTime() - base.getTime()) / 86400000) + 1
      : 14;
    return Array.from({ length: days }, (_, i) => addDays(base, i).toISOString().slice(0, 10));
  }, [genPreview?.last_slot_date]);
  const [bandPrices, setBandPrices] = useState({ early: 1_250_000, prime: 1_450_000, twilight: 1_100_000 });
  // Raw string while editing — format only on blur to avoid cursor jump
  const [bandPriceRaw, setBandPriceRaw] = useState<Partial<Record<BandKey, string>>>({});
  const [savingConfig, setSavingConfig] = useState(false);

  // Konfigurasi
  const [interval, setIntervalMins] = useState(30);
  const [bandRanges, setBandRanges] = useState<BandRanges>({
    early:    { start: "06:00", end: "10:30" },
    prime:    { start: "11:00", end: "13:30" },
    twilight: { start: "14:00", end: "16:30" },
  });

  // Load saved config from club record
  useEffect(() => {
    if (!selectedClubId) return;
    api.admin.getTeeConfig(selectedClubId).then((cfg: ApiTeeConfig) => {
      setIntervalMins(cfg.tee_interval_minutes);
      setBandRanges({
        early:    { start: cfg.early_start,    end: cfg.early_end },
        prime:    { start: cfg.prime_start,    end: cfg.prime_end },
        twilight: { start: cfg.twilight_start, end: cfg.twilight_end },
      });
      setBandPrices({
        early:    cfg.early_default_price,
        prime:    cfg.prime_default_price,
        twilight: cfg.twilight_default_price,
      });
    }).catch(() => null);
  }, [selectedClubId]);

  function bandFor(time: string): BandKey {
    const mins = toMins(time);
    for (const key of ["early", "prime", "twilight"] as BandKey[]) {
      if (mins >= toMins(bandRanges[key].start) && mins <= toMins(bandRanges[key].end)) return key;
    }
    return "twilight";
  }

  const load = useCallback(async () => {
    if (!selectedClubId) return;
    setLoading(true);
    try {
      const data = await api.admin.teeSlotsByDate(selectedClubId, date);
      setSlots(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal load tee time");
    } finally {
      setLoading(false);
    }
  }, [selectedClubId, date]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.admin.generateTeeSlotsPreview()
      .then(setGenPreview)
      .catch(() => null);
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const r = await api.admin.generateTeeSlots(genDays);
      const endDate = addDays(new Date(r.start_date), genDays - 1);
      toast.success(`${r.slots_attempted.toLocaleString()} tee time berhasil di-generate`, {
        description: `${format(new Date(r.start_date), "d MMM")} – ${format(endDate, "d MMM yyyy")}`,
      });
      const preview = await api.admin.generateTeeSlotsPreview();
      setGenPreview(preview);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal generate tee time");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveConfig() {
    if (!selectedClubId) return;
    setSavingConfig(true);
    try {
      await api.admin.saveTeeConfig(selectedClubId, {
        tee_interval_minutes: interval,
        early_start: bandRanges.early.start,
        early_end: bandRanges.early.end,
        early_default_price: bandPrices.early,
        prime_start: bandRanges.prime.start,
        prime_end: bandRanges.prime.end,
        prime_default_price: bandPrices.prime,
        twilight_start: bandRanges.twilight.start,
        twilight_end: bandRanges.twilight.end,
        twilight_default_price: bandPrices.twilight,
      });
      toast.success("Konfigurasi disimpan", {
        description: "Akan dipakai saat generate tee time berikutnya.",
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal simpan konfigurasi");
    } finally {
      setSavingConfig(false);
    }
  }

  async function toggleAvailable(slot: ApiAdminTeeSlot) {
    setSaving(slot.id);
    try {
      const updated = await api.admin.updateTeeSlot(slot.id, selectedClubId!, {
        available: !slot.available,
      });
      setSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success(updated.available ? `Tee time ${slot.time} dibuka` : `Tee time ${slot.time} ditutup`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal update tee time");
    } finally {
      setSaving(null);
    }
  }

  async function savePrice(slot: ApiAdminTeeSlot) {
    const price = parseInt(editPrice.replace(/\D/g, ""), 10);
    if (!price || price < 100_000) return toast.error("Harga minimum Rp 100.000");
    setSaving(slot.id);
    try {
      const updated = await api.admin.updateTeeSlot(slot.id, selectedClubId!, { price });
      setSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditingId(null);
      toast.success(`Harga tee time ${slot.time} diperbarui`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal update harga");
    } finally {
      setSaving(null);
    }
  }

  const closedCount = slots.filter((s) => !s.available).length;

  return (
    <AppShell>
      <PageHeader
        title="Tee Time Manager"
        subtitle="Generate, lihat, ubah harga, atau tutup tee time untuk maintenance."
      />

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Generate panel */}
        <Card className="shadow-elegant">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Generate Tee Time</CardTitle>
            </div>
            <CardDescription>
              Tee time baru dimulai dari hari setelah tee time terakhir yang ada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {genPreview && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs space-y-0.5">
                {genPreview.last_slot_date ? (
                  <>
                    <p className="text-muted-foreground">Slot terakhir: <span className="font-medium text-foreground">{format(new Date(genPreview.last_slot_date), "d MMM yyyy")}</span></p>
                    <p className="text-muted-foreground">Generate dimulai dari: <span className="font-medium text-primary">{format(new Date(genPreview.start_date), "d MMM yyyy")}</span></p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Belum ada slot — akan dimulai dari hari ini.</p>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground shrink-0">Durasi:</span>
              {[14, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setGenDays(d)}
                  className={cn(
                    "px-3 py-1 rounded-md text-sm border transition-colors",
                    genDays === d
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-foreground/40"
                  )}
                >
                  {d} hari
                </button>
              ))}
            </div>
            {genPreview && (
              <p className="text-xs text-muted-foreground">
                Sampai: <span className="font-medium text-foreground">
                  {format(addDays(new Date(genPreview.start_date), genDays - 1), "d MMM yyyy")}
                </span>
              </p>
            )}
            <Button onClick={handleGenerate} disabled={generating} className="w-full shadow-glow">
              <Sparkles className="h-4 w-4 mr-2" />
              {generating ? "Generating..." : "Generate Slots"}
            </Button>
          </CardContent>
        </Card>

        {/* Konfigurasi panel */}
        <Card className="shadow-elegant">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Konfigurasi</CardTitle>
            </div>
            <CardDescription>
              Atur interval, rentang jam, dan harga default per kategori.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Interval */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Interval Slot</p>
              <div className="flex gap-2 flex-wrap">
                {[15, 30, 45, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => setIntervalMins(m)}
                    className={cn(
                      "px-3 py-1 rounded-md text-sm border transition-colors",
                      interval === m
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-foreground/40"
                    )}
                  >
                    {m} menit
                  </button>
                ))}
              </div>
            </div>

            {/* Per-band config */}
            <div className="space-y-2">
              {(["early", "prime", "twilight"] as const).map((band) => (
                <div key={band} className="rounded-lg border border-border/60 p-2.5 space-y-2">
                  <p className={cn("text-xs font-semibold", BAND_META[band].color)}>
                    {BAND_META[band].label}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-8 shrink-0">Jam</span>
                    <Input
                      type="time"
                      className="h-7 text-xs px-2 w-28"
                      value={bandRanges[band].start}
                      onChange={(e) =>
                        setBandRanges((p) => ({ ...p, [band]: { ...p[band], start: e.target.value } }))
                      }
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input
                      type="time"
                      className="h-7 text-xs px-2 w-28"
                      value={bandRanges[band].end}
                      onChange={(e) =>
                        setBandRanges((p) => ({ ...p, [band]: { ...p[band], end: e.target.value } }))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-8 shrink-0">Harga</span>
                    <Input
                      className="h-7 text-xs px-2 tabular-nums"
                      value={bandPriceRaw[band] ?? bandPrices[band].toLocaleString("id-ID")}
                      onChange={(e) => setBandPriceRaw((p) => ({ ...p, [band]: e.target.value }))}
                      onBlur={() => {
                        const val = parseInt((bandPriceRaw[band] ?? "").replace(/\D/g, ""), 10);
                        if (val > 0) setBandPrices((p) => ({ ...p, [band]: val }));
                        setBandPriceRaw((p) => ({ ...p, [band]: undefined }));
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button
              className="w-full shadow-glow"
              disabled={savingConfig}
              onClick={handleSaveConfig}
            >
              <Check className="h-4 w-4 mr-2" />
              {savingConfig ? "Menyimpan..." : "Simpan Konfigurasi"}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Konfigurasi ini dipakai saat generate tee time berikutnya.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Date strip — windowed + calendar jump */}
      <div className="flex items-center gap-2 mb-5">
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={windowStart === 0}
          onClick={() => setWindowStart((w) => Math.max(0, w - WINDOW))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex gap-2 overflow-x-auto pb-1 flex-1 scrollbar-hide">
          {dates.slice(windowStart, windowStart + WINDOW).map((d) => {
            const dt = new Date(d);
            return (
              <button
                key={d}
                onClick={() => setDate(d)}
                className={cn(
                  "min-w-16 shrink-0 rounded-xl border p-2 text-center transition-colors",
                  d === date
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:border-primary/40"
                )}
              >
                <div className="text-[10px] uppercase opacity-70">
                  {dt.toLocaleDateString("id-ID", { weekday: "short" })}
                </div>
                <div className="font-display text-lg">{dt.getDate()}</div>
                <div className="text-[10px] opacity-70">
                  {dt.toLocaleDateString("id-ID", { month: "short" })}
                </div>
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={windowStart + WINDOW >= dates.length}
          onClick={() => setWindowStart((w) => Math.min(dates.length - WINDOW, w + WINDOW))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0" title="Pilih tanggal">
              <CalendarDays className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              locale={idLocale}
              selected={new Date(date + "T00:00:00")}
              onSelect={(d) => {
                if (!d) return;
                const iso = format(d, "yyyy-MM-dd");
                const idx = dates.indexOf(iso);
                if (idx !== -1) {
                  setWindowStart(Math.max(0, idx - Math.floor(WINDOW / 2)));
                  setDate(iso);
                }
              }}
              disabled={(d) => !dates.includes(format(d, "yyyy-MM-dd"))}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs text-muted-foreground">
        {(["early", "prime", "twilight"] as const).map((band) => (
          <span key={band} className={cn("font-medium", BAND_META[band].color)}>
            {BAND_META[band].label} {bandRanges[band].start}–{bandRanges[band].end}
          </span>
        ))}
        <span className="ml-auto">
          {format(new Date(date), "d MMMM yyyy")} ·{" "}
          <span className="text-foreground font-medium">{slots.length} tee time</span>
          {closedCount > 0 && (
            <span className="text-destructive ml-1">· {closedCount} ditutup</span>
          )}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {Array.from({ length: 22 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <Card className="shadow-elegant">
          <CardContent className="py-16 text-center text-muted-foreground">
            <p className="text-sm">Belum ada tee time untuk tanggal ini.</p>
            <p className="text-xs mt-1">Generate tee time dari panel di atas terlebih dahulu.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {slots.map((slot) => {
            const band = bandFor(slot.time);
            const endTime = addMins(slot.time, interval);
            const isEditing = editingId === slot.id;
            const isSaving = saving === slot.id;

            return (
              <Card
                key={slot.id}
                className={cn(
                  "shadow-elegant transition-opacity",
                  !slot.available && "opacity-50"
                )}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold tabular-nums text-xs">
                      {slot.time} – {endTime}
                    </span>
                    <span className={cn("text-[10px] font-medium", BAND_META[band].color)}>
                      {BAND_META[band].label}
                    </span>
                  </div>

                  {/* Price */}
                  {isEditing ? (
                    <div className="flex gap-1">
                      <Input
                        className="h-7 text-xs px-2"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") savePrice(slot);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        disabled={isSaving}
                        onClick={() => savePrice(slot)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        setEditingId(slot.id);
                        setEditPrice(String(slot.price));
                      }}
                    >
                      <span className="tabular-nums">{formatIDR(slot.price)}</span>
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                  )}

                  {/* Available toggle */}
                  <div className="flex items-center justify-between pt-1">
                    {slot.available ? (
                      <Badge variant="secondary" className="text-[10px] text-emerald-500 bg-emerald-500/10">
                        Open
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] text-destructive bg-destructive/10">
                        Closed
                      </Badge>
                    )}
                    <button
                      disabled={isSaving}
                      onClick={() => toggleAvailable(slot)}
                      title={slot.available ? "Tutup tee time" : "Buka tee time"}
                      className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                    >
                      {slot.available
                        ? <Unlock className="h-3.5 w-3.5" />
                        : <Lock className="h-3.5 w-3.5 text-destructive" />
                      }
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
