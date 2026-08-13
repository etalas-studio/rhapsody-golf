import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatIDR } from "@/lib/mockData";
import { useTeeSheet } from "@/lib/useApi";
import { useApp } from "@/lib/appContext";
import { api, type ApiTeeSheetBooking } from "@/lib/api";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/club/bookinglist")({
  head: () => ({ meta: [{ title: "Booking List · Club Admin" }] }),
  component: BookingList,
});

function BookingList() {
  const { selectedClubId } = useApp();
  const today = new Date().toISOString().slice(0, 10);

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [applied, setApplied] = useState<{ from: string; to: string }>({ from: today, to: today });

  const { data: list, loading, error, refetch } = useTeeSheet(selectedClubId, applied.from, applied.to);
  const bookings = list ?? [];

  const counts = {
    confirmed: bookings.filter((b) => b.status === "Confirmed").length,
    checkedIn: bookings.filter((b) => b.status === "CheckedIn").length,
    completed: bookings.filter((b) => b.status === "Completed").length,
    noShow: bookings.filter((b) => b.status === "NoShow").length,
    cancelled: bookings.filter((b) => b.status === "Cancelled").length,
  };

  const isSameDay = applied.from === applied.to;
  const rangeLabel = isSameDay
    ? format(parseISO(applied.from), "d MMM yyyy")
    : `${format(parseISO(applied.from), "d MMM yyyy")} – ${format(parseISO(applied.to), "d MMM yyyy")}`;

  function apply() {
    if (from <= to) setApplied({ from, to });
  }

  return (
    <AppShell>
      <PageHeader title="Booking List" subtitle="Bookings, check-ins, and exceptions for your club." />

      {/* Date range filter */}
      <Card className="shadow-elegant mb-5">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="bl-from" className="text-xs text-muted-foreground uppercase tracking-widest">From</Label>
              <Input
                id="bl-from"
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="bl-to" className="text-xs text-muted-foreground uppercase tracking-widest">To</Label>
              <Input
                id="bl-to"
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={apply} disabled={from > to} className="mb-0.5">
              Apply
            </Button>
            {from > to && (
              <p className="text-xs text-destructive self-end mb-1">"From" must not be after "To".</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI counts */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <Stat label="Confirmed" value={counts.confirmed} />
        <Stat label="Checked-in" value={counts.checkedIn} accent="primary" />
        <Stat label="Completed" value={counts.completed} accent="success" />
        <Stat label="No-Show" value={counts.noShow} accent="warning" />
        <Stat label="Cancelled" value={counts.cancelled} accent="muted" />
      </div>

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive text-center py-4">Failed to load booking list.</p>
      )}

      {!loading && !error && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Booking list — {rangeLabel}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tee time</TableHead>
                  <TableHead>Golfer</TableHead>
                  <TableHead className="text-right">Players</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No bookings for the selected period.
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((b) => (
                    <BookingRow key={b.id} booking={b} onStatusChange={refetch} />
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}

const STATUS_BADGE: Record<string, string> = {
  Confirmed: "bg-primary/10 text-primary border-primary/20",
  CheckedIn: "bg-amber-500/10 text-amber-600 border-amber-300",
  Completed: "bg-emerald-500/10 text-emerald-600 border-emerald-300",
  Cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  NoShow: "bg-destructive/10 text-destructive border-destructive/20",
  PendingPayment: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<string, string> = {
  Confirmed: "Confirmed",
  CheckedIn: "Checked In",
  Completed: "Completed",
  Cancelled: "Cancelled",
  NoShow: "No-Show",
  PendingPayment: "Pending Payment",
};

function BookingRow({ booking, onStatusChange }: { booking: ApiTeeSheetBooking; onStatusChange?: () => void }) {
  const [status, setStatus] = useState(booking.status);
  const [loading, setLoading] = useState<string | null>(null);

  async function transition(newStatus: string) {
    setLoading(newStatus);
    try {
      await api.bookings.updateStatus(booking.id, newStatus);
      setStatus(newStatus);
      toast.success(`Booking ${newStatus === "CheckedIn" ? "checked in" : newStatus.toLowerCase()}`);
      onStatusChange?.();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setLoading(null);
    }
  }

  return (
    <TableRow>
      <TableCell className="tabular-nums text-sm">
        {format(parseISO(booking.tee_time), "d MMM · HH:mm")}
        {booking.tee_end_time && (
          <span className="text-muted-foreground">–{booking.tee_end_time}</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px]">{booking.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm">{booking.user.name}</div>
            <div className="text-[10px] text-muted-foreground font-mono">{booking.user.rhapsody_id}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right">{booking.players}</TableCell>
      <TableCell>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[status] ?? ""}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          {status === "Confirmed" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-amber-300 text-amber-600 hover:bg-amber-50"
              disabled={!!loading}
              onClick={() => transition("CheckedIn")}
            >
              {loading === "CheckedIn" ? "…" : "Check In"}
            </Button>
          )}
          {status === "Confirmed" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/5"
              disabled={!!loading}
              onClick={() => transition("NoShow")}
            >
              {loading === "NoShow" ? "…" : "No-Show"}
            </Button>
          )}
          {status === "CheckedIn" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-50"
              disabled={!!loading}
              onClick={() => transition("Completed")}
            >
              {loading === "Completed" ? "…" : "Mark Played"}
            </Button>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatIDR(booking.amount)}</TableCell>
    </TableRow>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "primary" | "success" | "warning" | "muted";
}) {
  const color =
    accent === "primary" ? "text-primary" :
    accent === "success" ? "text-success" :
    accent === "warning" ? "text-warning" :
    accent === "muted" ? "text-muted-foreground" : "";
  return (
    <Card className="shadow-elegant">
      <CardContent className="p-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className={`font-display text-3xl mt-1 ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
