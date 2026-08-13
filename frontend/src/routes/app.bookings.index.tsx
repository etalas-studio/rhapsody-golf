import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/mockData";
import { useBookings } from "@/lib/useApi";
import { type ApiBooking } from "@/lib/api";
import { Calendar, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/app/bookings/")({
  head: () => ({ meta: [{ title: "My Bookings · Rhapsody App" }] }),
  component: AppBookings,
});

const STATUS_STYLES: Record<string, string> = {
  "Confirmed":      "bg-primary text-primary-foreground hover:bg-primary",
  "CheckedIn":      "bg-amber-500 text-white hover:bg-amber-500",
  "Completed":      "bg-muted text-muted-foreground hover:bg-muted",
  "Cancelled":      "bg-destructive text-destructive-foreground hover:bg-destructive",
  "NoShow":         "bg-destructive text-destructive-foreground hover:bg-destructive",
  "PendingPayment": "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300",
};

const STATUS_LABEL: Record<string, string> = {
  Confirmed: "Confirmed",
  CheckedIn: "Checked In",
  Completed: "Completed",
  Cancelled: "Cancelled",
  NoShow: "No-Show",
  PendingPayment: "Pending Payment",
};

function AppBookings() {
  const { data, loading, error } = useBookings({ limit: 50 });
  const bookings = data?.bookings ?? [];

  const pending = bookings.filter((b) => b.status === "PendingPayment")
    .sort((a, b) => b.tee_time.localeCompare(a.tee_time));
  const upcoming = bookings.filter((b) => ["Confirmed", "CheckedIn"].includes(b.status))
    .sort((a, b) => a.tee_time.localeCompare(b.tee_time));
  const past = bookings.filter((b) => ["Completed", "Cancelled", "NoShow"].includes(b.status))
    .sort((a, b) => b.tee_time.localeCompare(a.tee_time));

  return (
    <MobileShell>
      <div className="px-4 py-5 space-y-5">
        <h1 className="font-display text-2xl">My Bookings</h1>

        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive text-center py-4">Failed to load bookings.</p>
        )}

        {!loading && !error && (
          <>
            {pending.length > 0 && (
              <Section title="Awaiting Payment">
                {pending.map((b) => <BookingRow key={b.id} b={b} />)}
              </Section>
            )}
            {upcoming.length > 0 && (
              <Section title="Upcoming">
                {upcoming.map((b) => <BookingRow key={b.id} b={b} />)}
              </Section>
            )}
            {past.length > 0 && (
              <Section title="Past">
                {past.slice(0, 20).map((b) => <BookingRow key={b.id} b={b} />)}
              </Section>
            )}
            {pending.length === 0 && upcoming.length === 0 && past.length === 0 && (
              <div className="text-center py-10">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No bookings yet.</p>
                <Link to="/app/courses" className="text-sm text-primary mt-1 block">Browse courses →</Link>
              </div>
            )}
          </>
        )}
      </div>
    </MobileShell>
  );
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function BookingRow({ b }: { b: ApiBooking }) {
  const teeDate = parseISO(b.tee_time);
  const timeRange = b.tee_end_time
    ? `${format(teeDate, "HH:mm")}–${b.tee_end_time}`
    : format(teeDate, "HH:mm");
  return (
    <Link to="/app/bookings/$bookingId" params={{ bookingId: b.id }}>
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card shadow-sm px-4 py-4 gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="font-semibold text-sm truncate">{b.club_name ?? b.club_id}</p>
            <Badge className={`shrink-0 ${STATUS_STYLES[b.status] ?? ""}`}>{STATUS_LABEL[b.status] ?? b.status}</Badge>
          </div>
          <p className="text-sm text-foreground">{format(teeDate, "d MMM yyyy")} · {timeRange}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground">{b.players} {b.players === 1 ? "Player" : "Players"}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs font-medium text-foreground">{formatIDR(b.amount)}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );
}
