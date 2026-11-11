import type { LucideIcon } from "lucide-react";
import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";

export function DashboardKpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "warning";
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start gap-2.5 py-3">
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            tone === "warning" ? "text-[color:var(--chart-5)]" : "text-muted-foreground",
          )}
        />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p
            className={cn(
              "truncate text-xl font-semibold tabular-nums",
              tone === "warning" ? "text-[color:var(--chart-5)]" : "text-foreground",
            )}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
