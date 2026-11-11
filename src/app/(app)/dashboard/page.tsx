import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, CircleDollarSign, ClipboardList, Download, TriangleAlert, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireCompanyId } from "@/lib/queries/company";
import { formatCurrencyBRL, formatDate } from "@/lib/format";
import {
  BUDGET_STATUS,
  BUDGET_STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
  isBudgetOverdue,
  type BudgetStatus,
  type PaymentStatus,
} from "@/lib/budget-status";
import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { BudgetsByStatusChart } from "@/components/dashboard/budgets-by-status-chart";

const NON_ACTIVE_STATUSES: readonly BudgetStatus[] = ["concluido", "cancelado"];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = await requireCompanyId(supabase, user.id);

  const [{ data: budgets }, { count: clientesAtivos }] = await Promise.all([
    supabase
      .from("budgets")
      .select("id, titulo, status, status_pagamento, valor_total, data_previsao_entrega, clients(nome)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("ativo", true),
  ]);

  const list = budgets ?? [];
  const ativos = list.filter((b) => !NON_ACTIVE_STATUSES.includes(b.status as BudgetStatus));
  const valorAtivos = ativos.reduce((sum, b) => sum + Number(b.valor_total ?? 0), 0);
  const atrasados = ativos.filter((b) => isBudgetOverdue(b.status as BudgetStatus, b.data_previsao_entrega));

  const statusCounts = BUDGET_STATUS.map((status) => ({
    status,
    label: BUDGET_STATUS_CONFIG[status].label,
    count: list.filter((b) => b.status === status).length,
  }));

  const proximasEntregas = ativos
    .filter((b) => b.data_previsao_entrega && !isBudgetOverdue(b.status as BudgetStatus, b.data_previsao_entrega))
    .sort((a, b) => (a.data_previsao_entrega! < b.data_previsao_entrega! ? -1 : 1))
    .slice(0, 5);

  const cobraveis = list.filter((b) => b.status !== "cancelado");
  const pagos = cobraveis.filter((b) => b.status_pagamento === "pago");
  const pendentesPagamento = cobraveis.filter((b) => (b.status_pagamento ?? "aguardando_pagamento") !== "pago");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral das suas obras e orçamentos.</p>
        </div>
        <Button variant="secondary" size="sm" render={<a href="/orcamentos/export" download />}>
          <Download className="size-4" />
          Baixar tabela
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <DashboardKpiCard icon={ClipboardList} label="Orçamentos ativos" value={String(ativos.length)} />
        <DashboardKpiCard icon={Wallet} label="Valor em orçamentos ativos" value={formatCurrencyBRL(valorAtivos)} />
        <DashboardKpiCard
          icon={TriangleAlert}
          label="Atrasados"
          value={String(atrasados.length)}
          tone={atrasados.length > 0 ? "warning" : undefined}
        />
        <DashboardKpiCard icon={Users} label="Clientes ativos" value={String(clientesAtivos ?? 0)} />
        <DashboardKpiCard icon={CheckCircle2} label="Pagos" value={String(pagos.length)} />
        <DashboardKpiCard
          icon={CircleDollarSign}
          label="Pendente pagamento"
          value={String(pendentesPagamento.length)}
          tone={pendentesPagamento.length > 0 ? "warning" : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orçamentos por status</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetsByStatusChart data={statusCounts} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas entregas</CardTitle>
          </CardHeader>
          <CardContent>
            {proximasEntregas.length > 0 ? (
              <ul className="flex flex-col divide-y divide-border">
                {proximasEntregas.map((budget) => {
                  const client = Array.isArray(budget.clients) ? budget.clients[0] : budget.clients;
                  return (
                    <li key={budget.id}>
                      <Link
                        href={`/orcamentos/${budget.id}`}
                        className="flex items-center justify-between gap-3 py-2.5 hover:text-primary"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium text-foreground">{budget.titulo}</span>
                          <span className="truncate text-xs text-muted-foreground">{client?.nome ?? "—"}</span>
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {formatDate(budget.data_previsao_entrega)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                Nenhuma entrega agendada.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {atrasados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[color:var(--chart-5)]">
              <TriangleAlert className="size-4" />
              Orçamentos atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {atrasados.map((budget) => {
                const client = Array.isArray(budget.clients) ? budget.clients[0] : budget.clients;
                return (
                  <li key={budget.id}>
                    <Link
                      href={`/orcamentos/${budget.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 hover:text-primary"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">{budget.titulo}</span>
                        <span className="truncate text-xs text-muted-foreground">{client?.nome ?? "—"}</span>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums text-[color:var(--chart-5)]">
                        {formatDate(budget.data_previsao_entrega)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {pendentesPagamento.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDollarSign className="size-4 text-[color:var(--chart-3)]" />
              Orçamentos pendentes de pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {pendentesPagamento.map((budget) => {
                const client = Array.isArray(budget.clients) ? budget.clients[0] : budget.clients;
                const paymentStatus = (budget.status_pagamento as PaymentStatus) ?? "aguardando_pagamento";
                return (
                  <li key={budget.id}>
                    <Link
                      href={`/orcamentos/${budget.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 hover:text-primary"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">{budget.titulo}</span>
                        <span className="truncate text-xs text-muted-foreground">{client?.nome ?? "—"}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs font-medium tabular-nums text-foreground">
                          {formatCurrencyBRL(budget.valor_total)}
                        </span>
                        <Badge className={PAYMENT_STATUS_CONFIG[paymentStatus].className}>
                          {PAYMENT_STATUS_CONFIG[paymentStatus].label}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
