import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/mockData";
import { useClub, useTeeSlots } from "@/lib/useApi";
import { useState, useRef } from "react";
import {
  MapPin, ChevronLeft, CheckCircle2, ShoppingBag,
  UtensilsCrossed, Sparkles, GraduationCap, Lock, BedDouble,
  Star, Ruler, Flag, Target, Car, KeyRound, Moon, Footprints, Dumbbell, Wrench,
} from "lucide-react";

export const Route = createFileRoute("/app/courses/$courseId")({
  head: () => ({ meta: [{ title: "Course Detail · Rhapsody App" }] }),
  component: AppCourseDetail,
});

function clubBanner(themeColor: string | null) {
  return themeColor
    ? `linear-gradient(135deg, ${themeColor}, ${themeColor}bb)`
    : "linear-gradient(135deg, #1a2a40, #3a5a80)";
}

function slotEnd(time: string) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + 30;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

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

type TeeTab = "early" | "prime" | "twilight";
const TEE_TABS: { key: TeeTab; label: string; range: [string, string] }[] = [
  { key: "early",    label: "Early",    range: ["06:00", "10:30"] },
  { key: "prime",    label: "Prime",    range: ["11:00", "13:30"] },
  { key: "twilight", label: "Twilight", range: ["14:00", "16:30"] },
];

