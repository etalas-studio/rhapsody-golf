import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { formatIDR } from "@/lib/mockData";
import { useClubs } from "@/lib/useApi";
import { Search, MapPin, Clock } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/courses/")({
  head: () => ({ meta: [{ title: "Courses · Rhapsody App" }] }),
  component: AppCourses,
});

function clubBanner(themeColor: string | null) {
  return themeColor
    ? `linear-gradient(135deg, ${themeColor}, ${themeColor}bb)`
    : "linear-gradient(135deg, #1a2a40, #3a5a80)";
}

function AppCourses() {
  const [query, setQuery] = useState("");
  const { data: clubs, loading, error } = useClubs();

  const filtered = (clubs ?? []).filter((c) =>
    c.active &&
    (c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.location?.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <MobileShell>
      <div className="px-4 py-5 space-y-4">
        <h1 className="font-display text-2xl">Courses</h1>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive text-center py-4">Failed to load courses. Please try again.</p>
        )}

        {!loading && !error && (
          <div className="flex flex-col gap-3">
            {filtered.map((club) => (
              <Link key={club.id} to="/app/courses/$courseId" params={{ courseId: club.id }} className="block">
                <Card className="shadow-sm overflow-hidden">
                  <div className="h-32 relative overflow-hidden">
                    {club.banner_url ? (
                      <img
                        src={club.banner_url}
                        alt={club.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-end p-3"
                        style={{ background: clubBanner(club.theme_color) }}
                      >
                        <span className="text-2xl">{club.logo_url ?? "⛳"}</span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm truncate">{club.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {[club.location, club.region].filter(Boolean).join(", ")}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      {club.operating_hours ? (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          {club.operating_hours}
                        </p>
                      ) : <span />}
                      {club.starting_price ? (
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground leading-none">Starting from</p>
                          <p className="text-xs font-semibold text-primary leading-tight">{formatIDR(club.starting_price)}</p>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No courses found.</p>
            )}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
