import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/appContext";
import type { Role } from "@/lib/mockData";
import { AlertCircle, Loader2, ShieldCheck, Sparkles, Trophy, Wallet } from "lucide-react";
import rhapsodyLogo from "@/assets/rhapsody-logo.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Rhapsody GolfHub" },
      { name: "description", content: "Sign in to Rhapsody GolfHub — book tee times, access your club membership, join tournaments and track your game." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, role, authLoading } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function redirectByRole(r: Role | null) {
    if (r === "club_admin") navigate({ to: "/club" });
    else if (r === "superadmin") navigate({ to: "/admin" });
    else navigate({ to: "/app" });
  }

  // Already logged in (including a session that just synced in from another
  // tab) — redirect once hydration settles. Must run in an effect, not during
  // render, or React throws "Cannot update a component while rendering a
  // different component" and the navigation can get dropped.
  useEffect(() => {
    if (!authLoading && isAuthenticated) redirectByRole(role);
  }, [authLoading, isAuthenticated, role]);

  if (!authLoading && isAuthenticated) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    // Do NOT call redirectByRole here — React may not have committed the auth
    // state updates from hydrateUser yet. The useEffect above handles redirect
    // once isAuthenticated flips to true after state commit.
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left — brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 text-sidebar-foreground bg-gradient-hero overflow-hidden">
        <div className="relative z-10">
          <img src={rhapsodyLogo} alt="Rhapsody GolfHub" className="h-12 w-auto brightness-0 invert" />
          <div className="text-[11px] uppercase tracking-[0.2em] text-sidebar-foreground/60 mt-2">
            Tee Times · Membership · Tournaments · Scoring
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <Badge className="bg-gold/20 text-gold border-gold/40 hover:bg-gold/20">The Golfer's App</Badge>
          <h1 className="font-display text-5xl leading-[1.05] mt-4">
            Your game. <span className="italic text-gold">Every course.</span> One app.
          </h1>
          <p className="mt-4 text-sidebar-foreground/70">
            Book tee times, access your home club membership, join tournaments, track your handicap
            and unlock club promotions — all in one place.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
            <Feat icon={<Sparkles className="h-4 w-4" />} title="Book tee times anywhere" />
            <Feat icon={<Trophy className="h-4 w-4" />} title="Tournaments & scoring" />
            <Feat icon={<Wallet className="h-4 w-4" />} title="Member perks & promos" />
            <Feat icon={<ShieldCheck className="h-4 w-4" />} title="Handicap tracking" />
          </div>
        </div>

        <div className="relative z-10 text-xs text-sidebar-foreground/50">
          © 2026 Rhapsody GolfHub · Powered by Rhapsody Golf Management System.
        </div>
      </div>

      {/* Right — auth */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <img src={rhapsodyLogo} alt="Rhapsody" className="h-10 w-auto" />
          </div>

          <h2 className="text-3xl font-display mb-2">Sign in</h2>
          <p className="text-sm text-muted-foreground">
            Use your email and password to access your GolfHub account.
          </p>

          <Card className="mt-6 shadow-elegant">
            <CardContent className="p-6">
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive mb-4">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 text-base">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Sign in to GolfHub
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-4 text-center">
          </div>
        </div>
      </div>
    </div>
  );
}

function Feat({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
      <span className="text-gold">{icon}</span>
      <span className="text-sidebar-foreground/90">{title}</span>
    </div>
  );
}
