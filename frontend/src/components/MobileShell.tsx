import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, MapPin, CalendarCheck, Trophy, User, Bell, LogOut } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import rhapsodyLogo from "@/assets/rhapsody-logo.png";

// Wallet & Rewards accessible from Home quick-actions; Chat from Home or Profile
const tabs = [
  { to: "/app", label: "Home", icon: LayoutDashboard },
  { to: "/app/courses", label: "Courses", icon: MapPin },
  { to: "/app/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/app/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/app/profile", label: "Profile", icon: User },
] as const;

function isActive(pathname: string, to: string) {
  if (to === "/app") return pathname === "/app" || pathname === "/app/";
  return pathname.startsWith(to);
}

export function MobileShell({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, signOut } = useApp();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const initials = user?.initials ?? "G";

  return (
    <div className="flex flex-col min-h-dvh max-w-[430px] mx-auto bg-background">
      {/* Top bar */}
      <header className="h-14 px-4 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
        <img src={rhapsodyLogo} alt="Rhapsody" className="h-7 w-auto" />
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Bell className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {isAuthenticated && user ? (
                <>
                  <DropdownMenuLabel>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground">{user.rhapsody_id}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/app/profile"><User className="h-4 w-4 mr-2" />Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => { signOut(); navigate({ to: "/app/login" }); }}
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem asChild>
                  <Link to="/app/login"><LogOut className="h-4 w-4 mr-2 rotate-180" />Sign in</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 border-t border-border bg-card/90 backdrop-blur">
        <div className="grid grid-cols-5">
          {tabs.map((t) => {
            const active = isActive(pathname, t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors",
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
    </div>
  );
}
