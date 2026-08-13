import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/mockData";
import { useBookings } from "@/lib/useApi";
import { useClubs } from "@/lib/useApi";
import { format, parseISO } from "date-fns";
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/golfer/bookings/")({
  head: () => ({ meta: [{ title: "Booking History · Rhapsody" }] }),
  component: BookingHistory,
});

const STATUS_FILTERS = ["All", "Confirmed", "Completed", "Cancelled"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_COLOR: Record<string, string> = {
  Confirmed: "bg-primary/10 text-primary border-primary/20",
  "Checked-in": "bg-sky-500/10 text-sky-600 border-sky-500/20",
  Completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Cancelled: "bg-muted text-muted-foreground",
  "No-Show": "bg-destructive/10 text-destructive border-destructive/20",
};

function BookingHistory() {
  const [filter, setFilter] = useState<StatusFilter>("All");
  const { data: bookingList, loading, error } = useBookings();
  const { data: clubs } = useClubs();

  const clubMap = Object.fromEntries((clubs ?? []).map((c) => [c.id, c]));
  const allBookings = bookingList?.bookings ?? [];

  const filtered = filter === "All"
    ? allBookings
    : allBookings.filter((b) => b.status === filter);

  const sorted = [...filtered].sort((a, b) => b.tee_time.localeCompare(a.tee_time));

  return (
    <AppShell>
      <PageHeader
        title="Booking History"
        subtitle="All your tee time bookings across every club."
        action={
          <Button asChild>
            <Link to="/golfer/courses">Book a tee time</Link>
          </Button>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm border transition-colors",
              filter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-foreground/30"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive text-center py-8">Failed to load bookings.</p>
      )}

      {!loading && !error && sorted.length === 0 && (
        <Card className="shadow-elegant">
          <CardContent className="py-16 text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No bookings found.</p>
            {filter !== "All" && (
              <p className="text-xs mt-1">
                <button className="text-primary hover:underline" onClick={() => setFilter("All")}>
                  Show all bookings
                </button>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && !error && sorted.length > 0 && (
        <div className="space-y-2">
          {sorted.map((booking) => {
            const club = clubMap[booking.club_id];
            const teeDate = parseISO(booking.tee_time);
            const isPast = teeDate < new Date();

            return (
              <Link
                key={booking.id}
                to="/golfer/bookings/$bookingId"
                params={{ bookingId: booking.id }}
              >
                <Card className={cn(
                  "shadow-elegant hover:shadow-glow transition-shadow cursor-pointer",
                  isPast && booking.status === "Confirmed" && "opacity-60"
                )}>
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Date block */}
                    <div className="shrink-0 w-12 text-center">
                      <div className="font-display text-2xl leading-none">{format(teeDate, "d")}</div>
                      <div className="text-[10px] uppercase text-muted-foreground mt-0.5">{format(teeDate, "MMM")}</div>
                      <div className="text-[10px] text-muted-foreground">{format(teeDate, "yyyy")}</div>
                    </div>

                    <div className="w-px h-10 bg-border shrink-0" />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {club?.name ?? booking.club_id}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {format(teeDate, "HH:mm")} WIB
                        </span>
                        {club?.location && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {club.location}
                          </span>
                        )}
                        <span>{booking.players} player{booking.players > 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    {/* Right: amount + status */}
                    <div className="shrink-0 text-right space-y-1.5">
                      <div className="text-sm font-medium tabular-nums">{formatIDR(booking.amount)}</div>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", STATUS_COLOR[booking.status] ?? "")}
                      >
                        {booking.status}
                      </Badge>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
