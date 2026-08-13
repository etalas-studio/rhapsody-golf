import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BookOpen, Users, MapPin, Trophy, Wallet, Gift, ClipboardList, User,
  Building2, Shield, Database, Layers, History, Search,
} from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () => ({ meta: [{ title: "Documentation · Rhapsody" }] }),
  component: Docs,
});

// ─────────────────────────────────────────────────────────────
// TABLE OF CONTENTS — keep in sync with sections below.
// When adding a new section, add an entry here and a matching
// <Section id="..."> block below.
// ─────────────────────────────────────────────────────────────
const TOC: { id: string; label: string; icon: any; group: string }[] = [
  { id: "overview", label: "Overview", icon: BookOpen, group: "Getting started" },
  { id: "personas", label: "User personas & roles", icon: Users, group: "Getting started" },
  { id: "tech-stack", label: "Tech stack", icon: Layers, group: "Getting started" },

  { id: "logic-distribution", label: "Distribution channels", icon: Layers, group: "Product logic" },
  { id: "logic-rates", label: "Rate cards & pricing", icon: Wallet, group: "Product logic" },
  { id: "logic-checkout", label: "Checkout stack order", icon: Wallet, group: "Product logic" },
  { id: "logic-services", label: "Cart & caddie policies", icon: ClipboardList, group: "Product logic" },
  { id: "logic-wallet", label: "Wallet: GHV & GHP", icon: Wallet, group: "Product logic" },
  { id: "logic-commission", label: "Commission & payout", icon: Shield, group: "Product logic" },
  { id: "logic-booking-lifecycle", label: "Booking lifecycle", icon: ClipboardList, group: "Product logic" },
  { id: "logic-cancellation", label: "Cancellation & refunds", icon: Shield, group: "Product logic" },
  { id: "logic-identity", label: "Identity & signup gates", icon: Users, group: "Product logic" },
  { id: "logic-teesheet-channels", label: "Tee sheet: single source of truth", icon: ClipboardList, group: "Product logic" },
  { id: "logic-rate-engine", label: "Rate engine (Rhapsody schema, club values)", icon: Wallet, group: "Product logic" },
  { id: "logic-rate-lock", label: "Rate lock on confirmed bookings", icon: Shield, group: "Product logic" },
  { id: "logic-promotions", label: "Promotions v1 scope", icon: Gift, group: "Product logic" },
  { id: "logic-benchmarks", label: "Network benchmarks (opt-in)", icon: Layers, group: "Product logic" },
  { id: "logic-tournaments", label: "Tournament engine", icon: Trophy, group: "Product logic" },
  { id: "logic-tournament-scoring", label: "Tournament scoring & tie-breaks", icon: Trophy, group: "Product logic" },
  { id: "logic-tournament-prizes", label: "Tournament prizes & series", icon: Trophy, group: "Product logic" },



  { id: "golfer-home", label: "Home dashboard", icon: MapPin, group: "Golfer features" },
  { id: "golfer-courses", label: "Courses & booking", icon: MapPin, group: "Golfer features" },
  { id: "golfer-tournaments", label: "Tournaments", icon: Trophy, group: "Golfer features" },
  { id: "golfer-scorecard", label: "Scorecard", icon: ClipboardList, group: "Golfer features" },
  { id: "golfer-wallet", label: "Wallet", icon: Wallet, group: "Golfer features" },
  { id: "golfer-loyalty", label: "Loyalty & vouchers", icon: Gift, group: "Golfer features" },
  { id: "golfer-profile", label: "Profile & play history", icon: User, group: "Golfer features" },

  { id: "club-dashboard", label: "Club dashboard", icon: Building2, group: "Club admin features" },
  { id: "club-teesheet", label: "Tee sheet", icon: ClipboardList, group: "Club admin features" },
  { id: "club-members", label: "Members", icon: Users, group: "Club admin features" },
  { id: "club-promotions", label: "Promotions & vouchers", icon: Gift, group: "Club admin features" },
  { id: "club-loyalty", label: "Loyalty rules", icon: Gift, group: "Club admin features" },
  { id: "club-analytics", label: "Analytics", icon: Layers, group: "Club admin features" },

  { id: "admin-network", label: "Network overview", icon: Shield, group: "Platform admin features" },
  { id: "admin-courses", label: "Course management", icon: Building2, group: "Platform admin features" },
  { id: "admin-integrations", label: "Integrations", icon: Layers, group: "Platform admin features" },
  { id: "admin-audit", label: "Audit log", icon: Shield, group: "Platform admin features" },

  { id: "schema", label: "Database schema", icon: Database, group: "Data model" },
  { id: "relationships", label: "Entity relationships", icon: Database, group: "Data model" },

  { id: "changelog", label: "Changelog", icon: History, group: "Reference" },
];

const GROUPS = Array.from(new Set(TOC.map((t) => t.group)));

