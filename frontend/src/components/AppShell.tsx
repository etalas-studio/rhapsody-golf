import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, MapPin, Wallet, Gift, ClipboardList, Trophy, User,
  Users, CalendarDays, Megaphone, Ticket, Sparkles, BarChart3, History,
  Building2, Globe2, AppWindow, Activity, ScrollText, LogOut, ShieldCheck,
  Bell, Menu, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Sun, Moon, Grid3x3, Settings2,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/appContext";
import { useTheme } from "@/lib/useTheme";
import { clubs } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import golfhubMark from "@/assets/golfhub-mark.png";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const golferNav: NavItem[] = [
  { to: "/golfer", label: "Home", icon: LayoutDashboard },
  { to: "/golfer/courses", label: "Courses", icon: MapPin },
  { to: "/golfer/wallet", label: "Wallet", icon: Wallet },
  { to: "/golfer/loyalty", label: "Loyalty & Vouchers", icon: Gift },
  { to: "/golfer/bookings", label: "My Bookings", icon: History },
  { to: "/golfer/scorecard", label: "Scorecard", icon: ClipboardList },
  { to: "/golfer/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/golfer/profile", label: "Profile", icon: User },
];

// Bottom tab bar — 5 most important for mobile golfers
const golferTabs: NavItem[] = [
  { to: "/golfer", label: "Home", icon: LayoutDashboard },
  { to: "/golfer/courses", label: "Courses", icon: MapPin },
  { to: "/golfer/scorecard", label: "Score", icon: ClipboardList },
  { to: "/golfer/loyalty", label: "Rewards", icon: Gift },
  { to: "/golfer/profile", label: "Profile", icon: User },
];

const clubNav: NavItem[] = [
  { to: "/club", label: "Dashboard", icon: LayoutDashboard },
  { to: "/club/course-setup", label: "Course Setup", icon: Settings2 },
  { to: "/club/bookinglist", label: "Booking List", icon: CalendarDays },
  { to: "/club/slots", label: "Tee Time Manager", icon: Grid3x3 },
  // { to: "/club/promotions", label: "Promotions", icon: Megaphone },
  { to: "/club/vouchers", label: "Vouchers", icon: Ticket },
  // { to: "/club/loyalty", label: "Loyalty Rules", icon: Sparkles },
  // { to: "/club/analytics", label: "Revenue & Analytics", icon: BarChart3 },
];

const adminNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: Globe2 },
  { to: "/admin/courses", label: "Golf Clubs", icon: Building2 },
  { to: "/admin/club-admins", label: "Club Admins", icon: ShieldCheck },
  { to: "/admin/members", label: "Golfers", icon: Users },
];

const docsNavItem: NavItem = { to: "/docs", label: "Documentation", icon: BookOpen };

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function isActive(pathname: string, to: string) {
  if (pathname === to) return true;
  if (to === "/golfer" || to === "/club" || to === "/admin") return false;
  return pathname.startsWith(to);
}

function BrandBlock({ isBranded, selectedClub }: { isBranded: boolean; selectedClub: { shortName: string; logo: string; banner: string } }) {
  if (isBranded) {
    return (
      <>
        <div
          className="h-9 w-9 rounded-xl grid place-items-center text-lg shadow-glow shrink-0"
          style={{ background: selectedClub.banner }}
        >
          {selectedClub.logo}
        </div>
        <div className="leading-tight min-w-0">
          <div className="font-display text-lg tracking-tight truncate">{selectedClub.shortName}</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
            on GolfHub · Powered by Rhapsody
          </div>
        </div>
      </>
    );
  }
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <img src={golfhubMark} alt="" className="h-9 w-9 shrink-0" />
      <div className="leading-tight min-w-0">
        <div className="font-display text-lg tracking-tight text-sidebar-foreground">
          Rhapsody <span className="text-gold">GolfHub</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
          Member network
        </div>
      </div>
    </div>
  );
}

