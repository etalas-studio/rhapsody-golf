import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/appContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarCheck, Trophy, Wallet, BarChart3, Users, Zap,
  Star, MapPin, ChevronRight, Menu, X, ArrowRight, Check,
  Bot, QrCode, Shield, Sun, Moon,
} from "lucide-react";
import { formatIDR } from "@/lib/mockData";
import { useTheme } from "@/lib/useTheme";
import { useClubs } from "@/lib/useApi";
import type { ApiClub } from "@/lib/api";
import rhapsodyLogo from "@/assets/rhapsody-logo.png";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rhapsody Golf Connect — Golf, Connected." },
      { name: "description", content: "Book tee times, track your handicap, join tournaments, and unlock member perks across every club in the Rhapsody network." },
    ],
  }),
  component: LandingPage,
});

// ─── Static data ──────────────────────────────────────────────────────────────

// Emoji logos are presentational — not stored in DB.
const CLUB_EMOJI: Record<string, string> = {
  "emerald": "🌿",
  "royal-jakarta": "👑",
  "bali-national": "🌺",
  "surabaya-links": "⛳",
  "bandung-highland": "🏔️",
};

const FEATURES = [
  { icon: <CalendarCheck className="h-6 w-6" />, title: "Smart Tee Time Booking", desc: "Browse availability, pick your slot, and confirm in seconds — via web dashboard or mobile app." },
  { icon: <Bot className="h-6 w-6" />, title: "AI Booking Assistant", desc: "Chat with our AI concierge to book tee times in natural language, any time of day." },
  { icon: <Trophy className="h-6 w-6" />, title: "Tournament Management", desc: "Register for competitions, follow live leaderboards, and receive your digital scorecard." },
  { icon: <Wallet className="h-6 w-6" />, title: "Loyalty & Rewards", desc: "Earn Golf Happy Points every round and redeem them against green fees across the network." },
  { icon: <BarChart3 className="h-6 w-6" />, title: "Handicap Tracking", desc: "Automatic handicap calculation from every scorecard using World Handicap System methodology." },
  { icon: <QrCode className="h-6 w-6" />, title: "Digital Pass", desc: "Your booking confirmation doubles as a QR check-in pass — no paper or printouts required." },
];

const FOR_GOLFERS = [
  "Book tee times across all Rhapsody clubs in one app",
  "Member discounts applied automatically at checkout",
  "Track handicap and full scoring history",
  "Enter tournaments and follow live leaderboards",
  "Earn and redeem Golf Happy Points network-wide",
  "AI concierge available 24/7 for bookings",
];

const FOR_CLUBS = [
  "Centralised tee sheet and daily operations dashboard",
  "Member CRM with 360° profile view",
  "Loyalty programme fully managed and configurable",
  "Tournament creation and live scoring tools",
  "Revenue analytics across all booking channels",
  "Network visibility — reach golfers across Indonesia",
];

const STATS_STATIC = [
  { value: "1,200+", label: "Active Golfers" },
  { value: "8,400+", label: "Rounds Booked" },
  { value: "4.8★", label: "Average Rating" },
];