function Docs() {
  const [q, setQ] = useState("");
  const filtered = TOC.filter((t) => t.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" /> Documentation
        </div>
        <h1 className="font-display text-3xl md:text-4xl mt-1">Rhapsody Golf Platform</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          A complete reference to every feature, screen, and data entity in the platform. This
          document is updated whenever we ship a change — treat it as the single source of truth.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar TOC */}
        <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search docs…"
              className="pl-8 h-9"
            />
          </div>
          <nav className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {GROUPS.map((g) => {
              const items = filtered.filter((t) => t.group === g);
              if (!items.length) return null;
              return (
                <div key={g}>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-2 mb-1.5">
                    {g}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((t) => (
                      <a
                        key={t.id}
                        href={`#${t.id}`}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <t.icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{t.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="space-y-8 min-w-0">
          <Section id="overview" title="Overview">
            <p>
              Rhapsody is a multi-tenant golf platform serving three audiences from one codebase:
              individual golfers, participating clubs, and the Realta platform team. It ships as
              a Rhapsody-branded consumer app <em>and</em> as club-branded white-label apps
              powered by the same backend.
            </p>
            <Bullets items={[
              "One Rhapsody ID lets a golfer hold memberships, bookings, points, and play history across every participating club.",
              "Every club gets its own admin console scoped to its own members, tee sheet, and revenue.",
              "The Realta superadmin console monitors the full network — clubs, integrations, cross-club analytics, and audit trail.",
            ]}/>
          </Section>

          <Section id="personas" title="User personas & roles">
            <Grid>
              <PersonaCard
                title="Golfer / Member"
                role="golfer"
                summary="Books tee times, plays rounds, tracks scores, earns loyalty points, redeems vouchers, enters tournaments."
                access="Own bookings, own play history, own wallet, own memberships, public course info."
              />
              <PersonaCard
                title="Club Admin"
                role="club_admin"
                summary="Runs a single club: members, tee sheet, promotions, vouchers, loyalty rules, revenue."
                access="Scoped to their own club_id — cannot see other clubs' data."
              />
              <PersonaCard
                title="Realta Superadmin"
                role="superadmin"
                summary="Runs the network: onboards clubs, monitors integrations, cross-club analytics, audit log."
                access="Full read across the network. Writes are audited."
              />
            </Grid>
            <p className="mt-3 text-sm text-muted-foreground">
              Role is switched in the top bar (demo control). In production this comes from the
              authenticated user's assigned role in the <Code>user_roles</Code> table.
            </p>
          </Section>

          <Section id="tech-stack" title="Tech stack">
            <Bullets items={[
              "TanStack Start v1 (React 19, file-based routing under src/routes/) with SSR.",
              "Vite 7 build, deployed as a Cloudflare Worker (edge runtime).",
              "Tailwind CSS v4 via src/styles.css design tokens; shadcn/ui component primitives.",
              "TanStack Router with hover-intent preloading (defaultPreload: 'intent') for instant tab switching.",
              "Currently mock-data only (src/lib/mockData.ts). Lovable Cloud (Supabase under the hood) is the target backend for auth + persistence.",
            ]}/>
          </Section>

          {/* ─────────────── PRODUCT LOGIC ─────────────── */}
          <SectionHeader>Product logic</SectionHeader>

          <Section id="logic-distribution" title="Distribution channels & identity">
            <p>
              The same GolfHub backend powers four entry points. Golfer identity (one Rhapsody ID)
              is shared across all of them — memberships, wallet, points, and play history follow
              the user, not the surface they landed on.
            </p>
            <Bullets items={[
              "1. GolfHub main app (golfhub.app) — the flagship consumer app. Full network browse, all clubs, tournaments, wallet, handicap. Primary destination for marketing, SEO, App Store.",
              "2. Club-branded app (e.g. emeraldhills.app, 'powered by GolfHub') — same backend, white-labeled shell. Default template with logo + primary color; per-club custom theming available on request. Club tabs primary; a small 'GolfHub network' surface sits alongside so members still discover cross-club value.",
              "3. Embeddable booking widget — iframe/JS snippet that clubs drop into their existing website / WA campaigns / QR codes at the pro shop. Funnels either into an embedded booking flow or a GolfHub-hosted page (golfhub.app/book/<club>). Runs 24/7 and reduces manual-booking no-shows.",
              "4. QR / deep links — offline-to-online bridge from scorecards, pro shop signage, tournament flyers.",
            ]}/>
            <p className="text-sm text-muted-foreground mt-3">
              <strong className="text-foreground">Signup gate:</strong> Guests can browse freely
              (all clubs, prices, availability). Soft nudges appear after engagement ("save this
              course", "get member rates"). A hard wall applies only at checkout — an account is
              required to confirm any booking. No guest checkout in v1.
            </p>
          </Section>

          <Section id="logic-rates" title="Rate cards & pricing sources">
            <p>
              Every tee slot can have multiple applicable rates. In v1 the golfer picks <em>one</em>
              rate per booking — prices and benefits from different programs <strong>do not stack</strong>.
              The default preselected rate is the cheapest one the golfer is eligible for, so there
              is never a commercial surprise.
            </p>
            <Bullets items={[
              "Public / GolfHub rate — authored by GolfHub admin, based on the club's published rate. Visible to everyone.",
              "Member rate — authored by the club. Only unlocked when the golfer holds a Paid Member profile at that club_id.",
              "Card / partner rate — authored by the card/program issuer (e.g. bank co-brand). Only unlocked when the golfer has a valid card link.",
              "Future: GolfHub-authored network benefits may stack on top of a club/program rate. In v1 nothing stacks.",
            ]}/>
          </Section>

          <Section id="logic-checkout" title="Checkout stack order">
            <p>The industry-standard order the checkout applies, top to bottom:</p>
            <Bullets items={[
              "1. Choose rate — locks the base green fee for the round.",
              "2. Apply vouchers — only vouchers valid for the chosen rate are selectable.",
              "3. Apply wallet value (GHV) — cash-equivalent, deducts from the running total.",
              "4. Apply loyalty points (GHP) — subject to redemption cap (default 20% of booking).",
              "5. Remaining balance — charged to the golfer's tokenised payment method via the gateway.",
            ]}/>
            <p className="text-sm text-muted-foreground mt-2">
              Funds sit in escrow until the round is played. See Commission & payout below.
            </p>
          </Section>

          <Section id="logic-services" title="Cart & caddie policies">
            <p>
              Each club declares a policy per service. The booking UI enforces it, and the price
              summary reflects it — there is no way for the golfer to bypass a mandatory service or
              be double-charged for an included one.
            </p>
            <Bullets items={[
              "included — the service is bundled into the green fee. Toggle is locked ON, price line reads 'Included', no extra charge.",
              "mandatory — required for play. Toggle is locked ON, fee is added per player.",
              "optional — golfer chooses. Toggle defaults OFF (except when the club sets it as recommended). Fee is added per player only when ON.",
            ]}/>
          </Section>

          <Section id="logic-wallet" title="Wallet: GHV & GHP">
            <p>Two separate balances, never commingled:</p>
            <Bullets items={[
              "GHV (GolfHub Value) — cash-equivalent, 1 GHV = 1 IDR. Top up via bank transfer / QRIS / e-wallet (GoPay, OVO, DANA). Refundable back to source. Spendable at any club on the network.",
              "GHP (GolfHub Points) — earned only (not purchasable). Non-refundable. Expire on a 12-month rolling window. Redeemable at a fixed conversion (100 GHP = 1,000 GHV) or as partial payment up to a redemption cap (default 20% of a booking).",
            ]}/>
            <p className="text-sm text-muted-foreground mt-2">
              Refund routing: whatever paid, gets refunded the same way. GHP used → returned as GHP.
              GHV used → returned as GHV. Vouchers returned to wallet if cancelled inside the
              voucher's return window, forfeited after.
            </p>
          </Section>

          <Section id="logic-commission" title="Commission & payout (open decision)">
            <p>Three models on the table — pick one before v1 launch:</p>
            <Bullets items={[
              "(a) Take-rate on public / GolfHub rate only — member and Card rates pass through at cost. GolfHub earns from public bookings + tournament fees + featured placement. Best alignment with clubs.",
              "(b) Flat platform fee per booking — simpler, predictable, but clubs may push back on discounted member rates.",
              "(c) Tiered — % on public rate, small flat fee on member / Card rates.",
            ]}/>
            <p className="text-sm text-muted-foreground mt-2">
              Payout to clubs is T+7 from the date the round is played (funds held in escrow until
              play is confirmed). A reserve is retained against chargebacks.
            </p>
          </Section>

          <Section id="logic-booking-lifecycle" title="Booking lifecycle (states)">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto leading-relaxed">
{`DRAFT ─▶ HELD ─▶ CONFIRMED ─▶ CHECKED_IN ─▶ PLAYED ─▶ SETTLED
                    │              │            │
                    ▼              ▼            ▼
               CANCELLED       NO_SHOW      (payout T+7)`}
            </pre>
            <Bullets items={[
              "DRAFT — user is still on the checkout screen. No hold placed on the tee sheet.",
              "HELD — slot reserved for ~10 minutes while the payment authorises.",
              "CONFIRMED — payment captured into escrow. Booking appears on the club tee sheet.",
              "CHECKED_IN — golfer scanned QR / marked present at the pro shop.",
              "PLAYED — round completed. Triggers loyalty accrual and starts the payout clock.",
              "SETTLED — funds paid out to the club (T+7 by default, minus commission & reserve).",
              "CANCELLED — see Cancellation & refunds below.",
              "NO_SHOW — no check-in by tee time + grace. Feeds the strike system.",
            ]}/>
          </Section>

          <Section id="logic-cancellation" title="Cancellation, refunds & no-shows">
            <p>Default window (each club can override in its own policy config):</p>
            <Bullets items={[
              "More than 72h before tee time — full refund to source.",
              "24–72h before tee time — 50% refund to source, 50% credited as GHV.",
              "Less than 24h — no refund. GHV credit at the club's discretion.",
              "No-show — no refund. Recorded on the golfer's account.",
            ]}/>
            <p className="text-sm text-muted-foreground mt-2">
              <strong className="text-foreground">Rebooking:</strong> one free reschedule if done
              more than 48h out; the originally selected rate tier is preserved.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong className="text-foreground">No-show enforcement (open decision):</strong>
              strike system (3 strikes → temporary booking ban), deposit-forfeit only, or both.
              To be locked in before v1.
            </p>
          </Section>

          <Section id="logic-identity" title="Identity, roles & data scope">
            <Bullets items={[
              "One Rhapsody ID per human. It holds memberships, bookings, wallet, points, and play history across every club they touch.",
              "A single user_accounts row can have many club_members rows — one per club they interact with.",
              "Roles live in the separate user_roles table (never on user_accounts) to prevent privilege escalation. Values: 'golfer' | 'club_admin' | 'superadmin'. club_admin rows carry a club_id scope.",
              "RLS: golfers read only their own rows; club_admin reads/writes only rows matching their club_id; superadmin has full read, and writes are logged to audit_logs.",
            ]}/>
          </Section>

          <Section id="logic-teesheet-channels" title="Tee sheet: single source of truth">
            <p>
              Every club runs ONE live tee sheet on Rhapsody. All booking channels write to
              the same inventory in realtime, eliminating the double-booking gap between
              online reservations, phone/WA, and walk-ins.
            </p>
            <Bullets items={[
              "Five channel tags on every booking row: GH_APP (golfer self-serve), WIDGET (embedded booking widget on club site), RESVN_PHONE_WA (reservations team phone/WhatsApp), WALKIN (front desk / starter), MEMBER_HOTLINE (dedicated member line).",
              "Realtime sync via websocket between all editors (reservations, front desk, caddie master, GolfHub app inventory).",
              "Optimistic slot hold: clicking a slot to start a booking places a 60-second hold visible to every channel; expires automatically if not confirmed.",
              "Conflict resolution: last-write wins with a toast to the losing editor. Rare because holds prevent it.",
              "Offline fallback: front desk can keep booking locally if internet drops; marked 'pending sync' and reconciled when connection returns.",
              "Roles: reservations agent (full CRUD), front desk/starter (check-in, no-show, add walk-ins), caddie master (assign caddies, read-only on price), club admin (everything + block slots for maintenance/tournaments).",
            ]}/>
          </Section>

          <Section id="logic-rate-engine" title="Rate engine — Rhapsody schema, club-set values">
            <p>
              The rate engine is dynamic, but Rhapsody owns the rule <em>schema</em> — the
              dimensions every club prices across. Clubs configure the <em>values</em>
              inside that schema, including the count and boundaries of their own time
              bands.
            </p>
            <Bullets items={[
              "Rhapsody-owned dimensions (fixed schema, same for every club): rate source (Public / Member / Card), day type (Weekday / Weekend / Public Holiday), time band, season (Peak / Shoulder / Off-Peak).",
              "Club-configured within each dimension: the price cells themselves, the number and boundaries of time bands (free-form: 2-10 bands, custom labels like 'Early Bird 05:30-07:00', 'Prime 07:00-10:30', 'Twilight 15:00+'), season calendar dates, holiday overrides.",
              "Rationale: consistent schema across the network makes benchmarking meaningful and gives golfers predictable rate names ('Twilight' means the same thing everywhere), while clubs keep operational flexibility on values.",
              "Adding new dimensions (e.g. 'Ladies Day', 'Corporate rate') is a Rhapsody-controlled platform rollout, not a per-club schema edit. Keeps the network coherent.",
              "Publish flow: draft → preview impact ('this changes 47 rates, avg +8% on next 30 days of bookings') → activate. Draft rates never affect live bookings.",
            ]}/>
          </Section>

          <Section id="logic-rate-lock" title="Rate lock on confirmed bookings">
            <p>
              Once a booking reaches CONFIRMED, its price is frozen. This is the industry
              standard for OTAs and hotels — trust is preserved on both sides.
            </p>
            <Bullets items={[
              "Price stored on the booking row at confirmation; club can re-author rates freely without affecting anyone already booked.",
              "No auto-refund if the club later drops the rate. Simpler ops, no gaming, matches golfer expectations from other travel platforms.",
              "No dynamic re-pricing before tee time. Weather-driven surge or last-minute discounts happen via new rate cards for future bookings only.",
              "Cancellation refunds follow the source rules in 'Cancellation & refunds' (voucher → wallet, GHV → GHV, GHP → GHP, card → source).",
            ]}/>
          </Section>

          <Section id="logic-promotions" title="Promotions v1 scope">
            <p>
              Deliberately narrow scope for v1 to ship a stable foundation. Advanced targeting and broadcast are v2.
            </p>
            <Bullets items={[
              "In v1: % off and fixed-IDR-off vouchers only. Club admin creates a voucher (rate scope, expiry, per-user limit, total budget cap), issues to specific members or 'all members'.",
              "Fraud check on every redemption: velocity limits, device fingerprint, cross-club voucher abuse detection — already surfaced on /club/vouchers.",
              "Deferred to v2: buy-X-get-Y campaigns, segment targeting (tier, dormancy, spend range), WA/email broadcast, tier upgrade offers, F&B/pro-shop promo types.",
              "GolfHub-issued vouchers (network-wide, not tied to a single club) are a Rhapsody-controlled campaign type — the only vouchers that can potentially stack with club program benefits (see 'Rate cards & pricing').",
            ]}/>
          </Section>

          <Section id="logic-benchmarks" title="Network benchmarks — opt-in both ways">
            <p>
              Anonymized cross-club benchmarking is the key network-effect value of staying
              on Rhapsody after a club has grown its direct channel. Handled with strict
              double-consent from day one.
            </p>
            <Bullets items={[
              "Every metric in club analytics can display a network reference line: 'Your no-show rate 8.2% · Network median 4.5% · Top-quartile 2.1%'.",
              "Opt-in to CONTRIBUTE: a club must explicitly consent to their metrics being counted in network aggregates. Anonymized, aggregated over minimum 10 clubs per bracket before any comparison surfaces.",
              "Opt-in to CONSUME: a club sees network comparisons only if they also contribute. Fair reciprocity.",
              "Brackets: comparisons are within peer groups (course type: resort / member-club / daily-fee; region; 18-hole vs 9-hole) so numbers are meaningful.",
              "UI unlocks progressively — until 10 clubs in a bracket contribute, that comparison shows 'Unlocking soon' instead of a shaky median.",
              "No individual club ever identifiable from benchmark output. Small-cell suppression: if fewer than 10 clubs in a slice, we don't publish the number.",
            ]}/>
          </Section>

          <Section id="logic-tournaments" title="Tournament engine — lifecycle & formats">
            <p>
              Tournaments drive repeat play, member acquisition, sponsorship, and prestige.
              Rules-heaviest domain in the platform. Created by club admins (single-club)
              or by Rhapsody admins (multi-club series, national qualifiers).
            </p>
            <Bullets items={[
              "Lifecycle: DRAFT → PUBLISHED → REGISTRATION_OPEN → REGISTRATION_CLOSED → LIVE → SCORING → FINISHED → SETTLED. Plus CANCELLED as an out-of-band terminal state.",
              "Formats supported in v1: Stroke play (gross/net), Stableford, System 36 (2 pts par / 1 pt bogey / 0 pt double+ → same-day handicap), Match play (knockout brackets with pairing engine), Team formats (scramble, best ball / four-ball).",
              "Handicap phasing: v1 uses gross + net with SELF-DECLARED handicap; v2 introduces Rhapsody-native RH-Index derived from platform rounds; v3 (if demanded) integrates official WHS.",
              "Flights & divisions are ORGANIZER-DEFINED: any number of flights per event with free-form rules (handicap range, age, gender, member status, or arbitrary combinations). Each flight is a separate leaderboard with its own prize slots.",
              "Entry: public / member-only / invite-only. Entry fee: free, flat, or sliding (member vs guest). Field cap + waitlist. Cutoff time before start. Team registration = captain adds members, verified by Rhapsody ID.",
            ]}/>
          </Section>

          <Section id="logic-tournament-scoring" title="Tournament scoring, leaderboard & tie-breaks">
            <Bullets items={[
              "Scoring model: BOTH live in-app + staff verify. Golfer enters own scores hole-by-hole; playing partner (marker) signs off digitally on each hole; club staff review and PUBLISH before leaderboard finalizes at FINISHED.",
              "Offline resilience: scoring app must work with intermittent connectivity on course — writes queue locally and sync when signal returns.",
              "Leaderboard: LIVE + public share link. Auto-refresh as verified holes post. Shareable URL for spectators, sponsors, and social media. Filter by flight, format, gross/net.",
              "Provisional vs verified state visible on the board — 'awaiting marker signature' or 'awaiting staff verification' flagged per player until FINISHED.",
              "Tie-break rules: ORGANIZER PICKS per event from: countback cascade (last 9 → last 6 → last 3 → last hole), sudden-death playoff on designated hole, lower handicap wins, coin toss, share prize equally. Selected rule shown to all entrants pre-event.",
            ]}/>
          </Section>

          <Section id="logic-tournament-prizes" title="Tournament prizes & multi-club series">
            <Bullets items={[
              "Prize handling in v1: RECORD-ONLY. Rhapsody records the winner list and prize description; physical trophies, cash, sponsor goods, and F&B vouchers are handled offline by the club. No automatic wallet payout in v1.",
              "Rationale: prize logistics vary wildly (trophies, sponsor products, cash from raffle) and clubs already run this smoothly manually. Fast to ship, no money-movement compliance surface.",
              "Prize categories per event: overall winner(s), per-flight winners, novelty prizes (longest drive, nearest pin, hole-in-one). All defined by organizer, all record-only.",
              "V2 candidates for prize payout: auto-to-GHV wallet for cash prizes, GHP bonus for participation, voucher issuance for club redemption.",
              "Multi-club series / GolfHub Cup: NOT built for v1. Data model reserves nullable series_id and season_id on tournament so a future series layer can group qualifying events → season leaderboard → grand final without a migration.",
            ]}/>
          </Section>

          {/* ─────────────── GOLFER ─────────────── */}
          <SectionHeader>Golfer features</SectionHeader>






          <Section id="golfer-home" title="Home dashboard" route="/golfer">
            <p>Personalised landing page for the signed-in golfer.</p>
            <Bullets items={[
              "Featured clubs and next available tee times.",
              "Upcoming bookings and tournament reminders.",
              "Quick shortcuts: Book, Scorecard, Wallet, Rewards.",
            ]}/>
          </Section>

          <Section id="golfer-courses" title="Courses & booking" route="/golfer/courses">
            <p>Browse every course on the network, view details, and book a tee time.</p>
            <Bullets items={[
              "Course list with location, rating, starting price, and membership badge (Paid Member / Visitor).",
              "Course detail (/golfer/courses/$courseId): about, facilities, pricing (member vs. visitor), active promotions, upcoming tournaments.",
              "Booking flow (/golfer/book/$courseId): pick date, tee time, players, payment method → creates a Booking record.",
              "Member rates auto-apply at checkout when the golfer holds a Paid Member relationship to the club.",
            ]}/>
          </Section>

          <Section id="golfer-tournaments" title="Tournaments" route="/golfer/tournaments">
            <Bullets items={[
              "Browse tab: all Open / Registration Closed / Live / Finished tournaments across the network. Filter by format (Stroke, Stableford, System 36, Match play, Team), club, date, entry fee.",
              "My Tournaments tab: upcoming and past events the golfer has registered for, with live leaderboard position when LIVE.",
              "Detail page (/golfer/tournaments/$tournamentId): format, handicap basis, flights, entry fee, schedule, tie-break rule, prize slots, register CTA. Live public leaderboard link (shareable) once tournament is LIVE.",
              "Registering creates a TournamentRegistration and (for paid events) a PaymentTransaction. Team events: captain registers, adds team members by Rhapsody ID.",
              "During play: hole-by-hole entry via the tournament scoring app; marker (playing partner) signs off each hole; provisional scores appear on live board pending staff verification.",
            ]}/>
          </Section>


          <Section id="golfer-scorecard" title="Scorecard" route="/golfer/scorecard">
            <Bullets items={[
              "Live hole-by-hole scoring against standard 18-hole par layout (COURSE_PARS in mockData).",
              "Total strokes, score-to-par, and front/back nine breakdowns.",
              "Saved rounds become Scorecard records tied to a club_id and date.",
            ]}/>
          </Section>

          <Section id="golfer-wallet" title="Wallet" route="/golfer/wallet">
            <Bullets items={[
              "Balance summary and full PaymentTransaction history across clubs.",
              "Filterable by category: Green Fee, Cart, Caddie, F&B, Pro Shop, Tournament.",
              "Shows payment method (Credit Card, QRIS, E-Wallet, Voucher, Loyalty Points, Member Account) and settlement status.",
            ]}/>
          </Section>

          <Section id="golfer-loyalty" title="Loyalty & vouchers" route="/golfer/loyalty">
            <Bullets items={[
              "Total points balance = sum of signed LoyaltyEntry rows (Earn + Bonus − Redeem).",
              "Points are club-scoped, except entries with club_id = 'network' which count as cross-club Rhapsody points.",
              "Vouchers list: Active, Redeemed, Expired. Each voucher is tied to a club and either assigned to a user or unassigned (pooled).",
            ]}/>
          </Section>

          <Section id="golfer-profile" title="Profile & play history" route="/golfer/profile">
            <Bullets items={[
              "Rhapsody ID (RH-XXXXX), contact info, consent & marketing preferences.",
              "Club memberships list — each row is one ClubMemberProfile in status Paid Member.",
              "Play history: every club the golfer has ever played, aggregated from Bookings + Tournament participations. Tournament-only clubs get a gold 'Tournament' badge.",
              "Play history detail (/golfer/history/$clubId): single-round view when there is only one round; list + detail split-view when there are multiple. Shows date/time, playing partners, game type (Casual / Tournament / Practice), and score if available.",
            ]}/>
          </Section>

          {/* ─────────────── CLUB ADMIN ─────────────── */}
          <SectionHeader>Club admin features</SectionHeader>

          <Section id="club-dashboard" title="Club dashboard" route="/club">
            <Bullets items={[
              "Today's occupancy, revenue, and member vs. visitor breakdown for the selected club.",
              "KPI cards driven by Bookings + PaymentTransaction filtered by club_id.",
            ]}/>
          </Section>

          <Section id="club-bookinglist" title="Booking list" route="/club/bookinglist">
            <Bullets items={[
              "Day view of every tee slot with player names, status, payment state, and CHANNEL tag (GH_APP / WIDGET / RESVN_PHONE_WA / WALKIN / MEMBER_HOTLINE).",
              "Realtime websocket sync — reservations agents, front desk, caddie master, and GolfHub app inventory all share one live grid. See 'Tee sheet: single source of truth'.",
              "Slot actions: block for maintenance/tournament, release a hold, walk-in add, drag-to-move, split/merge flights, force-book past cutoffs (admin only), waive fees with reason.",
              "Reflects Booking rows for the selected club and date.",
            ]}/>
          </Section>

          <Section id="club-members" title="Members" route="/club/members">
            <Bullets items={[
              "List of everyone in ClubMemberProfile for this club_id — Paid Member, Visitor, Tournament Participant, Inactive.",
              "Member detail (/club/members/$memberId): membership type, tenure, expiry, spending, visit history.",
              "Manual actions on a member: comp a round, grant voucher, suspend/reactivate, change tier, add internal note.",
            ]}/>
          </Section>

          <Section id="club-promotions" title="Promotions & vouchers" route="/club/promotions">
            <Bullets items={[
              "v1 scope: % off and fixed-IDR-off vouchers only (see 'Promotions v1 scope'). Buy-X-get-Y, segment targeting, and broadcast are v2.",
              "Voucher management (/club/vouchers): issue codes, track status (Active/Redeemed/Expired/Cancelled), fraud check indicator.",
              "Every voucher carries: rate scope, expiry, per-user redemption limit, total budget cap.",
            ]}/>
          </Section>

          <Section id="club-loyalty" title="Loyalty rules" route="/club/loyalty">
            <Bullets items={[
              "Configure earn rate per category, tier bonuses, and redemption catalog for the club's own loyalty programme.",
              "Club-issued GHP is scoped to that club. GolfHub-issued (network) points are Rhapsody-controlled.",
            ]}/>
          </Section>

          <Section id="club-analytics" title="Revenue & analytics" route="/club/analytics">
            <Bullets items={[
              "Revenue by category, member vs. visitor mix, channel mix (GH_APP / WIDGET / RESVN / WALKIN / HOTLINE), retention cohorts, promotion ROI, no-show & cancellation rates.",
              "Network benchmarks (opt-in both ways, see 'Network benchmarks'): every metric can display 'Your value · Network median · Top-quartile' when both contribute and consume flags are on.",
              "Export: CSV/PDF, scheduled email digest.",
              "Comparison windows: WoW, MoM, YoY.",
            ]}/>
          </Section>


          {/* ─────────────── PLATFORM ADMIN ─────────────── */}
          <SectionHeader>Platform admin features</SectionHeader>

          <Section id="admin-network" title="Network overview" route="/admin">
            <Bullets items={[
              "KPIs across every club: total members, bookings, revenue, integration health.",
            ]}/>
          </Section>

          <Section id="admin-courses" title="Course management" route="/admin/courses">
            <Bullets items={[
              "Every club on the network with app type (Rhapsody Only / Club-Branded), paid vs. visitor counts, total bookings and revenue, integration status dot.",
            ]}/>
          </Section>

          <Section id="admin-integrations" title="Integrations" route="/admin/integrations">
            <Bullets items={[
              "Per-club sync health for the Rhapsody Golf core system: Membership, Tee sheet, POS, Payment, Loyalty.",
              "Backed by the IntegrationStatus record; last_sync timestamps let ops spot stalled feeds.",
            ]}/>
          </Section>

          <Section id="admin-audit" title="Audit log" route="/admin/audit">
            <Bullets items={[
              "Immutable AuditLog of privileged actions (role changes, refunds, config edits) with actor, target, and timestamp.",
            ]}/>
          </Section>

          {/* ─────────────── DATA MODEL ─────────────── */}
          <SectionHeader>Data model</SectionHeader>

          <Section id="schema" title="Database schema">
            <p>
              Every entity currently lives in <Code>src/lib/mockData.ts</Code>. Column shapes below
              are the target schema for the Lovable Cloud (Postgres) migration.
            </p>

            <SchemaTable
              name="clubs"
              purpose="Participating golf courses on the network."
              cols={[
                ["id", "text pk", "Slug identifier, e.g. 'emerald'"],
                ["name", "text", "Full course name"],
                ["short_name", "text", "Display name for chrome/badges"],
                ["location", "text", "City, country"],
                ["region", "text", "Grouping used for analytics"],
                ["logo", "text", "Emoji or asset id"],
                ["banner", "text", "CSS gradient string or image url"],
                ["theme_color", "text", "Hex, used by club-branded app"],
                ["app_type", "text", "'Rhapsody Only' | 'Club-Branded'"],
                ["integration_status", "text", "'Online' | 'Warning' | 'Offline'"],
                ["starting_price", "int", "IDR — lowest listed green fee"],
                ["rating", "numeric", "Aggregate golfer rating"],
                ["facilities", "text[]", "Amenities list"],
                ["description", "text", "Marketing copy"],
              ]}
            />

            <SchemaTable
              name="user_accounts"
              purpose="One row per Rhapsody ID. The user's cross-club identity."
              cols={[
                ["id", "uuid pk", "Auth user id"],
                ["name", "text", ""],
                ["phone", "text", ""],
                ["email", "text", ""],
                ["rhapsody_id", "text unique", "Human-readable ID, e.g. RH-10001"],
                ["created_at", "timestamptz", ""],
                ["avatar", "text", "Initials or asset url"],
              ]}
            />

            <SchemaTable
              name="user_roles"
              purpose="Role assignment. Kept separate from user_accounts to prevent privilege escalation."
              cols={[
                ["id", "uuid pk", ""],
                ["user_id", "uuid fk → user_accounts", ""],
                ["role", "app_role", "'golfer' | 'club_admin' | 'superadmin'"],
                ["club_id", "text fk → clubs (nullable)", "Required for club_admin"],
              ]}
            />

            <SchemaTable
              name="club_members"
              purpose="Relationship between a user and a club. One user can have many rows (one per club)."
              cols={[
                ["id", "uuid pk", ""],
                ["club_id", "text fk → clubs", ""],
                ["user_id", "uuid fk → user_accounts", ""],
                ["club_member_id", "text", "Club's own member number, or '—'"],
                ["membership_status", "text", "'Paid Member' | 'Visitor' | 'Tournament Participant' | 'Inactive'"],
                ["membership_type", "text", "'Gold' | 'Silver' | 'Platinum' | '—'"],
                ["start_date", "date", ""],
                ["expiry_date", "date", ""],
              ]}
            />

            <SchemaTable
              name="bookings"
              purpose="Tee time reservations."
              cols={[
                ["id", "uuid pk", ""],
                ["club_id", "text fk → clubs", ""],
                ["user_id", "uuid fk → user_accounts", ""],
                ["tee_time", "timestamptz", ""],
                ["players", "int", "1–4"],
                ["status", "text", "'Confirmed' | 'Checked-in' | 'Completed' | 'Cancelled' | 'No-Show'"],
                ["amount", "int", "IDR total"],
                ["payment_status", "text", "'Pending' | 'Paid' | 'Failed' | 'Refunded'"],
                ["partners", "text[]", "Playing partner names"],
                ["game_type", "text", "'Casual' | 'Tournament' | 'Practice'"],
                ["tournament_id", "uuid fk → tournaments (nullable)", ""],
              ]}
            />

            <SchemaTable
              name="visits"
              purpose="Physical check-in derived from bookings. Fuels retention analytics."
              cols={[
                ["id", "uuid pk", ""],
                ["club_id", "text fk → clubs", ""],
                ["user_id", "uuid fk → user_accounts", ""],
                ["booking_id", "uuid fk → bookings", ""],
                ["check_in_time", "timestamptz", ""],
                ["status", "text", "'Checked-in' | 'Completed' | 'No-Show'"],
              ]}
            />

            <SchemaTable
              name="payment_transactions"
              purpose="Every money movement. Powers wallet, revenue analytics, settlement."
              cols={[
                ["id", "uuid pk", ""],
                ["club_id", "text fk → clubs", ""],
                ["user_id", "uuid fk → user_accounts", ""],
                ["amount", "int", "IDR"],
                ["payment_method_type", "text", "'Credit Card' | 'QRIS' | 'E-Wallet' | 'Voucher' | 'Loyalty Points' | 'Member Account'"],
                ["transaction_status", "text", "'Pending' | 'Paid' | 'Failed' | 'Refunded'"],
                ["reference_number", "text", "External PSP reference"],
                ["settlement_status", "text", "'Settled' | 'Pending Settlement' | 'Failed'"],
                ["created_at", "timestamptz", ""],
                ["category", "text", "'Green Fee' | 'Cart' | 'Caddie' | 'F&B' | 'Pro Shop' | 'Tournament'"],
              ]}
            />

            <SchemaTable
              name="loyalty_ledger"
              purpose="Append-only points ledger. Balance = SUM(points). Signed values."
              cols={[
                ["id", "uuid pk", ""],
                ["club_id", "text", "Club id, or 'network' for cross-club Rhapsody points"],
                ["user_id", "uuid fk → user_accounts", ""],
                ["points", "int", "Positive for Earn/Bonus/Adjust+, negative for Redeem"],
                ["transaction_type", "text", "'Earn' | 'Redeem' | 'Bonus' | 'Adjust'"],
                ["description", "text", ""],
                ["created_at", "timestamptz", ""],
              ]}
            />

            <SchemaTable
              name="vouchers"
              purpose="Issued discount codes. Assigned or pooled."
              cols={[
                ["id", "uuid pk", ""],
                ["club_id", "text fk → clubs", ""],
                ["user_id", "uuid fk → user_accounts (nullable)", "null = pooled/unassigned"],
                ["voucher_code", "text unique", ""],
                ["title", "text", ""],
                ["value", "text", "e.g. '25% off' or 'Rp 150,000'"],
                ["status", "text", "'Active' | 'Redeemed' | 'Expired' | 'Cancelled'"],
                ["expiry_date", "date", ""],
                ["type", "text", "'Green Fee' | 'F&B' | 'Cart' | 'Pro Shop'"],
              ]}
            />

            <SchemaTable
              name="promotion_campaigns"
              purpose="Marketing campaigns run by club admins."
              cols={[
                ["id", "uuid pk", ""],
                ["club_id", "text fk → clubs", ""],
                ["title", "text", ""],
                ["target_segment", "text", "Human-readable segment description"],
                ["campaign_type", "text", "'Voucher' | 'Discount' | 'Bonus Points' | 'Tournament Invitation' | 'F&B Promo'"],
                ["status", "text", "'Draft' | 'Active' | 'Ended'"],
                ["redemption_count", "int", ""],
                ["reach", "int", "Segment size"],
                ["starts", "date", ""],
                ["ends", "date", ""],
              ]}
            />

            <SchemaTable
              name="scorecards"
              purpose="Completed rounds with hole-by-hole strokes."
              cols={[
                ["id", "uuid pk", ""],
                ["club_id", "text fk → clubs", ""],
                ["user_id", "uuid fk → user_accounts", ""],
                ["date", "date", ""],
                ["score", "int", "Total strokes"],
                ["course_name", "text", "Layout played"],
                ["strokes", "int[]", "18-length array"],
                ["pars", "int[]", "18-length array"],
              ]}
            />

            <SchemaTable
              name="tournaments"
              purpose="Events run by a club, open to network golfers."
              cols={[
                ["id", "uuid pk", ""],
                ["club_id", "text fk → clubs", ""],
                ["title", "text", ""],
                ["date", "date", ""],
                ["status", "text", "'Open' | 'Registration Closed' | 'Live' | 'Finished'"],
                ["participants", "int", ""],
                ["max_participants", "int", ""],
                ["fee", "int", "IDR"],
                ["format", "text", "e.g. 'Stroke Play 36'"],
                ["description", "text", ""],
                ["registration_deadline", "date", ""],
                ["shotgun_time", "text", ""],
                ["prize_pool", "text", ""],
                ["rules", "text[]", ""],
                ["schedule", "jsonb", "Array of { time, label }"],
                ["includes", "text[]", ""],
                ["contact", "text", ""],
              ]}
            />

            <SchemaTable
              name="tournament_registrations"
              purpose="A user's signup for a tournament."
              cols={[
                ["id", "uuid pk", ""],
                ["tournament_id", "uuid fk → tournaments", ""],
                ["user_id", "uuid fk → user_accounts", ""],
                ["status", "text", "'Registered' | 'Waitlist' | 'Confirmed' | 'Checked-in' | 'Completed' | 'Cancelled'"],
                ["registered_at", "timestamptz", ""],
              ]}
            />

            <SchemaTable
              name="integration_status"
              purpose="Per-club sync health for the Rhapsody Golf core system."
              cols={[
                ["club_id", "text pk fk → clubs", ""],
                ["membership_sync", "jsonb", "{ status, last_sync }"],
                ["teesheet_sync", "jsonb", ""],
                ["pos_sync", "jsonb", ""],
                ["payment_sync", "jsonb", ""],
                ["loyalty_sync", "jsonb", ""],
              ]}
            />

            <SchemaTable
              name="audit_logs"
              purpose="Immutable record of privileged actions."
              cols={[
                ["id", "uuid pk", ""],
                ["actor_user_id", "uuid fk → user_accounts", ""],
                ["action", "text", "e.g. 'role.grant', 'refund.issue'"],
                ["target", "text", "Entity affected"],
                ["metadata", "jsonb", "Before/after diff"],
                ["created_at", "timestamptz", ""],
              ]}
            />
          </Section>

          <Section id="relationships" title="Entity relationships">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto leading-relaxed">
{`user_accounts (1) ──< (many) user_roles
user_accounts (1) ──< (many) club_members >── (1) clubs
user_accounts (1) ──< (many) bookings     >── (1) clubs
bookings      (1) ──  (1)    visits
bookings      (many) ─(1)    tournaments      (optional)
user_accounts (1) ──< (many) payment_transactions >── (1) clubs
user_accounts (1) ──< (many) loyalty_ledger       >── (1) clubs
user_accounts (1) ──< (many) vouchers             >── (1) clubs
user_accounts (1) ──< (many) scorecards           >── (1) clubs
clubs         (1) ──< (many) tournaments
tournaments   (1) ──< (many) tournament_registrations >── (1) user_accounts
clubs         (1) ──< (many) promotion_campaigns
clubs         (1) ──  (1)    integration_status`}
            </pre>
            <div className="mt-4 space-y-2 text-sm">
              <p><strong>Key rule:</strong> A single <Code>user_accounts</Code> row can have any number of <Code>club_members</Code> rows — one per club they interact with. That is what makes "one Rhapsody ID, many club relationships" work.</p>
              <p><strong>Row-level security:</strong> Golfers can read only their own rows. Club admins can read/write only rows where <Code>club_id</Code> matches their assigned club. Superadmins have full read; writes are logged to <Code>audit_logs</Code>.</p>
            </div>
          </Section>

          {/* ─────────────── CHANGELOG ─────────────── */}
          <SectionHeader>Reference</SectionHeader>

          <Section id="changelog" title="Changelog">
            <p className="text-sm text-muted-foreground mb-3">
              Add a new entry at the top whenever we ship a change. Newest first.
            </p>
            <Changelog entries={[
              {
                date: "2026-07-09",
                title: "Tournament Engine (Topic 6) locked",
                bullets: [
                  "Formats v1: Stroke play, Stableford, System 36 (Asia-standard same-day handicap), Match play, Team formats (scramble / best ball).",
                  "Handicap phasing: v1 gross + net with self-declared HCP; v2 Rhapsody-native RH-Index from platform rounds; v3 official WHS integration if demanded.",
                  "Scoring: BOTH live in-app + staff verify. Golfer enters, marker signs off per hole, staff verify before FINISHED. Offline-resilient scoring app for on-course use.",
                  "Prizes v1: RECORD-ONLY. Club handles physical/cash prizes offline. Auto-payout to GHV wallet is v2 candidate.",
                  "Flights ORGANIZER-DEFINED (any number, free-form rules). Tie-breaks ORGANIZER-PICKED per event (countback / playoff / handicap / coin toss / share).",
                  "Leaderboard live + public shareable link during play. Provisional vs verified state visible per player.",
                  "Multi-club series (GolfHub Cup) NOT built for v1, but data model reserves nullable series_id + season_id so the layer can be added without migration.",
                ],
              },
              {
                date: "2026-07-09",
                title: "Club Operations (Topic 5) locked",
                bullets: [
                  "Tee sheet is one live source of truth per club with realtime websocket sync; 5 channel tags on every booking (GH_APP / WIDGET / RESVN_PHONE_WA / WALKIN / MEMBER_HOTLINE); 60-second optimistic hold across channels; offline fallback for front desk.",
                  "Rate engine: Rhapsody owns the schema dimensions (source, day type, time band, season); clubs configure values within it including free-form time band count and boundaries (2-10 bands). New dimensions are platform rollouts, not per-club edits.",
                  "Rate lock: price freezes at CONFIRMED. No auto-refund on rate drops, no dynamic re-pricing before tee time.",
                  "Promotions v1: % off and fixed-IDR-off vouchers only. Buy-X-get-Y, segment targeting, broadcast deferred to v2.",
                  "Network benchmarks: opt-in both to contribute and to consume. Min 10 clubs per bracket before comparison surfaces. Peer brackets by course type + region + hole count. Small-cell suppression enforced.",
                ],
              },
              {
                date: "2026-07-09",
                title: "Product logic documented",
                bullets: [
                  "Added Product logic section covering distribution channels, rate cards, checkout stack order, cart/caddie policies, GHV/GHP wallet, commission & payout, booking lifecycle, cancellation & refunds, and identity/roles.",
                  "Locked in v1 rules: one rate per booking (no stacking), cheapest eligible rate preselected, hard signup wall at checkout only, included/mandatory/optional service policies.",
                  "Open decisions flagged: commission model (a/b/c), no-show enforcement mechanism.",
                ],
              },
              {

                date: "2026-07-01",
                title: "Documentation area added",
                bullets: [
                  "Introduced /docs route with searchable TOC covering features, personas, tech stack, and full database schema.",
                  "Documented every entity in mockData.ts with target Postgres column shapes.",
                ],
              },
              {
                date: "2026-06-28",
                title: "Hover-intent route preloading",
                bullets: [
                  "Enabled defaultPreload: 'intent' in the router so tab switches feel instant.",
                ],
              },
              {
                date: "2026-06-25",
                title: "Play history detail",
                bullets: [
                  "Single-round history clubs now render the round directly with no clickable date.",
                  "Multi-round history clubs use a list + detail split-view with date/time, partners, game type, and score.",
                ],
              },
              {
                date: "2026-06-20",
                title: "Profile play history",
                bullets: [
                  "Profile page aggregates every club the golfer has played at or entered a tournament for.",
                  "Tournament-only clubs get a gold 'Tournament' badge.",
                ],
              },
            ]}/>
          </Section>
        </div>
      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Section primitives
// ─────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-4 border-t">
      <div className="text-[10px] uppercase tracking-[0.22em] text-primary font-semibold">
        {children}
      </div>
    </div>
  );
}

function Section({
  id, title, route, children,
}: { id: string; title: string; route?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card className="shadow-elegant">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-xl font-display">{title}</CardTitle>
            {route && (
              <Badge variant="outline" className="font-mono text-[11px]">{route}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="prose-sm text-sm text-foreground/85 space-y-3 leading-relaxed">
          {children}
        </CardContent>
      </Card>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>;
}

function PersonaCard({
  title, role, summary, access,
}: { title: string; role: string; summary: string; access: string }) {
  return (
    <div className="rounded-lg border p-4 space-y-2 bg-card">
      <div className="flex items-center justify-between">
        <div className="font-medium">{title}</div>
        <Badge variant="secondary" className="font-mono text-[10px]">{role}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{summary}</p>
      <p className="text-xs text-muted-foreground"><strong className="text-foreground">Access:</strong> {access}</p>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 list-disc pl-5 marker:text-primary/60">
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>;
}

function SchemaTable({
  name, purpose, cols,
}: { name: string; purpose: string; cols: [string, string, string][] }) {
  return (
    <div className="rounded-lg border overflow-hidden my-4">
      <div className="px-4 py-3 bg-muted/60 border-b flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-mono text-sm font-semibold">{name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{purpose}</div>
        </div>
        <Badge variant="outline" className="text-[10px]">table</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-2">Column</th>
              <th className="text-left font-medium px-4 py-2">Type</th>
              <th className="text-left font-medium px-4 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {cols.map(([c, t, n], i) => (
              <tr key={c} className={cn("border-t", i % 2 === 1 && "bg-muted/10")}>
                <td className="px-4 py-1.5 font-mono">{c}</td>
                <td className="px-4 py-1.5 font-mono text-muted-foreground">{t}</td>
                <td className="px-4 py-1.5 text-muted-foreground">{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Changelog({
  entries,
}: { entries: { date: string; title: string; bullets: string[] }[] }) {
  return (
    <div className="space-y-4">
      {entries.map((e) => (
        <div key={e.date + e.title} className="rounded-lg border p-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <div className="font-medium">{e.title}</div>
            <div className="text-xs text-muted-foreground font-mono">{e.date}</div>
          </div>
          <ul className="mt-2 space-y-1 list-disc pl-5 text-sm text-muted-foreground marker:text-primary/60">
            {e.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