function AppCourseDetail() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const { data: club, loading, error } = useClub(courseId);

  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const [date, setDate] = useState(dates[0]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [teeTab, setTeeTab] = useState<TeeTab>("early");
  const { data: slots, loading: slotsLoading } = useTeeSlots(courseId, date);

  // Carousel
  const [carouselIdx, setCarouselIdx] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <MobileShell>
        <Skeleton className="h-56 w-full" />
        <div className="px-4 py-5 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </MobileShell>
    );
  }

  if (error || !club) {
    return (
      <MobileShell>
        <div className="px-4 py-8 text-center text-muted-foreground">Course not found.</div>
      </MobileShell>
    );
  }

  const priceIncludes = club.price_includes ?? [];

  // Carousel images: banner first, then image_urls
  const carouselImages: string[] = [
    ...(club.banner_url ? [club.banner_url] : []),
    ...(club.image_urls ?? []),
  ];
  const hasImages = carouselImages.length > 0;

  function handleCarouselScroll() {
    const el = carouselRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setCarouselIdx(idx);
  }

  // Filter slots by active tee tab time range
  const activeTab = TEE_TABS.find((t) => t.key === teeTab)!;
  const tabSlots = (slots ?? []).filter((s) => {
    const mins = timeToMinutes(s.time);
    return mins >= timeToMinutes(activeTab.range[0]) && mins <= timeToMinutes(activeTab.range[1]);
  });

  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  function isSlotPast(slotTime: string) {
    return date === dates[0] && timeToMinutes(slotTime) <= nowMinutes;
  }

  function handleBook() {
    if (!selectedSlot) return;
    const slotData = tabSlots.find((s) => s.time === selectedSlot);
    navigate({
      to: "/app/book/$courseId",
      params: { courseId },
      search: { date, slot: selectedSlot, price: slotData?.price ?? club?.starting_price ?? 0 },
    });
  }

  const mapsQuery = encodeURIComponent([club.name, club.location].filter(Boolean).join(" "));

  return (
    <MobileShell>
      <div className="pb-24">
        {/* ── Carousel ── */}
        <div className="relative h-56">
          {/* scroll-snap track */}
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            className="flex h-full overflow-x-auto no-scrollbar"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
          >
            {hasImages ? carouselImages.map((src, i) => (
              <div
                key={i}
                className="h-full shrink-0 w-full"
                style={{ scrollSnapAlign: "start" }}
              >
                <img src={src} alt={`${club.name} ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            )) : (
              <div className="h-full w-full shrink-0" style={{ background: clubBanner(club.theme_color) }} />
            )}
          </div>
          {/* gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {/* back button */}
          <Link to="/app/courses" className="absolute top-4 left-4 z-10">
            <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-black/40 border-0 text-white hover:bg-black/60">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          {/* club name + dots */}
          <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10">
            <h1 className="font-display text-2xl text-white leading-tight">{club.name}</h1>
            <div className="flex items-center justify-between mt-0.5">
              <p className="flex items-center gap-1 text-sm text-white/80">
                <MapPin className="h-3 w-3 shrink-0" />
                {[club.location, club.region].filter(Boolean).join(", ")}
              </p>
              {carouselImages.length > 1 && (
                <div className="pointer-events-auto flex gap-1 shrink-0 ml-2">
                  {carouselImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const el = carouselRef.current;
                        if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
                      }}
                      className={`h-1.5 rounded-full transition-all ${
                        i === carouselIdx ? "w-4 bg-white" : "w-1.5 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-5 space-y-6">
          {/* ── Info row ── */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {[
                { Icon: Flag,   label: "Holes", value: club.number_of_holes ?? null, fmt: (v: number) => String(v) },
                { Icon: Target, label: "Par",   value: club.par ?? null,          fmt: (v: number) => String(v) },
                { Icon: Ruler,  label: "Yards", value: club.length_yards ?? null, fmt: (v: number) => v.toLocaleString("id-ID") },
              ].map(({ Icon, label, value, fmt }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-2.5 px-1 text-center">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-sm leading-none">{value != null ? fmt(value) : "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { Icon: Star, label: "Course Rating", value: club.course_rating ?? null },
                { Icon: Star, label: "Slope Rating",  value: club.slope_rating  ?? null },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-2.5 px-1 text-center">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-sm leading-none">{value != null ? value : "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {club.starting_price ? (
            <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Starting from</span>
              <span className="text-xs font-semibold text-primary">{formatIDR(club.starting_price)}</span>
            </div>
          ) : null}

          {club.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">{club.description}</p>
          )}

          {/* ── Date picker (today + 6 future days, no past) ── */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Select date
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
              {dates.map((d) => {
                // Parse as local date to avoid timezone shift
                const dt = new Date(d + "T00:00:00");
                return (
                  <button
                    key={d}
                    onClick={() => { setDate(d); setSelectedSlot(null); }}
                    className={`min-w-[64px] rounded-xl border p-2.5 text-center transition shrink-0 ${
                      d === date
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border"
                    }`}
                  >
                    <div className="text-[10px] uppercase opacity-80">
                      {dt.toLocaleDateString("en-GB", { weekday: "short" })}
                    </div>
                    <div className="font-display text-xl">{dt.getDate()}</div>
                    <div className="text-[10px] opacity-80">
                      {dt.toLocaleDateString("en-GB", { month: "short" })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Tee time tabs ── */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Select tee time
            </h2>
            <div className="flex gap-2 mb-3">
              {TEE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setTeeTab(tab.key); setSelectedSlot(null); }}
                  className={`flex-1 rounded-xl border py-2 text-xs font-medium transition ${
                    teeTab === tab.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {tab.label}
                  <div className="text-[9px] opacity-70 mt-0.5">{tab.range[0]}–{tab.range[1]}</div>
                </button>
              ))}
            </div>

            {slotsLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : !tabSlots.length ? (
              <p className="text-sm text-muted-foreground">No slots available for this period.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {tabSlots.map((s) => {
                  const isSelected = selectedSlot === s.time;
                  const past = isSlotPast(s.time);
                  const unavailable = !s.available || past;
                  return (
                    <button
                      key={s.id ?? s.time}
                      disabled={unavailable}
                      onClick={() => setSelectedSlot(s.time)}
                      className={`rounded-xl border p-3 text-left transition ${
                        unavailable
                          ? "opacity-40 cursor-not-allowed bg-muted border-border"
                          : isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "bg-card border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="text-sm font-medium">{s.time}–{slotEnd(s.time)}</p>
                      <p className={`text-xs mt-0.5 ${unavailable ? "text-muted-foreground" : "text-primary font-semibold"}`}>
                        {past ? "Passed" : s.available ? formatIDR(s.price) + " / pax" : "Booked"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Prices include */}
          {priceIncludes.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Prices include
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {priceIncludes.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amenities */}
          {club.facilities && club.facilities.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Amenities
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {club.facilities.map((f) => {
                  const Icon = AMENITY_ICONS[f] ?? CheckCircle2;
                  return (
                    <div key={f} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <span>{f}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Location ── */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Location
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              {[club.location, club.region].filter(Boolean).join(", ")}
            </p>
            {/* Google Maps embed preview */}
            <div className="rounded-xl overflow-hidden border border-border mb-3 h-40">
              <iframe
                title="Location map"
                width="100%"
                height="100%"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${mapsQuery}&output=embed`}
                className="border-0"
              />
            </div>
            <a
              href={`https://maps.google.com?q=${mapsQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-card py-3 text-sm font-medium hover:bg-muted transition"
            >
              <MapPin className="h-4 w-4 text-primary" />
              View on Google Maps
            </a>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-16 left-0 right-0 max-w-lg mx-auto px-4 pb-3 pt-2 bg-background/95 backdrop-blur border-t border-border">
        <Button
          size="lg"
          className="w-full shadow-glow"
          disabled={!selectedSlot}
          onClick={handleBook}
        >
          {selectedSlot
            ? `Book ${selectedSlot}–${slotEnd(selectedSlot)}`
            : "Select a tee time"}
        </Button>
      </div>
    </MobileShell>
  );
}
