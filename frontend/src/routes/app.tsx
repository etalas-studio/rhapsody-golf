import { createFileRoute, Outlet, useNavigate, useMatch } from "@tanstack/react-router";
import { useEffect } from "react";
import { useApp } from "@/lib/appContext";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

// /app/* is always light — fixed, not user-toggleable
function AppLayout() {
  const { isAuthenticated, authLoading, role } = useApp();
  const navigate = useNavigate();
  const isLoginRoute = useMatch({ from: "/app/login", shouldThrow: false });

  // Force light mode for all /app/* routes; restore previous class on unmount
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (had) root.classList.add("dark");
    };
  }, []);

  useEffect(() => {
    if (isLoginRoute || authLoading) return;
    if (!isAuthenticated) { navigate({ to: "/app/login" }); return; }
    // /app is golfer-only; admins go to their own dashboards
    if (role === "club_admin") { navigate({ to: "/club" }); return; }
    if (role === "superadmin") { navigate({ to: "/admin" }); return; }
  }, [isAuthenticated, authLoading, role, navigate, isLoginRoute]);

  if (!isLoginRoute && authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isLoginRoute && !authLoading && !isAuthenticated) return null;

  return <Outlet />;
}
