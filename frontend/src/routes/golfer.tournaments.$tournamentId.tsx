import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
// ponytail: currentUser, paymentMethods, networkUsers are mockData stubs — replace with real auth + saved-payment API
import { currentUser, formatIDR, paymentMethods, networkUsers } from "@/lib/mockData";
import { useApp } from "@/lib/appContext";
import { useTournament, useClub, useMyTournamentRegistrations } from "@/lib/useApi";
import { api } from "@/lib/api";
import {
  Trophy, Calendar, Clock, Users, MapPin, Award, CheckCircle2, ArrowLeft,
  ListChecks, QrCode, Target, Medal, UserPlus, X, Flag,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/golfer/tournaments/$tournamentId")({
  head: () => ({ meta: [{ title: "Tournament · Rhapsody" }] }),
  component: Page,
  notFoundComponent: () => (
    <AppShell>
      <div className="text-center py-12">
        <p className="text-muted-foreground">Tournament not found.</p>
        <Button asChild className="mt-4"><Link to="/golfer/tournaments">All tournaments</Link></Button>
      </div>
    </AppShell>
  ),
});

function statusTone(status: string) {
  switch (status) {
    case "Open": return "bg-primary text-primary-foreground";
    case "Registration Closed": return "bg-muted text-muted-foreground";
    case "Finished": return "bg-secondary text-secondary-foreground";
    default: return "";
  }
}

type TeamMember = { rhapsodyId: string; name: string };

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <span className="text-primary">{icon}</span>{children}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  );
}