function NavList({
  items, pathname, onNavigate, collapsed = false,
}: { items: NavItem[]; pathname: string; onNavigate?: () => void; collapsed?: boolean }) {
  return (
    <>
      {items.map((item) => {
        const active = isActive(pathname, item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg py-2.5 text-sm transition-colors",
              collapsed ? "px-3 justify-center" : "px-3",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground ring-gold"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </>
  );
}

const DEMO_ACCOUNTS = [
  { role: "golfer" as const,     label: "Golfer",     name: "Michael Tan",         color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  { role: "club_admin" as const, label: "Club Admin", name: "Admin Pondok Indah",   color: "bg-primary/10 text-primary border-primary/30" },
  { role: "superadmin" as const, label: "Superadmin", name: "Superadmin Rhapsody",  color: "bg-gold/10 text-gold border-gold/30" },
] as const;

function DemoControls({ stacked = false }: { stacked?: boolean }) {
  const { role, isAuthenticated, signInAsDemo, signOut } = useApp();
  const navigate = useNavigate();

  function handleSwitch(target: typeof DEMO_ACCOUNTS[number]["role"]) {
    signInAsDemo(target);
    if (target === "golfer") navigate({ to: "/golfer" });
    else if (target === "club_admin") navigate({ to: "/club" });
    else navigate({ to: "/admin" });
  }

  return (
    <div className={stacked ? "space-y-1.5" : "flex items-center gap-1.5"}>
      <span className={stacked ? "block text-[10px] uppercase tracking-wider text-sidebar-foreground/50 px-1 pb-0.5" : "text-[10px] text-muted-foreground uppercase tracking-wider mr-1"}>Demo</span>
      {DEMO_ACCOUNTS.map(({ role: r, label, color }) => (
        <button
          key={r}
          onClick={() => handleSwitch(r)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
            stacked && "w-full text-left rounded-lg px-3 py-2 text-xs",
            isAuthenticated && role === r
              ? color
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
          )}
        >
          {label}
        </button>
      ))}
      {isAuthenticated && (
        <button
          onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          className={cn(
            "rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-all",
            stacked && "w-full text-left rounded-lg px-3 py-2 text-xs flex items-center gap-2"
          )}
        >
          {stacked && <LogOut className="h-3.5 w-3.5" />} Sign out
        </button>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, appMode, selectedClubId, selectedClubName, isAuthenticated, user, signOut } = useApp();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const nav = [...(role === "golfer" ? golferNav : role === "club_admin" ? clubNav : adminNav), docsNavItem];
  const selectedClub = clubs.find((c) => c.id === selectedClubId) ?? { shortName: selectedClubName || "Club", logo: "⛳", banner: "var(--primary)" };
  const isBranded = role === "golfer" && appMode === "club_branded";
  const showBottomTabs = role === "golfer";
  const sectionLabel = role === "golfer" ? "Golfer" : role === "club_admin" ? "Club Admin" : "Superadmin";

  return (
    <div className="h-screen flex w-full bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex relative shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        {/* Floating collapse toggle — sits on the border between sidebar and content */}
        {/* Brand */}
        <div className={cn("py-4 border-b border-sidebar-border flex items-center", sidebarCollapsed ? "px-3 justify-center" : "px-4")}>
          {!sidebarCollapsed && (
            <Link to="/golfer" className="flex items-center gap-3 flex-1 min-w-0">
              <BrandBlock isBranded={isBranded} selectedClub={selectedClub} />
            </Link>
          )}
        </div>

        {/* Floating collapse toggle — anchored to header height, sits on the sidebar border */}
        <button
          onClick={() => setSidebarCollapsed((v) => !v)}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute right-0 top-4 z-40 h-8 w-8 translate-x-1/2 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 shadow-sm hover:text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {!sidebarCollapsed && (
            <div className="px-2 pb-2 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40">
              {sectionLabel}
            </div>
          )}
          <NavList items={nav} pathname={pathname} collapsed={sidebarCollapsed} />
        </nav>
        <div className={cn("p-3 border-t border-sidebar-border", sidebarCollapsed && "flex flex-col items-center")}>
          {isAuthenticated && user && !sidebarCollapsed && (
            <div className="flex items-center gap-2 px-2 py-2 mb-1">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">{user.initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{user.name}</p>
                <p className="text-[10px] text-sidebar-foreground/50 capitalize">{role.replace("_", " ")}</p>
              </div>
            </div>
          )}
          {isAuthenticated && user && sidebarCollapsed && (
            <Avatar className="h-7 w-7 mb-1" title={user.name}>
              <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">{user.initials}</AvatarFallback>
            </Avatar>
          )}
          {isAuthenticated ? (
            <button
              onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
              title={sidebarCollapsed ? "Sign out" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors",
                sidebarCollapsed ? "justify-center w-10 px-0" : "w-full"
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && "Sign out"}
            </button>
          ) : (
            <Link
              to="/login"
              title={sidebarCollapsed ? "Sign in" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary hover:bg-sidebar-accent/60",
                sidebarCollapsed && "justify-center w-10 px-0"
              )}
            >
              <LogOut className="h-4 w-4 rotate-180 shrink-0" />
              {!sidebarCollapsed && "Sign in"}
            </Link>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 lg:h-16 shrink-0 border-b border-border bg-card/80 backdrop-blur z-30">
          <div className="h-full px-3 lg:px-8 flex items-center gap-2 lg:gap-3">
            {/* Mobile: hamburger + brand */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 -ml-1">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[84vw] max-w-sm p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
                <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-3">
                  <BrandBlock isBranded={isBranded} selectedClub={selectedClub} />
                </div>

                <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
                  <div className="px-2 pb-2 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40">{sectionLabel}</div>
                  <NavList items={nav} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
                </nav>
                <div className="p-3 border-t border-sidebar-border space-y-1">
                  {isAuthenticated && user && (
                    <div className="flex items-center gap-2 px-3 py-2 mb-1">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">{user.initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{user.name}</p>
                        <p className="text-[10px] text-sidebar-foreground/50 capitalize">{role.replace("_", " ")}</p>
                      </div>
                    </div>
                  )}
                  {isAuthenticated ? (
                    <button
                      onClick={() => { setDrawerOpen(false); signOut(); }}
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary hover:bg-sidebar-accent/60"
                    >
                      <LogOut className="h-4 w-4 rotate-180" /> Sign in
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/golfer" className="lg:hidden flex items-center min-w-0 flex-1">
              {isBranded ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-lg grid place-items-center text-base shrink-0" style={{ background: selectedClub.banner }}>
                    {selectedClub.logo}
                  </div>
                  <div className="font-display text-base truncate">{selectedClub.shortName}</div>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <img src={golfhubMark} alt="" className="h-7 w-7 shrink-0" />
                  <div className="font-display text-base truncate">
                    Rhapsody <span className="text-primary">GolfHub</span>
                  </div>
                </div>
              )}
            </Link>

            {/* Desktop demo controls */}
            <div className="hidden lg:flex">
              </div>

            <div className="hidden lg:block flex-1" />

            {/* Context badge */}
            <div className="hidden lg:flex">
              {role === "golfer" && appMode === "club_branded" && (
                <Badge variant="secondary" className="bg-accent text-accent-foreground text-[10px]">
                  {selectedClub.shortName} · powered by Rhapsody
                </Badge>
              )}
              {role === "golfer" && appMode === "rhapsody" && (
                <Badge variant="secondary" className="text-[10px]">GolfHub — network-wide</Badge>
              )}
              {role === "club_admin" && (
                <Badge variant="secondary" className="bg-accent text-accent-foreground text-[10px]">
                  Scope: {selectedClub.shortName}
                </Badge>
              )}
              {role === "superadmin" && (
                <Badge variant="secondary" className="bg-gold/20 text-gold-foreground dark:text-gold border-gold/40 border text-[10px]">
                  Realta Superadmin · Network
                </Badge>
              )}
            </div>

            <ThemeToggleButton />

            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bell className="h-4 w-4" />
            </Button>

            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-full hover:bg-accent transition-colors">
                    <Avatar className="h-8 w-8 ring-gold">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">{user.initials}</AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:block text-sm font-medium">{user.name}</span>
                    <ChevronDown className="hidden lg:block h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.rhapsody_id}</div>
                    <div className="text-[10px] text-muted-foreground capitalize mt-0.5">{role.replace("_", " ")}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {role === "golfer" && (
                    <DropdownMenuItem asChild><Link to="/golfer/profile"><User className="h-4 w-4 mr-2" />Profile</Link></DropdownMenuItem>
                  )}
                  {role === "club_admin" && (
                    <DropdownMenuItem asChild><Link to="/club"><Building2 className="h-4 w-4 mr-2" />Dashboard</Link></DropdownMenuItem>
                  )}
                  {role === "superadmin" && (
                    <DropdownMenuItem asChild><Link to="/admin"><Globe2 className="h-4 w-4 mr-2" />Dashboard</Link></DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/login" }); }} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="h-9">
                <Link to="/login">Sign in</Link>
              </Button>
            )}
          </div>

        </header>

        <main className={cn("flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 lg:px-8 py-5 lg:py-8", showBottomTabs && "pb-24 lg:pb-8")}>
          {children}
        </main>

        {/* Mobile bottom tabs (golfer) */}
        {showBottomTabs && (
          <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
            <div className="grid grid-cols-5">
              {golferTabs.map((t) => {
                const active = isActive(pathname, t.to);
                const Icon = t.icon;
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                    <span className="leading-none">{t.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
