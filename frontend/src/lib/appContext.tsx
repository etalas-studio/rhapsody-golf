import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role, AppMode, WalletBalance, Booking } from "./mockData";
import { clubs, currentUser, initialWalletBalance, bookings as initialBookings } from "./mockData";
import { supabase } from "./supabase";
import { api, ApiError } from "./api";

export interface AuthedUser {
  id: string;
  rhapsody_id: string;
  name: string;
  initials: string;
  email: string;
}

interface AuthGateRequest {
  title: string;
  description: string;
  onSuccess: () => void;
}

interface AppState {
  role: Role;
  setRole: (r: Role) => void;
  appMode: AppMode;
  setAppMode: (m: AppMode) => void;
  selectedClubId: string;
  setSelectedClubId: (id: string) => void;
  selectedClubName: string;

  // Auth
  authLoading: boolean;
  isAuthenticated: boolean;
  user: AuthedUser | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null; role: Role | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null; role: Role | null }>;
  signOut: () => Promise<void>;
  /** Dev-only: sets a mock user without Supabase credentials */
  signInAsDemo: (role?: Role) => void;

  // Signup wall
  authGate: AuthGateRequest | null;
  requireAuth: (req: AuthGateRequest) => void;
  closeAuthGate: () => void;

  // Wallet (mutable mock balance — replaced by real API in Phase backend-2)
  wallet: WalletBalance;
  topUpGHV: (amount: number) => void;

  // Bookings (mutable — cancel updates local state)
  bookings: Booking[];
  cancelBooking: (id: string) => void;

  // Guest nudge
  courseViewCount: number;
  bumpCourseView: () => void;
  nudgeDismissed: boolean;
  dismissNudge: () => void;
}

const Ctx = createContext<AppState | null>(null);

const DEMO_USERS: Record<Role, AuthedUser> = {
  golfer: {
    id: "demo-golfer",
    rhapsody_id: "RGH-00042",
    name: "Michael Tan",
    initials: "MT",
    email: "michael.tan@demo.rhapsody.golf",
  },
  club_admin: {
    id: "demo-club-admin",
    rhapsody_id: "RGH-ADM01",
    name: "Admin Pondok Indah",
    initials: "AI",
    email: "admin@pondokindah.demo.rhapsody.golf",
  },
  superadmin: {
    id: "demo-superadmin",
    rhapsody_id: "RGH-SYS00",
    name: "Superadmin Rhapsody",
    initials: "SR",
    email: "superadmin@demo.rhapsody.golf",
  },
};

function makeInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("golfer");
  const [appMode, setAppMode] = useState<AppMode>("rhapsody");
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [selectedClubName, setSelectedClubName] = useState<string>("");

  const [user, setUser] = useState<AuthedUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authGate, setAuthGate] = useState<AuthGateRequest | null>(null);

  const [wallet, setWallet] = useState<WalletBalance>(initialWalletBalance);
  const topUpGHV = useCallback((amount: number) => {
    setWallet((w) => ({ ...w, ghv: w.ghv + amount }));
  }, []);

  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const cancelBooking = useCallback((id: string) => {
    setBookings((bs) => bs.map((b) => b.id === id ? { ...b, status: "Cancelled" } : b));
  }, []);

  const [courseViewCount, setCourseViewCount] = useState(0);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // Fetch user profile via backend /api/auth/me — DB access stays server-side.
  // Pass `accessToken` directly to avoid a race with supabase.auth.getSession()
  // that can occur when onAuthStateChange fires concurrently with signIn().
  const hydrateUser = useCallback(async (_authId: string, accessToken?: string): Promise<Role | null> => {
    try {
      const { user } = await api.auth.me(accessToken);
      setUser({
        id: user.id,
        rhapsody_id: user.rhapsody_id,
        name: user.name,
        initials: makeInitials(user.name),
        email: user.email,
      });
      setRole(user.role as Role);
      // For club_admin: set selectedClubId to their real assigned club.
      // For superadmin: keep current (they can switch via selector if needed).
      if (user.role === "club_admin" && user.club_id) {
        setSelectedClubId(user.club_id);
        setSelectedClubName(user.club_name ?? "");
      }
      return user.role as Role;
    } catch (e) {
      // Clear local state only — do NOT call supabase.auth.signOut() here.
      // A 401 during hydration can be a transient race; signing out would
      // propagate SIGNED_OUT to all tabs and cause a redirect loop.
      if (e instanceof ApiError && (e.status === 401 || e.status === 404)) {
        setUser(null);
        setRole("golfer");
      }
      return null;
    }
  }, []);

  // Restore session on mount and listen to auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        hydrateUser(session.user.id, session.access_token).finally(() => setAuthLoading(false));
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Pass access_token directly — avoids a getSession() race condition when
        // this fires concurrently with signIn() in the same or another tab.
        hydrateUser(session.user.id, session.access_token);
      } else {
        setUser(null);
        setRole("golfer");
      }
    });

    return () => subscription.unsubscribe();
  }, [hydrateUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: error?.message ?? "Sign in failed", role: null };
    const resolvedRole = await hydrateUser(data.user.id, data.session?.access_token);
    return { error: null, role: resolvedRole };
  }, [hydrateUser]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) return { error: error.message, role: null };
    // If no session, email confirmation is required — user must confirm before logging in
    if (!data.session) {
      return { error: "Check your email to confirm your account, then sign in.", role: null };
    }
    // Session exists (email confirmation disabled) — wait for DB trigger then hydrate
    await new Promise((r) => setTimeout(r, 800));
    const resolvedRole = await hydrateUser(data.user!.id);
    return { error: null, role: resolvedRole };
  }, [hydrateUser]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole("golfer");
    setSelectedClubId("");
    setSelectedClubName("");
  }, []);

  // Demo shortcut — bypasses Supabase (dev/prototype only)
  const signInAsDemo = useCallback((demoRole: Role = "golfer") => {
    setUser(DEMO_USERS[demoRole]);
    setRole(demoRole);
    if (demoRole === "club_admin") {
      // "Admin Pondok Indah" owns the emerald club in demo data
      setSelectedClubId("emerald");
      setSelectedClubName("Emerald Hills");
    }
  }, []);

  const requireAuth = useCallback((req: AuthGateRequest) => setAuthGate(req), []);
  const closeAuthGate = useCallback(() => setAuthGate(null), []);

  const bumpCourseView = useCallback(() => setCourseViewCount((n) => n + 1), []);
  const dismissNudge = useCallback(() => setNudgeDismissed(true), []);

  const value = useMemo<AppState>(
    () => ({
      role, setRole,
      appMode, setAppMode,
      selectedClubId, setSelectedClubId, selectedClubName,
      authLoading,
      isAuthenticated: user !== null,
      user,
      signIn, signUp, signOut, signInAsDemo,
      authGate, requireAuth, closeAuthGate,
      wallet, topUpGHV,
      bookings, cancelBooking,
      courseViewCount, bumpCourseView,
      nudgeDismissed, dismissNudge,
    }),
    [role, appMode, selectedClubId, authLoading, user, authGate, wallet, bookings, courseViewCount, nudgeDismissed,
     signIn, signUp, signOut, signInAsDemo, requireAuth, closeAuthGate, topUpGHV, cancelBooking, bumpCourseView, dismissNudge]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}
