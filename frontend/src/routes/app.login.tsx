import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { useApp } from "@/lib/appContext";
import rhapsodyLogo from "@/assets/rhapsody-logo.png";

export const Route = createFileRoute("/app/login")({
  head: () => ({ meta: [{ title: "Sign In · Rhapsody App" }] }),
  component: AppLogin,
});

function AppLogin() {
  const { signIn, signUp } = useApp();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = isSignUp
      ? await signUp(email, password, name)
      : await signIn(email, password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    navigate({ to: "/app" });
  }

  return (
    <div className="min-h-dvh bg-muted flex justify-center">
      <div className="w-full max-w-[430px] min-h-dvh bg-gradient-hero flex flex-col justify-center px-6 py-12 gap-8">
        {/* Brand header */}
        <div className="flex flex-col items-center gap-4">
          <img
            src={rhapsodyLogo}
            alt="Rhapsody"
            className="h-10 w-auto brightness-0 invert"
          />
          <div className="text-center">
            <h1 className="font-display text-2xl text-white">
              {isSignUp ? "Create account" : "Welcome back"}
            </h1>
            <p className="text-sm text-white/50 mt-1">
              {isSignUp
                ? "Join the Rhapsody network"
                : "Your premium golf experience"}
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="flex flex-col gap-5 bg-white/5 border border-white/10 rounded-2xl px-5 py-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-white">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="name"
                  className="text-xs font-medium text-white/60 uppercase tracking-wider"
                >
                  Full name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Michael Tan"
                  autoComplete="name"
                  required
                  className="h-11 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-gold"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-medium text-white/60 uppercase tracking-wider"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="h-11 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-gold"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-white/60 uppercase tracking-wider"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                className="h-11 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-gold"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full mt-1 shadow-glow"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>
        </div>

        <div className="text-center text-sm text-white/50">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-gold font-semibold"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}
