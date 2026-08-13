import { createFileRoute } from "@tanstack/react-router";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { formatIDR } from "@/lib/mockData";
import { useVouchers } from "@/lib/useApi";
import { useApp } from "@/lib/appContext";
import type { ApiVoucher, ApiVoucherIssue } from "@/lib/api";
import { api } from "@/lib/api";
import { Plus, Users, Lock, Eye } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const Route = createFileRoute("/club/vouchers")({
  head: () => ({ meta: [{ title: "Vouchers · Club Admin" }] }),
  component: Vouchers,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VOUCHER_TYPES = ["Green Fee", "F&B", "Cart", "Pro Shop"] as const;

// Map DB enum values back to display labels
const TYPE_DISPLAY: Record<string, string> = {
  GreenFee: "Green Fee",
  FAndB: "F&B",
  Cart: "Cart",
  ProShop: "Pro Shop",
};

function typeLabel(type: string) {
  return TYPE_DISPLAY[type] ?? type;
}

function discountLabel(v: ApiVoucher) {
  if (v.discount_type === "Percentage") {
    const cap = v.max_discount_cap ? ` (max ${formatIDR(v.max_discount_cap)})` : "";
    return `${v.discount_value}% off${cap}`;
  }
  return formatIDR(v.discount_value);
}

function statusVariant(status: ApiVoucher["status"]) {
  if (status === "Active") return "default";
  if (status === "Redeemed") return "secondary";
  return "outline";
}

function fmtDate(d: string) {
  try { return format(parseISO(d), "d MMM yyyy"); } catch { return d; }
}

// ─── Numeric input ─────────────────────────────────────────────────────────────

function NumericInput({ value, onChange, placeholder, className }: {
  value?: number;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(value !== undefined ? String(value) : "");

  useEffect(() => {
    setText(value !== undefined ? String(value) : "");
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setText(raw);
    onChange(raw === "" ? undefined : parseInt(raw, 10));
  }

  function handleBlur() {
    if (text) setText(Number(text).toLocaleString("en-US"));
  }

  return (
    <Input value={text} onChange={handleChange} onBlur={handleBlur}
      placeholder={placeholder} inputMode="numeric" className={className} />
  );
}

// ─── Detail popup ──────────────────────────────────────────────────────────────

function VoucherDetailDialog({ v, onClose, onEdit, onDeactivate }: {
  v: ApiVoucher;
  onClose: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-base">{v.voucher_code}</span>
            <Badge variant={statusVariant(v.status)}
              className={v.status === "Active" ? "bg-success text-success-foreground" : ""}>
              {v.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="font-medium">{v.title}</p>
          {v.description && <p className="text-muted-foreground text-xs">{v.description}</p>}

          <Separator />

          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-medium">{discountLabel(v)}</span>

            <span className="text-muted-foreground">Category</span>
            <span><Badge variant="outline" className="text-xs">{typeLabel(v.type)}</Badge></span>

            <span className="text-muted-foreground">Quota</span>
            <span className={`font-medium tabular-nums ${v.used_count >= v.quota ? "text-destructive" : ""}`}>
              {v.used_count} / {v.quota} used
            </span>

            <span className="text-muted-foreground">Starts</span>
            <span>{fmtDate(v.starts_at)}</span>

            <span className="text-muted-foreground">Expires</span>
            <span>{fmtDate(v.expiry_date)}</span>

            <span className="text-muted-foreground">Visibility</span>
            <span className="flex items-center gap-1">
              {v.is_public
                ? <><Users className="h-3 w-3" /> Public</>
                : <><Lock className="h-3 w-3" /> Private</>}
            </span>

            {v.min_booking_amount && (
              <>
                <span className="text-muted-foreground">Min. booking</span>
                <span>{formatIDR(v.min_booking_amount)}</span>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {v.status === "Active" && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    Deactivate
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deactivate voucher?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Voucher <span className="font-mono font-semibold">{v.voucher_code}</span> will be
                      cancelled and can no longer be used.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDeactivate}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, deactivate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button size="sm" onClick={onEdit}>Edit</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const voucherSchema = z.object({
  title: z.string().min(3, "Minimum 3 characters"),
  voucher_code: z.string().min(3, "Minimum 3 characters").regex(/^[A-Z0-9-]+$/, "Uppercase letters, numbers, and hyphens only"),
  description: z.string().optional(),
  type: z.enum(["Green Fee", "F&B", "Cart", "Pro Shop"]),
  discount_type: z.enum(["Percentage", "FixedAmount"]),
  discount_value: z.coerce.number({ invalid_type_error: "Required" }).min(1, "Required"),
  max_discount_cap: z.coerce.number().optional(),
  min_booking_amount: z.coerce.number().optional(),
  quota: z.coerce.number({ invalid_type_error: "Required" }).int().min(1, "Required"),
  starts_at: z.string().min(1, "Required"),
  expiry_date: z.string().min(1, "Required"),
  is_public: z.boolean(),
}).refine((d) => d.expiry_date > d.starts_at, {
  message: "End date must be after start date",
  path: ["expiry_date"],
}).refine((d) => d.discount_type !== "Percentage" || d.discount_value <= 100, {
  message: "Maximum 100% for percentage discount",
  path: ["discount_value"],
});

type VoucherForm = z.infer<typeof voucherSchema>;

// ─── Form dialog ──────────────────────────────────────────────────────────────

function VoucherFormDialog({ open, onClose, initial, clubId, onSaved }: {
  open: boolean;
  onClose: () => void;
  initial?: ApiVoucher;
  clubId: string;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting, isValid } } = useForm<VoucherForm>({
    resolver: zodResolver(voucherSchema),
    mode: "onChange",
    defaultValues: initial
      ? {
          title: initial.title,
          voucher_code: initial.voucher_code,
          description: initial.description ?? "",
          type: (TYPE_DISPLAY[initial.type] ?? initial.type) as VoucherForm["type"],
          discount_type: initial.discount_type,
          discount_value: initial.discount_value,
          max_discount_cap: initial.max_discount_cap ?? undefined,
          min_booking_amount: initial.min_booking_amount ?? undefined,
          quota: initial.quota,
          starts_at: initial.starts_at.slice(0, 10),
          expiry_date: initial.expiry_date.slice(0, 10),
          is_public: initial.is_public,
        }
      : { discount_type: "Percentage", is_public: false, quota: 1 },
  });

  const discountType = watch("discount_type");

  async function onSubmit(data: VoucherForm) {
    if (isEdit && initial) {
      const { voucher_code: _omit, ...mutable } = data;
      await api.admin.vouchers.update(initial.id, { ...mutable, club_id: clubId });
    } else {
      await api.admin.vouchers.issue({ ...data, club_id: clubId });
    }
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Voucher" : "Create New Voucher"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Voucher Name</Label>
              <Input {...register("title")} placeholder="25% Off Weekday Green Fee" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Voucher Code</Label>
              <Input {...register("voucher_code")} placeholder="EH-GOLD-25" className="font-mono uppercase" />
              {errors.voucher_code && <p className="text-xs text-destructive">{errors.voucher_code.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Category</Label>
              <Controller name="type" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {VOUCHER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea {...register("description")} rows={2} placeholder="Short note visible to golfers" />
            </div>

            <div className="space-y-1">
              <Label>Discount Type</Label>
              <Controller name="discount_type" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Percentage">Percentage (%)</SelectItem>
                    <SelectItem value="FixedAmount">Fixed Amount (IDR)</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>

            <div className="space-y-1">
              <Label>{discountType === "Percentage" ? "Value (1–100%)" : "Discount Value (IDR)"}</Label>
              <Controller name="discount_value" control={control} render={({ field }) => (
                <NumericInput value={field.value} onChange={field.onChange}
                  placeholder={discountType === "Percentage" ? "25" : "150,000"} />
              )} />
              {errors.discount_value && <p className="text-xs text-destructive">{errors.discount_value.message}</p>}
            </div>

            {discountType === "Percentage" && (
              <div className="space-y-1">
                <Label>Max Discount Cap (IDR) <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Controller name="max_discount_cap" control={control} render={({ field }) => (
                  <NumericInput value={field.value} onChange={field.onChange} placeholder="300,000" />
                )} />
              </div>
            )}

            <div className="space-y-1">
              <Label>Minimum Booking (IDR) <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Controller name="min_booking_amount" control={control} render={({ field }) => (
                <NumericInput value={field.value} onChange={field.onChange} placeholder="500,000" />
              )} />
            </div>

            <div className="space-y-1">
              <Label>Quota</Label>
              <Controller name="quota" control={control} render={({ field }) => (
                <NumericInput value={field.value} onChange={field.onChange} placeholder="10" />
              )} />
              {errors.quota && <p className="text-xs text-destructive">{errors.quota.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Starts</Label>
              <Input {...register("starts_at")} type="date" />
              {errors.starts_at && <p className="text-xs text-destructive">{errors.starts_at.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Expires</Label>
              <Input {...register("expiry_date")} type="date" />
              {errors.expiry_date && <p className="text-xs text-destructive">{errors.expiry_date.message}</p>}
            </div>

            <div className="col-span-2 flex items-center gap-3">
              <Controller name="is_public" control={control} render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} id="is_public" />
              )} />
              <Label htmlFor="is_public" className="cursor-pointer">
                {watch("is_public")
                  ? <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Public — all golfers can use</span>
                  : <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Private — assigned to specific golfer</span>}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Create Voucher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function Vouchers() {
  const { selectedClubId } = useApp();
  const { data: vouchers, loading, error, refetch } = useVouchers(selectedClubId);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<ApiVoucher | null>(null);
  const [editTarget, setEditTarget] = useState<ApiVoucher | null>(null);

  const list = vouchers ?? [];

  async function handleCancel(v: ApiVoucher) {
    await api.admin.vouchers.issue({ ...v, club_id: v.club_id, status: "Cancelled" } as ApiVoucherIssue);
    setDetailTarget(null);
    refetch();
  }

  return (
    <AppShell>
      <PageHeader
        title="Voucher Management"
        subtitle="Issue, track, and manage vouchers for your club members."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Create voucher
          </Button>
        }
      />

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive text-center py-4">Failed to load vouchers.</p>
      )}

      {!loading && !error && (
        <Card className="shadow-elegant">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quota</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No vouchers yet. Create your first one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    list.map((v) => (
                      <TableRow key={v.id} className="cursor-pointer hover:bg-muted/40"
                        onClick={() => setDetailTarget(v)}>
                        <TableCell className="font-mono text-xs">{v.voucher_code}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate" title={v.title}>
                          {v.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{typeLabel(v.type)}</Badge>
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          <span className={v.used_count >= v.quota ? "text-destructive font-semibold" : ""}>
                            {v.used_count}/{v.quota}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(v.status)}
                            className={v.status === "Active" ? "bg-success text-success-foreground" : ""}>
                            {v.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost"
                            onClick={() => setDetailTarget(v)}>
                            <Eye className="h-3.5 w-3.5 mr-1" />Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail popup */}
      {detailTarget && (
        <VoucherDetailDialog
          v={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={() => { setEditTarget(detailTarget); setDetailTarget(null); }}
          onDeactivate={() => handleCancel(detailTarget)}
        />
      )}

      <VoucherFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        clubId={selectedClubId ?? ""}
        onSaved={refetch}
      />

      {editTarget && (
        <VoucherFormDialog
          open
          onClose={() => setEditTarget(null)}
          initial={editTarget}
          clubId={selectedClubId ?? ""}
          onSaved={refetch}
        />
      )}
    </AppShell>
  );
}
