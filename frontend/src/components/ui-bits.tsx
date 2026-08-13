import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({
  label, value, hint, icon, accent,
}: { label: string; value: string | number; hint?: string; icon?: React.ReactNode; accent?: "default" | "gold" | "primary" }) {
  return (
    <Card className={cn("shadow-elegant border-border/60 overflow-hidden", accent === "gold" && "ring-gold")}>
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground leading-tight line-clamp-2">{label}</div>
          {icon && <div className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-lg grid place-items-center shrink-0",
            accent === "gold" ? "bg-gold/20 text-gold-foreground" :
            accent === "primary" ? "bg-primary/10 text-primary" :
            "bg-muted text-muted-foreground"
          )}>{icon}</div>}
        </div>
        <div className="mt-1.5 sm:mt-2 font-display text-lg sm:text-2xl md:text-3xl tracking-tight truncate">{value}</div>
        {hint && <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-5 md:mb-6">
      <div className="min-w-0">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatusDot({ status }: { status: "Online" | "Warning" | "Offline" }) {
  const color = status === "Online" ? "bg-success" : status === "Warning" ? "bg-warning" : "bg-destructive";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {status}
    </span>
  );
}
