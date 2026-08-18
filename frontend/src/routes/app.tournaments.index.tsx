import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/mockData";
import { useEvents, useMyEventRegistrations } from "@/lib/useApi";
import type { ApiEvent, ApiEventRegistration } from "@/lib/api";
import { Trophy, CalendarDays, Users, ChevronRight, MapPin, UserCircle } from "lucide-react";
import { useState } from "react";
import { format, parseISO, isThisWeek } from "date-fns";

export const Route = createFileRoute("/app/tournaments/")({
  head: () => ({ meta: [{ title: "Events · Rhapsody App" }] }),
  component: AppEvents,
});

type FilterKey = "all" | "free" | "this-week";

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "All",
  free: "Free",
  "this-week": "This Week",
};

const STATUS_COLOR: Record<string, string> = {
  Confirmed: "bg-primary text-primary-foreground hover:bg-primary",
  CheckedIn: "bg-emerald-500 text-white hover:bg-emerald-500",
  PendingPayment: "bg-amber-500 text-white hover:bg-amber-500",
  Cancelled: "bg-muted text-muted-foreground hover:bg-muted",
  Waitlist: "bg-muted text-muted-foreground hover:bg-muted",
};

function AppEvents() {
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedReg, setSelectedReg] = useState<ApiEventRegistration | null>(null);

  const { data: events, loading: eLoading } = useEvents();
  const { data: myRegs, loading: rLoading } = useMyEventRegistrations();

  const allEvents = events ?? [];
  const filtered = allEvents.filter((e) => {
    if (filter === "free") return e.entry_fee === 0;
    if (filter === "this-week") return isThisWeek(parseISO(e.date), { weekStartsOn: 1 });
    return true;
  });

  const activeRegs = (myRegs ?? []).filter((r) =>
    ["Confirmed", "CheckedIn", "PendingPayment"].includes(r.status)
  );
  const pastRegs = (myRegs ?? []).filter((r) =>
    !["Confirmed", "CheckedIn", "PendingPayment"].includes(r.status)
  );

  return (
    <MobileShell>
      <div className="px-4 py-5 space-y-4">
        <h1 className="font-display text-2xl">Events</h1>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["browse", "mine"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              }`}
            >
              {t === "browse"
                ? "All Events"
                : `My Events${activeRegs.length > 0 ? ` (${activeRegs.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* Browse tab */}
        {tab === "browse" && (
          <>
            <div className="flex gap-2">
              {(Object.keys(FILTER_LABELS) as FilterKey[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filter === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {FILTER_LABELS[f]}
                </button>
              ))}
            </div>

            {eLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No events found.</p>
            ) : (
              <div className="space-y-5">
                {filtered.map((e) => <EventCard key={e.id} event={e} />)}
              </div>
            )}
          </>
        )}

        {/* My Events tab */}
        {tab === "mine" && (
          <>
            {rLoading ? (
              <div className="space-y-3">
                {[0, 1].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : activeRegs.length === 0 && pastRegs.length === 0 ? (
              <div className="text-center py-10">
                <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No event registrations yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeRegs.length > 0 && (
                  <section className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Upcoming</p>
                    {activeRegs.map((r) => (
                      <RegCard key={r.id} reg={r} onClick={() => setSelectedReg(r)} />
                    ))}
                  </section>
                )}
                {pastRegs.length > 0 && (
                  <section className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Past</p>
                    {pastRegs.map((r) => (
                      <RegCard key={r.id} reg={r} onClick={() => setSelectedReg(r)} />
                    ))}
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Registration detail sheet */}
      <Sheet open={!!selectedReg} onOpenChange={(o) => { if (!o) setSelectedReg(null); }}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-y-auto rounded-t-2xl max-w-md mx-auto left-0 right-0 px-5">
          {selectedReg && <RegDetail reg={selectedReg} />}
        </SheetContent>
      </Sheet>
    </MobileShell>
  );
}

/* ── Event browse card ───────────────────────────────────────────────────── */

function EventCard({ event: e }: { event: ApiEvent }) {
  const slotsLeft = e.slots_available ?? (e.quota - (e.slots_used ?? 0));
  const isFull = slotsLeft <= 0;

  return (
    <Link to="/app/tournaments/$tournamentId" params={{ tournamentId: e.id }}>
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm mb-5">
        {e.hero_image_url && (
          <img src={e.hero_image_url} alt={e.title} className="w-full h-85 object-fit" />
        )}
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{e.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{e.clubs?.name ?? ""}</p>
            </div>
            <Badge className={e.entry_fee === 0 ? "bg-emerald-500 text-white shrink-0 hover:bg-emerald-500" : "shrink-0"}>
              {e.entry_fee === 0 ? "Free" : formatIDR(e.entry_fee)}
            </Badge>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {format(parseISO(e.date), "d MMM yyyy")} · {e.starting_time}
            </span>
            {e.venue && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{e.venue}</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-xs ${isFull ? "text-destructive" : "text-muted-foreground"}`}>
              <Users className="h-3 w-3 inline mr-1" />
              {isFull ? "Full" : `${slotsLeft} spot${slotsLeft !== 1 ? "s" : ""} left`}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── My registration list card ───────────────────────────────────────────── */

function RegCard({ reg: r, onClick }: { reg: ApiEventRegistration; onClick: () => void }) {
  const event = r.events;
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 gap-3">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{event?.title ?? r.tournament_id}</p>
          {event && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(parseISO(event.date), "d MMM yyyy")} · {event.starting_time}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={STATUS_COLOR[r.status] ?? "bg-muted text-muted-foreground hover:bg-muted"}>
            {r.status}
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </button>
  );
}

/* ── Registration detail inside sheet ───────────────────────────────────── */

function RegDetail({ reg: r }: { reg: ApiEventRegistration }) {
  const event = r.events;

  return (
    <div className="space-y-5 pb-4">
      <SheetHeader>
        <SheetTitle className="font-display text-xl text-left">Registration Detail</SheetTitle>
        {event && <p className="text-sm text-muted-foreground text-left">{event.title}</p>}
      </SheetHeader>

      {/* Status */}
      <Badge className={`${STATUS_COLOR[r.status] ?? "bg-muted text-muted-foreground"} text-sm px-3 py-1`}>
        {r.status}
      </Badge>

      <Separator />

      {/* Event info */}
      {event && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Event</p>
          <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
            <Row label="Date" value={format(parseISO(event.date), "EEEE, d MMMM yyyy")} />
            <Row label="Starting time" value={event.starting_time} />
            {event.venue && <Row label="Venue" value={event.venue} />}
          </div>
        </div>
      )}

      {/* Registration info */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Registration</p>
        <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
          <Row label="Registered on" value={format(parseISO(r.registered_at), "d MMM yyyy, HH:mm")} />
          <Row
            label="Registration fee"
            value={r.total_fee === 0 ? "Free" : formatIDR(r.total_fee)}
          />
        </div>
      </div>

      {/* Players */}
      {r.event_participants && r.event_participants.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Players ({r.event_participants.length})
          </p>
          <div className="rounded-xl border bg-card divide-y">
            {r.event_participants.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {p.name}
                    {p.is_registrant && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">(you)</span>
                    )}
                  </p>
                  {p.email && <p className="text-xs text-muted-foreground truncate">{p.email}</p>}
                  {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
