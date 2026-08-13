import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, UserPlus } from "lucide-react";
import { useSuperAdminClubs, useClubAdmins } from "@/lib/useApi";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/courses")({
  head: () => ({ meta: [{ title: "Golf Clubs · Superadmin" }] }),
  component: Clubs,
});

function Clubs() {
  const navigate = useNavigate();
  const { data: clubs, loading, refetch } = useSuperAdminClubs();
  const { data: admins } = useClubAdmins();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clubName, setClubName] = useState("");

  async function handleToggleActive(id: string, current: boolean) {
    setTogglingId(id);
    try {
      await api.superadmin.clubs.setActive(id, !current);
      await refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleCreate() {
    if (!clubName.trim()) {
      setError("Club name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.superadmin.clubs.create({ name: clubName.trim() });
      setOpen(false);
      setClubName("");
      await refetch();
      toast.success("Golf club created.", {
        description: "Assign a club admin so they can complete the club setup.",
        action: { label: "Assign Admin", onClick: () => navigate({ to: "/admin/club-admins" }) },
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create club.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Golf Clubs"
        subtitle="All golf clubs registered on the Rhapsody platform. Club admins are responsible for completing the club setup."
      />

      <div className="flex justify-end mb-4">
        <Button onClick={() => setOpen(true)} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Add Club
        </Button>
      </div>

      <Card className="shadow-elegant">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Club</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Club Admin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(clubs ?? []).map((c) => {
                  const assigned = (admins ?? []).find(
                    (a) => a.club_admins?.[0]?.clubs?.id === c.id
                  );
                  const isSetupComplete = !!c.location && !!c.description;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-8 w-8 rounded-lg grid place-items-center text-white text-sm font-bold shrink-0"
                            style={{ background: c.theme_color ?? "var(--primary)" }}
                          >
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium">{c.name}</div>                        
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.location || "—"}</TableCell>
                      <TableCell>
                        {c.region
                          ? <Badge variant="outline" className="capitalize">{c.region}</Badge>
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        {assigned ? (
                          <div className="text-sm">
                            <div className="font-medium">{assigned.name}</div>
                            <div className="text-xs text-muted-foreground">{assigned.email}</div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1"
                            onClick={() => navigate({ to: "/admin/club-admins" })}
                          >
                            <UserPlus className="h-3 w-3" />
                            Assign Admin
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isSetupComplete ? "default" : "secondary"}
                          className={isSetupComplete ? "bg-primary" : "text-muted-foreground"}>
                          {isSetupComplete ? "Setup complete" : "Setup incomplete"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={c.active}
                          disabled={togglingId === c.id}
                          onCheckedChange={() => handleToggleActive(c.id, c.active)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null); setClubName(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Golf Club</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="space-y-1.5">
              <Label>Club Name</Label>
              <Input
                placeholder="Emerald Hills Golf Club"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                The club admin will complete the full club profile after being assigned.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create Club"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
