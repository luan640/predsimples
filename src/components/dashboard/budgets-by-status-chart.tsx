"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLOR_VAR: Record<string, string> = {
  rascunho: "var(--muted-foreground)",
  enviado: "var(--chart-4)",
  aprovado: "var(--chart-3)",
  em_andamento: "var(--chart-1)",
  concluido: "var(--chart-2)",
  cancelado: "var(--muted-foreground)",
};

export function BudgetsByStatusChart({
  data,
}: {
  data: { status: string; label: string; count: number }[];
}) {
  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Nenhum orçamento cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
          <XAxis type="number" allowDecimals={false} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={100}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [value, "Orçamentos"]}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <Bar dataKey="count" radius={4} maxBarSize={24}>
            {data.map((entry) => (
              <Cell key={entry.status} fill={COLOR_VAR[entry.status] ?? "var(--chart-1)"} />
            ))}
            <LabelList dataKey="count" position="right" style={{ fill: "var(--foreground)", fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
