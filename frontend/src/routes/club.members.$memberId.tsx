import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/appContext";
import { formatHandicap, formatIDR, handicapCategory } from "@/lib/mockData";
import { useAdminMember } from "@/lib/useApi";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/club/members/$memberId")({
  head: () => ({ meta: [{ title: "Member 360 · Club Admin" }] }),
  component: Member360,
  notFoundComponent: () => (
    <AppShell>
      <div className="flex items-center gap-2 text-muted-foreground">
        <ShieldAlert className="h-5 w-5" /> Member not found or not in your club.
      </div>
    </AppShell>
  ),
});

function Member360() {
  const { memberId } = Route.useParams();
  const { selectedClubId } = useApp();
  const { data: m360, loading } = useAdminMember(memberId, selectedClubId);

  if (loading) {
    return (
      <AppShell>
        <Skeleton className="h-9 w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[0,1,2,3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </AppShell>
    );
  }

  if (!m360) throw notFound();

  const { member: u, bookings, loyalty, vouchers, tournaments } = m360;
  const spending = bookings.reduce((s, b) => s + b.amount, 0);
  const pts = loyalty.reduce((s, l) => s + l.points, 0);
  const mem = (m360.memberships as { club_id: string; club_member_id?: string; membership_status?: string }[])
    .find((x) => x.club_id === selectedClubId);

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/club/members"><ArrowLeft className="h-4 w-4" /> All members</Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl">{u.name}</h1>
          <p className="text-xs text-muted-foreground">Member 360 · data scoped to your club only</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <Avatar className="h-16 w-16 mx-auto ring-gold ring-offset-2">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">{u.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="mt-3 font-display text-xl">{u.name}</div>
            <Badge variant="outline" className="mt-1">Rhapsody ID {u.rhapsody_id}</Badge>
            {mem?.club_member_id && (
              <div className="mt-1 text-xs text-muted-foreground">Club ID {mem.club_member_id}</div>
            )}
            {u.handicap != null && (
              <div className="mt-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Handicap Index</div>
                <div className="mt-0.5 flex items-baseline justify-center gap-2">
                  <div className="font-display text-3xl text-primary leading-none">{formatHandicap(u.handicap)}</div>
                  <Badge variant="secondary" className="text-[10px]">{handicapCategory(u.handicap)}</Badge>
                </div>
              </div>
            )}
            <div className="mt-4 text-sm text-muted-foreground space-y-1">
              <div className="flex justify-between"><span>Email</span><span className="text-foreground truncate ml-2">{u.email}</span></div>
              <div className="flex justify-between"><span>Status</span>
                <Badge variant={u.membership_status === "Paid Member" ? "default" : "secondary"} className={u.membership_status === "Paid Member" ? "bg-primary" : ""}>
                  {u.membership_status}
                </Badge>
              </div>
              <div className="flex justify-between"><span>Joined</span><span className="text-foreground">{u.joined_at.slice(0, 10)}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Activity at your club</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm text-center">
              <div className="rounded-lg border p-3">
                <div className="text-[10px] uppercase text-muted-foreground">Bookings</div>
                <div className="font-display text-2xl mt-0.5">{bookings.length}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-[10px] uppercase text-muted-foreground">Spending</div>
                <div className="font-display text-lg mt-0.5">{formatIDR(spending)}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-[10px] uppercase text-muted-foreground">Loyalty pts</div>
                <div className="font-display text-2xl mt-0.5 text-primary">{pts.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-[10px] uppercase text-muted-foreground">Vouchers</div>
                <div className="font-display text-2xl mt-0.5">{vouchers.length}</div>
              </div>
            </div>

            {loyalty.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Loyalty ledger</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {loyalty.map((l, i) => (
                    <div key={i} className="flex justify-between text-xs rounded border px-2 py-1.5">
                      <span className="text-muted-foreground">{l.club_name}</span>
                      <span className={l.points > 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-destructive font-medium"}>
                        {l.points > 0 ? "+" : ""}{l.points.toLocaleString()} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Recent bookings</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {bookings.length === 0 ? (
              <div className="text-sm text-muted-foreground">No bookings at your club yet.</div>
            ) : bookings.slice(0, 8).map((b) => (
              <div key={b.id} className="rounded-lg border p-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">{b.tee_time.slice(0, 10)}</span>
                  <Badge variant="outline" className="text-[10px]">{b.status}</Badge>
                </div>
                <div className="text-muted-foreground mt-0.5">{b.players}P · {formatIDR(b.amount)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {tournaments && tournaments.length > 0 && (
          <Card className="shadow-elegant lg:col-span-3">
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
          <Card className="shadow-elegant lg:col-span-3">
            <CardHeader><CardTitle>Vouchers</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {vouchers.map((v) => (
                <div key={v.id} className="rounded-lg border px-3 py-2 text-sm flex items-center gap-2">
                  <span className="font-mono text-xs">{v.voucher_code}</span>
                  <span className="text-muted-foreground">{v.discount_type === "Percentage" ? `${v.discount_value}%` : formatIDR(v.discount_value)} off</span>
                  <Badge variant="outline">{v.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