const FAQS = [
  { q: "Is Rhapsody Golf Connect free for golfers?", a: "Yes. Signing up and using the app is completely free. You only pay when you book a tee time." },
  { q: "Which courses have joined the network?", a: "Partner courses are listed in the Courses section above. We're continuously onboarding new venues across Indonesia." },
  { q: "How does the GHP points system work?", a: "Every booking you make earns Golf Happy Points (GHP) that can be redeemed as a discount at any course in the Rhapsody network." },
  { q: "Do club members get any discounts?", a: "Yes. Paid Members at any partner club automatically receive a 25% discount on green fees — no promo code needed." },
  { q: "How do I partner my club with Rhapsody?", a: "Email us at partners@rhapsodygolf.id. Our team will be in touch within one business day." },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-colors hover:bg-foreground/10 text-foreground/70 hover:text-foreground"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function Navbar({ open, setOpen, isAuthenticated, dashboardPath }: { open: boolean; setOpen: (v: boolean) => void; isAuthenticated: boolean; dashboardPath: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={rhapsodyLogo} alt="Rhapsody" className="h-8 w-auto dark:brightness-0 dark:invert" />
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-foreground/70">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#courses" className="hover:text-foreground transition-colors">Courses</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Plans</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button asChild size="sm" className="shadow-glow">
              <Link to={dashboardPath}>Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground">
                <Link to="/login">Sign In</Link>
              </Button>
              <Button asChild size="sm" className="shadow-glow">
                <Link to="/app/login">Open App</Link>
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          <button className="p-2 text-foreground/70 hover:text-foreground" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background px-4 py-4 space-y-3">
          {(["#features", "#courses", "#pricing", "#faq"] as const).map((href, i) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="block py-2 text-sm text-foreground/80 hover:text-foreground">
              {["Features", "Courses", "Plans", "FAQ"][i]}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            {isAuthenticated ? (
              <Button asChild size="sm" className="w-full shadow-glow"><Link to={dashboardPath} onClick={() => setOpen(false)}>Go to Dashboard</Link></Button>
            ) : (
              <>
                <Button asChild variant="outline" size="sm" className="w-full"><Link to="/login" onClick={() => setOpen(false)}>Sign In</Link></Button>
                <Button asChild size="sm" className="w-full shadow-glow"><Link to="/app/login" onClick={() => setOpen(false)}>Open App</Link></Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary-glow">
      {children}
    </div>
  );
}

function ClubCard({ club }: { club: ApiClub }) {
  const emoji = CLUB_EMOJI[club.id] ?? "⛳";
  const banner = club.theme_color
    ? `linear-gradient(135deg,${club.theme_color},${club.theme_color}99)`
    : "linear-gradient(135deg,#1a2a40,#3a5a80)";
  return (
    <div className="w-72 shrink-0 rounded-2xl overflow-hidden border border-border bg-card shadow-elegant hover:shadow-glow transition-shadow duration-300 flex flex-col">
      {/* Image / banner */}
      <div className="relative h-36 shrink-0">
        {club.banner_url ? (
          <img src={club.banner_url} alt={club.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center" style={{ background: banner }}>
            <span className="text-5xl">{emoji}</span>
          </div>
        )}
        {club.rating != null && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-xs text-white font-medium">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {club.rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div>
          <p className="font-semibold text-sm leading-tight text-card-foreground">{club.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" />{club.location}
          </p>
        </div>
        {club.description && (
          <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-2">{club.description}</p>
        )}
        {club.starting_price != null && (
          <div className="flex items-center justify-between pt-1 mt-auto">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Starting from</p>
              <p className="text-sm font-semibold text-gold">{formatIDR(club.starting_price)}</p>
            </div>
            <Badge variant="secondary" className="text-[10px]">18 holes</Badge>
          </div>
        )}
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 cursor-pointer select-none" onClick={() => setOpen(!open)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-card-foreground">{q}</p>
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-90")} />
      </div>
      {open && (
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">{a}</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, role } = useApp();

  const { data: clubs, loading: clubsLoading } = useClubs();

  function dashboardPath() {
    if (role === "club_admin") return "/club";
    if (role === "superadmin") return "/admin";
    return "/app";
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar open={menuOpen} setOpen={setMenuOpen} isAuthenticated={isAuthenticated} dashboardPath={dashboardPath()} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-hero pt-32 pb-24 px-4 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-125 w-175 rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute top-40 right-0 h-64 w-64 rounded-full bg-gold/15 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-3xl flex flex-col items-center gap-6">
          <img src={rhapsodyLogo} alt="Rhapsody" className="h-12 w-auto brightness-0 invert" />

          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold text-gold">
            <Zap className="h-3.5 w-3.5" /> #1 Golf Management Platform in Indonesia
          </div>

          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl tracking-tight leading-[1.05] text-white">
            Golf,{" "}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, oklch(0.78 0.2 325), oklch(0.88 0.14 85))" }}>
              connected.
            </span>
          </h1>

          <p className="text-white/82 text-lg max-w-xl leading-relaxed">
            Book tee times, track your handicap, enter tournaments, and enjoy member rewards — at every course in the Rhapsody network.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {isAuthenticated ? (
              <Button asChild size="lg" className="shadow-glow text-base px-8 gap-2">
                <Link to={dashboardPath()}>Go to Dashboard <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="shadow-glow text-base px-8 gap-2">
                  <Link to="/app/login">Get Started <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="text-base px-8 text-white hover:text-white hover:bg-white/10 border border-white/30">
                  <Link to="/login">Dashboard Login</Link>
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-2 text-xs text-white/65">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-primary-glow" /> Secure payment via Midtrans
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary-glow" /> 1,200+ registered golfers
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> 4.8 / 5.0 rating
            </span>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/40 py-10 px-4">
        <div className="mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[{ value: clubs ? `${clubs.length}` : "…", label: "Partner Clubs" }, ...STATS_STATIC].map(({ value, label }) => (
            <div key={label}>
              <p className="font-display text-3xl sm:text-4xl text-primary-glow">{value}</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-4 bg-background">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12 space-y-3">
            <SectionLabel>Core Features</SectionLabel>
            <h2 className="font-display text-3xl sm:text-4xl text-foreground">Everything you need in one platform</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">From booking to live leaderboards — Rhapsody takes care of it all.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-5 shadow-elegant hover:shadow-glow transition-shadow duration-300">
                <div className="h-10 w-10 rounded-xl bg-primary/15 grid place-items-center text-primary-glow mb-4">
                  {icon}
                </div>
                <p className="font-semibold text-sm mb-1.5 text-card-foreground">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COURSES ──────────────────────────────────────────────────────── */}
      <section id="courses" className="py-20 px-4 bg-muted/30">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12 space-y-3">
            <SectionLabel>Partner Courses</SectionLabel>
            <h2 className="font-display text-3xl sm:text-4xl text-foreground">
              {clubs ? `${clubs.length} world-class destination${clubs.length !== 1 ? "s" : ""}` : "World-class destinations"}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">From the Bogor highlands to the Bali coastline — the Rhapsody network keeps growing.</p>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {clubsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="w-72 h-64 shrink-0 rounded-2xl" />
                ))
              : clubs?.map((club) => (
                  <div key={club.id} className="snap-start">
                    <ClubCard club={club} />
                  </div>
                ))
            }
          </div>
        </div>
      </section>

      {/* ── FOR GOLFERS & CLUBS ───────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-4 bg-background">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12 space-y-3">
            <SectionLabel>Who Is It For?</SectionLabel>
            <h2 className="font-display text-3xl sm:text-4xl text-foreground">Built for golfers and club operators</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Golfers */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/15 grid place-items-center">
                  <Users className="h-5 w-5 text-primary-glow" />
                </div>
                <div>
                  <p className="font-semibold text-card-foreground">For Golfers</p>
                  <p className="text-xs text-muted-foreground">Free forever</p>
                </div>
              </div>
              <ul className="space-y-2.5">
                {FOR_GOLFERS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-card-foreground/85">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 text-primary-glow" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full shadow-glow">
                <Link to="/app/login">Sign Up Free <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>

            {/* Clubs */}
            <div className="rounded-2xl border bg-card p-6 shadow-elegant space-y-5 ring-gold" style={{ borderColor: "oklch(from var(--gold) l c h / 0.35)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gold/15 grid place-items-center">
                    <Trophy className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <p className="font-semibold text-card-foreground">For Club Partners</p>
                    <p className="text-xs text-muted-foreground">Contact us for pricing</p>
                  </div>
                </div>
                <Badge className="text-[10px] bg-gold/15 text-gold border-gold/30">Partner</Badge>
              </div>
              <ul className="space-y-2.5">
                {FOR_CLUBS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-card-foreground/85">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 text-gold" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild variant="ghost" className="w-full border border-gold/35 text-gold hover:text-gold hover:bg-gold/10">
                <a href="mailto:partners@rhapsodygolf.id">Contact Our Team <ArrowRight className="h-4 w-4 ml-1" /></a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12 space-y-3">
            <SectionLabel>How It Works</SectionLabel>
            <h2 className="font-display text-3xl sm:text-4xl text-foreground">Book a tee time in 3 steps</h2>
          </div>
          <div className="space-y-4">
            {[
              { step: "01", title: "Create your account", desc: "Sign up for free in 30 seconds. Log in on web or mobile — same account, both platforms." },
              { step: "02", title: "Choose a course & time", desc: "Browse available slots at your favourite course, or let the AI Assistant find the best option." },
              { step: "03", title: "Pay & play", desc: "Complete payment securely via Midtrans, receive your QR pass, and check in at the course." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-5 items-start rounded-2xl border border-border bg-card px-5 py-4 shadow-elegant">
                <span className="font-display text-3xl shrink-0 w-10 text-center leading-none pt-0.5 text-primary/40">{step}</span>
                <div>
                  <p className="font-semibold text-sm mb-1 text-card-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 px-4 bg-background">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-10 space-y-3">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="font-display text-3xl text-foreground">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq) => <FaqItem key={faq.q} {...faq} />)}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gradient-hero">
        <div className="relative mx-auto max-w-2xl text-center space-y-6">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-64 rounded-full bg-primary/30 blur-[80px]" />
          </div>
          <div className="relative space-y-4">
            <h2 className="font-display text-3xl sm:text-4xl text-white">Ready to play?</h2>
            <p className="text-white/80">Join 1,200+ golfers already enjoying the Rhapsody Golf Connect experience.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              {isAuthenticated ? (
                <Button asChild size="lg" className="shadow-glow text-base px-8 gap-2">
                  <Link to={dashboardPath()}>Go to Dashboard <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="shadow-glow text-base px-8 gap-2">
                    <Link to="/app/login">Get Started Free <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild size="lg" variant="ghost" className="text-base px-8 text-white hover:text-white hover:bg-white/10 border border-white/30">
                    <Link to="/login">Admin Login</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-muted/20 py-12 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-1 space-y-3">
              <img src={rhapsodyLogo} alt="Rhapsody" className="h-8 w-auto dark:brightness-0 dark:invert" />
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                Indonesia's leading network-based golf management platform.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Product</p>
              <ul className="space-y-2 text-sm text-foreground/75">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#courses" className="hover:text-foreground transition-colors">Courses</a></li>
                <li><Link to="/app/login" className="hover:text-foreground transition-colors">Mobile App</Link></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">Club Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Company</p>
              <ul className="space-y-2 text-sm text-foreground/75">
                <li><span>About Us</span></li>
                <li><a href="mailto:partners@rhapsodygolf.id" className="hover:text-foreground transition-colors">Partner With Us</a></li>
                <li><span>Blog</span></li>
                <li><span>Careers</span></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Support</p>
              <ul className="space-y-2 text-sm text-foreground/75">
                <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
                <li><a href="mailto:support@rhapsodygolf.id" className="hover:text-foreground transition-colors">Contact Us</a></li>
                <li><span>Terms & Conditions</span></li>
                <li><span>Privacy Policy</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© 2026 Rhapsody Golf Connect. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>Powered by Etalas Studio</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>Sandbox mode</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
