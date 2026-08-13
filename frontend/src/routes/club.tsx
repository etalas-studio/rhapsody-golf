import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useApp } from "@/lib/appContext";
import { useEffect } from "react";

export const Route = createFileRoute("/club")({
  component: ClubLayout,
});

function ClubLayout() {
  const { isAuthenticated, authLoading, role } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { navigate({ to: "/login" }); return; }
    if (role === "golfer") { navigate({ to: "/golfer" }); return; }
    if (role === "superadmin") { navigate({ to: "/admin" }); return; }
  }, [isAuthenticated, authLoading, role, navigate]);

  if (authLoading) return <AuthLoadingSpinner />;
  if (!isAuthenticated || role !== "club_admin") return null;

  return <Outlet />;
}

function AuthLoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
