import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Search, TriangleAlert } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableRowLink } from "@/components/ui/table-row-link";
import { createClient } from "@/lib/supabase/server";
import { requireCompanyId } from "@/lib/queries/company";
import { getNextBudgetNumero } from "@/lib/queries/budgets";
import { formatCurrencyBRL, formatDate } from "@/lib/format";
import {
  BUDGET_STATUS,
  BUDGET_STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
  isBudgetOverdue,
  type BudgetStatus,
  type PaymentStatus,
} from "@/lib/budget-status";
import { NewBudgetSheet } from "@/components/budgets/new-budget-sheet";
import { BudgetFiltersSheet } from "@/components/budgets/budget-filters-sheet";
import { getBudgetSortOption } from "@/lib/budget-sort";

function sanitizeOrTerm(value: string) {
  return value.replace(/[,()]/g, "");
}

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; novo?: string; error?: string }>;
}) {
  const { q, status, sort, novo, error } = await searchParams;
  const selectedStatuses = (status ?? "")
    .split(",")
    .filter((s): s is BudgetStatus => (BUDGET_STATUS as readonly string[]).includes(s));
  const sortOption = getBudgetSortOption(sort);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = await requireCompanyId(supabase, user.id);

  let query = supabase
    .from("budgets")
    .select(
      "id, titulo, numero, numero_pedido, numero_nota, status, status_pagamento, valor_total, data_previsao_entrega, clients(nome)",
    )
    .eq("company_id", companyId)
    .order(sortOption.column, { ascending: sortOption.ascending });

  if (selectedStatuses.length > 0) {
    query = query.in("status", selectedStatuses);
  }

  if (q) {
    const term = sanitizeOrTerm(q);
    const { data: matchedClients } = await supabase
      .from("clients")
      .select("id")
      .eq("company_id", companyId)
      .ilike("nome", `%${term}%`);
    const clientIds = (matchedClients ?? []).map((c) => c.id);

    const orParts = [`titulo.ilike.%${term}%`, `numero.ilike.%${term}%`];
    if (clientIds.length > 0) {
      orParts.push(`client_id.in.(${clientIds.join(",")})`);
    }
    if (/^\d+$/.test(term)) {
      orParts.push(`numero_pedido.eq.${term}`, `numero_nota.eq.${term}`);
    }
    query = query.or(orParts.join(","));
  }

  const [{ data: budgets }, { data: clients }, nextNumero] = await Promise.all([
    query,
    supabase.from("clients").select("id, nome").eq("company_id", companyId).eq("ativo", true).order("nome"),
    getNextBudgetNumero(supabase, companyId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Acompanhe todas as suas obras em andamento.</p>
        </div>
        <NewBudgetSheet
          clients={clients ?? []}
          defaultNumero={nextNumero}
          defaultOpen={novo === "1"}
          error={error}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form className="relative flex-1 sm:max-w-sm">
          {status && <input type="hidden" name="status" value={status} />}
          {sort && <input type="hidden" name="sort" value={sort} />}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por título, cliente, pedido ou nota..."
            className="h-11 pl-9 sm:h-8"
          />
        </form>
        <BudgetFiltersSheet selectedStatuses={selectedStatuses} sort={sortOption.value} />
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Nº</TableHead>
              <TableHead>Orçamento</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Pedido / Nota</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Previsão de entrega</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets && budgets.length > 0 ? (
              budgets.map((budget) => {
                const statusInfo = BUDGET_STATUS_CONFIG[budget.status as BudgetStatus];
                const paymentStatus = (budget.status_pagamento as PaymentStatus) ?? "aguardando_pagamento";
                const client = Array.isArray(budget.clients) ? budget.clients[0] : budget.clients;
                const overdue = isBudgetOverdue(budget.status as BudgetStatus, budget.data_previsao_entrega);
                return (
                  <TableRowLink key={budget.id} href={`/orcamentos/${budget.id}`}>
                    <TableCell className="text-muted-foreground tabular-nums">{budget.numero || "—"}</TableCell>
                    <TableCell>
                      <Link href={`/orcamentos/${budget.id}`} className="font-medium text-foreground hover:underline">
                        {budget.titulo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{client?.nome ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {budget.numero_pedido || budget.numero_nota ? (
                        <span className="flex flex-col text-xs leading-tight">
                          {budget.numero_pedido && <span>Pedido {budget.numero_pedido}</span>}
                          {budget.numero_nota && <span>Nota {budget.numero_nota}</span>}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusInfo?.className}>{statusInfo?.label ?? budget.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={PAYMENT_STATUS_CONFIG[paymentStatus].className}>
                        {PAYMENT_STATUS_CONFIG[paymentStatus].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "flex items-center gap-1",
                          overdue ? "font-medium text-[color:var(--chart-5)]" : "text-muted-foreground",
                        )}
                      >
                        {formatDate(budget.data_previsao_entrega)}
                        {overdue && <TriangleAlert className="size-3.5" />}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrencyBRL(budget.valor_total)}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </TableCell>
                  </TableRowLink>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  {q || selectedStatuses.length > 0 ? "Nenhum orçamento encontrado." : "Nenhum orçamento cadastrado ainda."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {budgets && budgets.length > 0 ? (
          budgets.map((budget) => {
            const statusInfo = BUDGET_STATUS_CONFIG[budget.status as BudgetStatus];
            const paymentStatus = (budget.status_pagamento as PaymentStatus) ?? "aguardando_pagamento";
            const client = Array.isArray(budget.clients) ? budget.clients[0] : budget.clients;
            const overdue = isBudgetOverdue(budget.status as BudgetStatus, budget.data_previsao_entrega);
            return (
              <Link
                key={budget.id}
                href={`/orcamentos/${budget.id}`}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/10 active:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {budget.numero || "—"}
                    </span>
                    <span className="font-medium text-foreground">{budget.titulo}</span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge className={statusInfo?.className}>{statusInfo?.label ?? budget.status}</Badge>
                    <Badge className={PAYMENT_STATUS_CONFIG[paymentStatus].className}>
                      {PAYMENT_STATUS_CONFIG[paymentStatus].label}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{client?.nome ?? "—"}</span>
                  <span className="font-medium text-foreground tabular-nums">
                    {formatCurrencyBRL(budget.valor_total)}
                  </span>
                </div>
                {(budget.numero_pedido || budget.numero_nota) && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {budget.numero_pedido && <span>Pedido {budget.numero_pedido}</span>}
                    {budget.numero_nota && <span>Nota {budget.numero_nota}</span>}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>Previsão de entrega</span>
                  <span
                    className={cn(
                      "flex items-center gap-1",
                      overdue && "font-medium text-[color:var(--chart-5)]",
                    )}
                  >
                    {formatDate(budget.data_previsao_entrega)}
                    {overdue && <TriangleAlert className="size-3.5" />}
                  </span>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-xl border border-border bg-card py-10 text-center text-muted-foreground">
            {q || selectedStatuses.length > 0 ? "Nenhum orçamento encontrado." : "Nenhum orçamento cadastrado ainda."}
          </div>
        )}
      </div>
    </div>
  );
}
