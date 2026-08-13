import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatHandicap, formatIDR, handicapCategory } from "@/lib/mockData";
import { useSuperAdminMember } from "@/lib/useApi";
import { Globe2 } from "lucide-react";

export const Route = createFileRoute("/admin/members/$userId")({
  head: () => ({ meta: [{ title: "Global Member 360 · Superadmin" }] }),
  component: Global360,
});

function Global360() {
  const { userId } = Route.useParams();
  const { data: m360, loading } = useSuperAdminMember(userId);

  if (loading) {
    return (
      <AppShell>
        <Skeleton className="h-9 w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0,1,2,3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </AppShell>
    );
  }

  if (!m360) throw notFound();

  const { member: u, bookings, loyalty, vouchers, tournaments } = m360;
  const totalSpent = bookings.reduce((s, b) => s + b.amount, 0);
  const totalPts = loyalty.reduce((s, l) => s + l.points, 0);

  return (
    <AppShell>
      <div className="mb-4 text-sm">
        <Link to="/admin/members" className="text-muted-foreground hover:text-foreground">← Back to network members</Link>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-16 w-16 ring-gold ring-offset-2">
          <AvatarFallback className="bg-primary text-primary-foreground text-xl">{u.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-display text-3xl">{u.name}</h1>
          <div className="text-sm text-muted-foreground">Rhapsody ID {u.rhapsody_id}</div>
          <Badge variant="outline" className="mt-2 bg-gold/10 text-gold-foreground border-gold/30">
            <Globe2 className="h-3 w-3 mr-1" /> Cross-club view
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {u.handicap != null && (
              <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Handicap Index</div>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <div className="font-display text-3xl text-primary leading-none">{formatHandicap(u.handicap)}</div>
                  <Badge variant="secondary" className="text-[10px]">{handicapCategory(u.handicap)}</Badge>
                </div>
              </div>
            )}
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{u.email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                <Badge variant={u.membership_status === "Paid Member" ? "default" : "secondary"}
                  className={u.membership_status === "Paid Member" ? "bg-primary" : ""}>
                  {u.membership_status}
                </Badge>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><span>{u.joined_at.slice(0, 10)}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Network activity</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm text-center">
            <div className="rounded-lg border p-3">
              <div className="text-[10px] uppercase text-muted-foreground">Bookings</div>
              <div className="font-display text-2xl mt-0.5">{bookings.length}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-[10px] uppercase text-muted-foreground">Total spent</div>
              <div className="font-display text-lg mt-0.5">{formatIDR(totalSpent)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-[10px] uppercase text-muted-foreground">Loyalty pts</div>
              <div className="font-display text-2xl mt-0.5 text-primary">{totalPts.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-[10px] uppercase text-muted-foreground">Vouchers</div>
              <div className="font-display text-2xl mt-0.5">{vouchers.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Cross-club loyalty</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-48 overflow-y-auto">
            {loyalty.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No loyalty activity.</div>
            ) : loyalty.map((l, i) => (
              <div key={i} className="flex justify-between text-xs rounded border px-2 py-1.5">
                <span className="text-muted-foreground">{l.club_name ?? l.club_id}</span>
                <span className={l.points > 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-destructive font-medium"}>
                  {l.points > 0 ? "+" : ""}{l.points.toLocaleString()} pts
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader><CardTitle>All bookings (network-wide)</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {bookings.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No bookings.</div>
            ) : bookings.slice(0, 12).map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border p-2.5 text-xs">
                <div>
                  <div className="font-medium">{b.tee_time.slice(0, 10)}</div>
                  <div className="text-muted-foreground">{b.players}P</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{b.status}</Badge>
                  <span className="tabular-nums">{formatIDR(b.amount)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {tournaments && tournaments.length > 0 && (
        <Card className="shadow-elegant mb-6">
          <CardHeader><CardTitle>Tournament registrations</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {tournaments.map((r) => (
              <div key={r.id} className="rounded-lg border px-3 py-2 text-sm flex items-center gap-2">
                <span className="font-medium">{r.tournament?.name ?? r.tournament_id}</span>
                <Badge variant="secondary">{r.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {vouchers.length > 0 && (
        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Vouchers</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {vouchers.map((v) => (
              <div key={v.id} className="rounded-lg border px-3 py-2 text-sm flex items-center gap-2">
                <span className="font-mono text-xs">{v.voucher_code}</span>
                <span className="text-muted-foreground">
                  {v.discount_type === "Percentage" ? `${v.discount_value}%` : formatIDR(v.discount_value)} off
                </span>
                <Badge variant="outline">{v.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
