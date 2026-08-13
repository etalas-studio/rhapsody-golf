import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, UserPlus } from "lucide-react";
import { useClubAdmins, useSuperAdminClubs } from "@/lib/useApi";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/club-admins")({
  head: () => ({ meta: [{ title: "Club Admins · Superadmin" }] }),
  component: ClubAdmins,
});

const DEFAULT_FORM = { name: "", email: "", password: "", club_id: "" };

function ClubAdmins() {
  const { data: admins, loading, refetch } = useClubAdmins();
  const { data: clubs } = useSuperAdminClubs();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  function field(key: keyof typeof DEFAULT_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleCreate() {
    if (!form.name || !form.email || !form.password || !form.club_id) {
      setError("All fields are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.superadmin.clubAdmins.create(form);
      setOpen(false);
      setForm(DEFAULT_FORM);
      refetch();
      toast.success("Club admin account created.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create admin.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove club admin access for ${name}? The account will remain but lose admin privileges.`)) return;
    try {
      await api.superadmin.clubAdmins.remove(userId);
      refetch();
      toast.success("Admin access removed.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove admin.");
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Club Admins"
        subtitle="Register club admin accounts and assign them to a golf club. The admin will complete the club setup after logging in."
      />

      <div className="flex justify-end mb-4">
        <Button onClick={() => setOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Club Admin
        </Button>
      </div>

      <Card className="shadow-elegant">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded" />)}
            </div>
          ) : (admins ?? []).length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No club admins yet. Click "Add Club Admin" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Assigned Club</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(admins ?? []).map((a) => {
                  const clubName = a.club_admins?.[0]?.clubs?.name;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.email}</TableCell>
                      <TableCell>
                        {clubName
                          ? <Badge variant="outline">{clubName}</Badge>
                          : <span className="text-xs text-muted-foreground">Not assigned</span>
                        }
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemove(a.id, a.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null); setForm(DEFAULT_FORM); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Club Admin</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input placeholder="Ahmad Santoso" value={form.name} onChange={field("name")} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="admin@emeraldhills.com" value={form.email} onChange={field("email")} />
            </div>
            <div className="space-y-1.5">
              <Label>Initial Password</Label>
              <Input type="password" placeholder="Min. 8 characters" value={form.password} onChange={field("password")} />
            </div>
            <div className="space-y-1.5">
              <Label>Assign to Club</Label>
              <Select value={form.club_id} onValueChange={(v) => setForm((f) => ({ ...f, club_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a golf club..." />
                </SelectTrigger>
                <SelectContent>
                  {(clubs ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