function Page() {
  const { tournamentId } = Route.useParams();
  const navigate = useNavigate();
  const { isAuthenticated, requireAuth } = useApp();

  const { data: t, loading: tLoading } = useTournament(tournamentId);
  const { data: club } = useClub(t?.club_id);
  const { data: myRegs, loading: regLoading } = useMyTournamentRegistrations();

  const [regOverride, setRegOverride] = useState<"registered" | "cancelled" | null>(null);
  const existingReg = (myRegs ?? []).find((r) => (r.event_id ?? r.tournament_id) === tournamentId && ["Registered", "Confirmed", "Checked-in", "Waitlist"].includes(r.status));
  const registered = regOverride === "registered" || (regOverride !== "cancelled" && !!existingReg);
  const cancelled = regOverride === "cancelled" || (!registered && !!(myRegs ?? []).find((r) => (r.event_id ?? r.tournament_id) === tournamentId && r.status === "Cancelled"));

  const [passOpen, setPassOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [payMethod, setPayMethod] = useState(paymentMethods[0].id);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [memberInput, setMemberInput] = useState("");
  const [memberError, setMemberError] = useState("");

  if (tLoading || regLoading) {
    return (
      <AppShell>
        <Skeleton className="h-52 rounded-2xl mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </AppShell>
    );
  }

  if (!t) return null;

  const registeredCount = t.registered_count ?? t.slots_used ?? 0;
  const spotsLeft = (t.max_players ?? t.quota ?? 0) - registeredCount;
  const isFull = spotsLeft <= 0;
  const canRegister = t.status === "Open" && !isFull && !registered;
  const canWaitlist = t.status === "Open" && isFull && !registered;
  // ponytail: team_size not in ApiTournament v1 — assume solo tournament
  const teamSize = 1;
  const isTeam = false;
  const partnersNeeded = 0;
  const teamReady = true;

  const bannerBg = club?.theme_color
    ? `linear-gradient(135deg, ${club.theme_color}, ${club.theme_color}bb)`
    : "linear-gradient(135deg, #1a2a40, #3a5a80)";
  const clubName = club?.name ?? t.club_id;
  const clubLocation = [club?.location, club?.region].filter(Boolean).join(", ");

  const regEntry = existingReg ?? (regOverride === "registered" ? { tee_time: "TBD", flight: undefined as string | undefined, status: isFull ? "Waitlist" : "Registered" } : undefined);

  function addMember() {
    const input = memberInput.trim().toUpperCase();
    if (!input) return;
    if (input === currentUser.rhapsody_id) { setMemberError("That's your own ID."); return; }
    if (teamMembers.find((m) => m.rhapsodyId === input)) { setMemberError("Already added."); return; }
    const found = networkUsers.find((u) => u.rhapsody_id === input);
    if (!found) { setMemberError(`No golfer found with ID ${input}.`); return; }
    setTeamMembers((prev) => [...prev, { rhapsodyId: input, name: found.name }]);
    setMemberInput("");
    setMemberError("");
  }

  async function confirmRegistration() {
    try {
      // ponytail: payment_method not in register body v1 — handled by backend based on membership
      await api.tournaments.register(t!.id, {
        players: teamMembers.map((m) => m.rhapsodyId),
      });
    } catch {
      // ponytail: optimistic update; real error handling when API is live
    }
    setRegOverride("registered");
    setOpen(false);
    if (!isFull) setPassOpen(true);
    else toast.success("You're on the waitlist. We'll notify you if a spot opens.");
  }

  async function doCancelRegistration() {
    try {
      await api.tournaments.cancelRegistration(t!.id);
    } catch {
      // ponytail: optimistic update
    }
    setRegOverride("cancelled");
    setConfirmCancelOpen(false);
    toast.success("Registration cancelled.");
  }

  function openRegDialog() {
    if (!isAuthenticated) {
      requireAuth({
        title: "Sign up to register for this tournament",
        description: `${t!.name} · ${t!.start_date}.`,
        onSuccess: () => setOpen(true),
      });
      return;
    }
    setTeamMembers([]);
    setMemberInput("");
    setMemberError("");
    setOpen(true);
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate({ to: "/golfer/tournaments" })}>
          <ArrowLeft className="h-4 w-4" /> All tournaments
        </Button>

        <Card className="shadow-elegant overflow-hidden">
          <div className="h-32 sm:h-44 relative" style={{ background: bannerBg }}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 text-white space-y-1">
              <div className="flex items-center gap-2 text-xs opacity-90">
                <Trophy className="h-3.5 w-3.5" />{clubName}{clubLocation && ` · ${clubLocation}`}
              </div>
              <h1 className="font-display text-xl sm:text-3xl leading-tight">{t.name}</h1>
            </div>
            <div className="absolute top-3 right-3">
              <Badge className={statusTone(t.status)}>{t.status}</Badge>
            </div>
          </div>

          <CardContent className="p-4 sm:p-6 space-y-4">
            {registered && regEntry && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-primary">
                      {(regEntry as { status: string }).status === "Waitlist" ? "You're on the waitlist" : "You're registered"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(regEntry as { tee_time?: string }).tee_time && (regEntry as { tee_time: string }).tee_time !== "TBD" && `Tee ${(regEntry as { tee_time: string }).tee_time}`}
                      {(regEntry as { flight?: string }).flight && ` · Flight ${(regEntry as { flight: string }).flight}`}
                    </div>
                  </div>
                </div>
                {(regEntry as { status: string }).status === "Registered" && (
                  <Button size="sm" variant="outline" onClick={() => setPassOpen(true)}>
                    <QrCode className="h-3.5 w-3.5 mr-1" /> Pass
                  </Button>
                )}
                {(regEntry as { status: string }).status === "Checked-in" && (
                  <Button size="sm" asChild>
                    <Link to="/golfer/tournaments/$tournamentId/score" params={{ tournamentId: t.id }}>
                      <Flag className="h-3.5 w-3.5 mr-1" /> Enter score
                    </Link>
                  </Button>
                )}
              </div>
            )}
            {cancelled && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-destructive">Registration cancelled</div>
                  <div className="text-xs text-muted-foreground">Register again while spots are open.</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat icon={<Calendar className="h-4 w-4" />} label="Date" value={t.start_date ?? t.date} />
              <Stat icon={<Clock className="h-4 w-4" />} label="Deadline" value={t.registration_deadline} />
              <Stat icon={<Users className="h-4 w-4" />} label="Spots" value={`${registeredCount}/${t.max_players}`} />
              <Stat icon={<Award className="h-4 w-4" />} label="Entry fee" value={formatIDR(t.entry_fee)} />
            </div>

            {t.description && <p className="text-sm text-muted-foreground leading-relaxed">{t.description}</p>}

            {(t.status === "Finished" || t.status === "Registration Closed") && (
              <Link to="/tournaments/$tournamentId/live" params={{ tournamentId: t.id }}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                target="_blank" rel="noopener noreferrer">
                <Trophy className="h-4 w-4" /> View live leaderboard ↗
              </Link>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {canRegister ? (
                <Button size="lg" className="flex-1" onClick={openRegDialog}>
                  Register · {formatIDR(t.entry_fee)}
                </Button>
              ) : canWaitlist ? (
                <Button size="lg" variant="outline" className="flex-1 border-amber-500 text-amber-600 hover:bg-amber-50" onClick={openRegDialog}>
                  Join waitlist · Full
                </Button>
              ) : registered ? (
                <>
                  <Button size="lg" variant="outline" className="flex-1" asChild>
                    <Link to="/golfer/tournaments">My Tournaments</Link>
                  </Button>
                  <Button size="lg" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmCancelOpen(true)}>
                    Cancel registration
                  </Button>
                </>
              ) : (
                <Button size="lg" className="flex-1" disabled>{t.status}</Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Registration closes {t.registration_deadline}
              {spotsLeft > 0 && spotsLeft <= 10 && ` · Only ${spotsLeft} spots left`}
              {isFull && t.status === "Open" && " · Tournament full — join waitlist"}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="shadow-elegant">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <SectionTitle icon={<ListChecks className="h-4 w-4" />}>Tournament details</SectionTitle>
              <div className="pt-2 text-xs text-muted-foreground space-y-1">
                <div>Format: <span className="font-medium text-foreground">{t.format}</span></div>
                {t.handicap_basis && <div>Handicap basis: <span className="font-medium text-foreground">{t.handicap_basis}</span></div>}
                {t.end_date !== t.start_date && <div>End date: <span className="font-medium text-foreground">{t.end_date}</span></div>}
                {t.prize_pool && (
                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Prize pool</div>
                    <div className="font-medium text-sm text-foreground">{t.prize_pool}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <SectionTitle icon={<MapPin className="h-4 w-4" />}>Venue</SectionTitle>
              <div className="text-sm">
                <div className="font-medium">{club?.name ?? t.club_id}</div>
                {clubLocation && <div className="text-muted-foreground">{clubLocation}</div>}
              </div>
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                <Link to="/golfer/courses/$courseId" params={{ courseId: t.club_id }}>View course</Link>
              </Button>
            </CardContent>
          </Card>

          {t.prize_pool && (
            <Card className="shadow-elegant">
              <CardContent className="p-4 sm:p-5 space-y-3">
                <SectionTitle icon={<Medal className="h-4 w-4" />}>Prize pool</SectionTitle>
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-gold" />
                  <div className="font-display text-2xl">{t.prize_pool}</div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-elegant">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <SectionTitle icon={<Target className="h-4 w-4" />}>Eligibility</SectionTitle>
              <div className="text-sm text-muted-foreground">
                {t.handicap_basis
                  ? <>Handicap basis: <span className="text-foreground font-medium">{t.handicap_basis}</span></>
                  : "Open to all registered Rhapsody members."}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Registration dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isFull ? "Join waitlist" : "Confirm registration"}</DialogTitle>
            <DialogDescription>{t.name} · {t.start_date}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Entry fee</span><span className="font-medium">{formatIDR(t.entry_fee)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Registrant</span><span>{currentUser.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Format</span><span>{t.format}</span></div>
            </div>

            {isTeam && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <UserPlus className="h-3.5 w-3.5" /> Add team members ({teamMembers.length}/{partnersNeeded})
                </div>
                {teamMembers.map((m) => (
                  <div key={m.rhapsodyId} className="flex items-center justify-between rounded-lg border bg-primary/5 px-3 py-2 text-sm">
                    <div><span className="font-medium">{m.name}</span><span className="text-muted-foreground ml-2 text-xs">{m.rhapsodyId}</span></div>
                    <button type="button" onClick={() => setTeamMembers((prev) => prev.filter((x) => x.rhapsodyId !== m.rhapsodyId))} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {teamMembers.length < partnersNeeded && (
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <Input placeholder="Enter Rhapsody ID (e.g. RH-10002)" value={memberInput}
                        onChange={(e) => { setMemberInput(e.target.value.toUpperCase()); setMemberError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && addMember()} className="text-sm h-9" />
                      <Button type="button" size="sm" onClick={addMember} disabled={!memberInput.trim()}>Add</Button>
                    </div>
                    {memberError && <p className="text-xs text-destructive">{memberError}</p>}
                  </div>
                )}
              </div>
            )}

            {!isFull && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment method</div>
                <div className="space-y-1.5">
                  {paymentMethods.map((pm) => (
                    <label key={pm.id} className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${payMethod === pm.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                      <input type="radio" name="pm" checked={payMethod === pm.id} onChange={() => setPayMethod(pm.id)} className="accent-primary" />
                      <span className="text-xl">{pm.icon}</span>
                      <span className="text-sm">{pm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={confirmRegistration} disabled={!teamReady}>
              {isFull ? "Join waitlist" : `Pay ${formatIDR(t.entry_fee)} & register`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tournament pass */}
      <Dialog open={passOpen} onOpenChange={setPassOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Tournament Pass</DialogTitle>
            <DialogDescription>{t.name} · {t.start_date}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 flex flex-col items-center gap-3">
              <QrCode className="h-40 w-40 text-primary" />
              <div className="font-mono text-sm font-medium tracking-wider">TR-{currentUser.rhapsody_id}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">GH_APP · Show at registration desk</div>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="font-medium text-foreground">{currentUser.name}</div>
              {club?.name} · {t.format}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setPassOpen(false); navigate({ to: "/golfer/tournaments" }); }} className="w-full">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your registration?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll lose your spot in <span className="font-medium">{t.name}</span> on {t.start_date}. Refund policy follows the tournament rules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep registration</AlertDialogCancel>
            <AlertDialogAction onClick={doCancelRegistration} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
