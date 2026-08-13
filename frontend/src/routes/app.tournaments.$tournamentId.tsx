import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
// ponytail: currentUser is auth stub — replace with supabase.auth in Phase 1
import { currentUser, formatIDR } from "@/lib/mockData";
import { useApp } from "@/lib/appContext";
import { useClub, useMyTournamentRegistrations, useTournament } from "@/lib/useApi";
import { api } from "@/lib/api";
import { Trophy, Calendar, Users, ChevronLeft, CheckCircle2, QrCode } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/tournaments/$tournamentId")({
  head: () => ({ meta: [{ title: "Tournament · Rhapsody App" }] }),
  component: AppTournamentDetail,
});

function AppTournamentDetail() {
  const { tournamentId } = Route.useParams();
  const { isAuthenticated, requireAuth } = useApp();
  const navigate = useNavigate();

  const { data: t, loading: tLoading } = useTournament(tournamentId);
  const { data: club, loading: clubLoading } = useClub(t?.club_id);
  const { data: myRegs } = useMyTournamentRegistrations();

  const myReg = (myRegs ?? []).find((r) => r.tournament_id === tournamentId);
  const [regOverride, setRegOverride] = useState<"registered" | "cancelled" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const effectiveReg = regOverride === "registered"
    ? { status: "Registered" }
    : regOverride === "cancelled"
    ? null
    : myReg;

  const loading = tLoading || clubLoading;

  if (loading) {
    return (
      <MobileShell>
        <div className="px-4 py-5 space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-7 w-64" />
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        </div>
      </MobileShell>
    );
  }

  if (!t) {
    return (
      <MobileShell>
        <div className="px-4 py-10 text-center text-muted-foreground">Tournament not found.</div>
      </MobileShell>
    );
  }

  const tid = t.id;
  const tname = t.name;
  const registered = t.registered_count ?? 0;
  const isFull = registered >= t.max_players;
  const isOpen = t.status === "Open";
  const canRegister = isOpen && !effectiveReg;
  const canCancel = !!effectiveReg && ["Registered", "Confirmed", "Waitlist"].includes(effectiveReg.status);

  async function handleRegister() {
    const doReg = async () => {
      try {
        // ponytail: payment_method not in register body v1
        await api.tournaments.register(tid, { players: undefined });
      } catch {
        // ponytail: optimistic update; real error handling when API is live
      }
      setRegOverride("registered");
      setConfirmOpen(false);
      toast.success("Registered!", { description: tname });
    };
    if (!isAuthenticated) {
      requireAuth({
        title: "Sign up to register",
        description: `Join ${tname} — one Rhapsody ID across every club.`,
        onSuccess: doReg,
      });
      return;
    }
    await doReg();
  }

  async function handleCancel() {
    try {
      await api.tournaments.cancelRegistration(tid);
    } catch {
      // ponytail: optimistic
    }
    setRegOverride("cancelled");
    setCancelOpen(false);
    toast.success("Registration cancelled.");
  }

  return (
    <MobileShell>
      <div className="px-4 py-5 space-y-5">
        {/* Back */}
        <Link to="/app/tournaments" className="flex items-center gap-1 text-sm text-muted-foreground -ml-1">
          <ChevronLeft className="h-4 w-4" /> Tournaments
        </Link>

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">{t.format}</Badge>
            <Badge className={t.status === "Open" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}>
              {t.status}
            </Badge>
          </div>
          <h1 className="font-display text-2xl">{t.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{club?.name ?? t.club_id}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: <Calendar className="h-3.5 w-3.5" />, label: "Date", value: t.start_date },
            { icon: <Trophy className="h-3.5 w-3.5" />, label: "Entry fee", value: formatIDR(t.entry_fee) },
            { icon: <Users className="h-3.5 w-3.5" />, label: "Players", value: `${registered}/${t.max_players}` },
            { icon: <Calendar className="h-3.5 w-3.5" />, label: "Register by", value: t.registration_deadline ?? "—" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card p-3">
              <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">{s.icon}{s.label}</p>
              <p className="font-medium text-sm mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Description */}
        {t.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{t.description}</p>
        )}

        {/* Registered pass */}
        {effectiveReg && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-center">
            <CheckCircle2 className="h-7 w-7 text-primary mx-auto mb-2" />
            <p className="font-semibold text-sm">You're registered</p>
            <p className="text-xs text-muted-foreground mb-3">{effectiveReg.status}</p>
            <QrCode className="h-20 w-20 text-primary mx-auto" />
            <p className="font-mono text-xs mt-2">{currentUser.rhapsody_id}</p>
          </div>
        )}

        {/* CTAs */}
        {canRegister && (
          <Button className="w-full" onClick={() => setConfirmOpen(true)} disabled={isFull && !isOpen}>
            {isFull ? "Join waitlist" : "Register now"} · {formatIDR(t.entry_fee)}
          </Button>
        )}

        {canCancel && (
          <Button variant="outline" className="w-full" onClick={() => setCancelOpen(true)}>
            Cancel registration
          </Button>
        )}

        {t.status === "Open" && effectiveReg && (
          <Button variant="secondary" className="w-full" asChild>
            <Link to="/app/tournaments/$tournamentId/score" params={{ tournamentId }}>
              Submit score
            </Link>
          </Button>
        )}
      </div>

      {/* Register confirm */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-[360px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Register for {t.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {formatIDR(t.entry_fee)} entry fee · {t.format} · {t.start_date}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegister}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel confirm */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="max-w-[360px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel registration?</AlertDialogTitle>
            <AlertDialogDescription>You will lose your spot in {t.name}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep registration</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileShell>
  );
}
