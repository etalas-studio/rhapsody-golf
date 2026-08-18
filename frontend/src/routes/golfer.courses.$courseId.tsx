import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/mockData";
import { useClub, useTournaments, useAdminCampaigns } from "@/lib/useApi";
import { useApp } from "@/lib/appContext";
import { useEffect } from "react";
import { MapPin, Star, Check } from "lucide-react";

export const Route = createFileRoute("/golfer/courses/$courseId")({
  head: () => ({ meta: [{ title: "Course · Rhapsody" }] }),
  component: CourseDetail,
  notFoundComponent: () => (
    <AppShell><div className="p-12 text-center text-muted-foreground">Course not found.</div></AppShell>
  ),
});

// Standard pricing per PRD §5.4
const PRICE_WEEKDAY = 1_250_000;
const PRICE_WEEKEND = 1_850_000;
const MEMBER_WEEKDAY = 950_000;
const MEMBER_WEEKEND = 1_400_000;

function CourseDetail() {
  const { courseId } = Route.useParams();
  const { bumpCourseView, appMode } = useApp();
  useEffect(() => { bumpCourseView(); }, [courseId, bumpCourseView]);

  const { data: club, loading, error } = useClub(courseId);
  const { data: tournamentDataRaw } = useTournaments({ clubId: courseId });
  // ponytail: campaigns API requires club admin auth; showing empty until golfer-facing promotions endpoint is added
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaignData } = useAdminCampaigns((appMode as any) === "club_admin" ? courseId : "");

  const tournaments = tournamentDataRaw ?? [];
  const promos = (campaignData ?? []).filter((c) => c.status === "Active");

  // ApiClub lacks banner/logo/facilities/description — use theme_color as bg, graceful fallbacks elsewhere
  const bannerBg = club?.theme_color
    ? `linear-gradient(135deg, ${club.theme_color}, ${club.theme_color}bb)`
    : "linear-gradient(135deg, #1a2a40, #3a5a80)";

  const locationStr = [club?.location, club?.region].filter(Boolean).join(", ");

  if (loading) {
    return (
      <AppShell>
        <Skeleton className="h-48 rounded-2xl mb-5" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (error || !club) {
    return (
      <AppShell>
        <div className="p-12 text-center text-muted-foreground">Course not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="rounded-2xl overflow-hidden shadow-elegant mb-5 md:mb-6">
        <div className="h-40 sm:h-48 md:h-64 relative flex items-end p-4 md:p-6" style={{ background: bannerBg }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="relative z-10 flex items-end justify-between w-full flex-wrap gap-2 md:gap-3 text-white">
            <div className="min-w-0">
              {locationStr && (
                <div className="flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-widest opacity-80">
                  <MapPin className="h-3 w-3" /> {locationStr}
                </div>
              )}
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl mt-1 leading-tight">{club.name}</h1>
              <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-xs sm:text-sm">
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-gold text-gold" /> 4.5</span>
                <span>·</span>
                <span>From {formatIDR(PRICE_WEEKDAY)}</span>
              </div>
            </div>
            <Badge className="bg-white/15 text-white border border-white/30 text-[10px] sm:text-xs">
              Visitor
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-elegant">
            <CardHeader><CardTitle>About this course</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {/* ponytail: description not in ApiClub v1 — replace when backend adds it */}
                A premier {club.holes}-hole, par {club.par} golf course offering world-class facilities.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {/* ponytail: facilities array not in ApiClub v1 — replace when backend adds it */}
                {["Clubhouse", "Pro Shop", "Driving Range", "Restaurant"].map((f) => (
                  <Badge key={f} variant="secondary" className="font-normal"><Check className="h-3 w-3 mr-1" />{f}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              <PriceRow label="Weekday green fee" price={PRICE_WEEKDAY} />
              <PriceRow label="Weekend green fee" price={PRICE_WEEKEND} />
              <PriceRow label="Member weekday" price={MEMBER_WEEKDAY} accent />
              <PriceRow label="Member weekend" price={MEMBER_WEEKEND} accent />
            </CardContent>
          </Card>

          {promos.length > 0 && (
            <Card className="shadow-elegant">
              <CardHeader><CardTitle>Promotions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {promos.map((p) => (
                  <div key={p.id} className="flex justify-between items-center rounded-lg border p-3">
                    <div>
                      <div className="font-medium text-sm">{p.title}</div>
                      {p.end_date && <div className="text-xs text-muted-foreground">Until {p.end_date}</div>}
                    </div>
                    <Badge variant="outline">{p.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="shadow-elegant sticky top-24">
            <CardHeader><CardTitle>Book a tee time</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">Real-time tee sheet for the next 7 days.</div>
              <Button asChild className="w-full h-11">
                <Link to="/golfer/book/$courseId" params={{ courseId: club.id }}>Choose date & time</Link>
              </Button>
              <div className="text-xs text-muted-foreground rounded-md bg-muted p-2.5">
                {club.holes} holes · Par {club.par} · {locationStr}
              </div>
            </CardContent>
          </Card>

          {tournaments.length > 0 && (
            <Card className="shadow-elegant">
              <CardHeader><CardTitle>Tournaments</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {tournaments.map((t) => (
                  <div key={t.id} className="rounded-lg border p-3">
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.start_date} · {t.format}</div>
                    <Badge variant="outline" className="mt-2 text-[10px]">{t.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function PriceRow({ label, price, accent }: { label: string; price: number; accent?: boolean }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-display text-xl mt-1 ${accent ? "text-primary" : ""}`}>{formatIDR(price)}</div>
    </div>
  );
}
