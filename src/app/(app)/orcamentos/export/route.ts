import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCompanyId } from "@/lib/queries/company";
import { formatCurrencyBRL, formatDate } from "@/lib/format";
import { BUDGET_STATUS_CONFIG, PAYMENT_STATUS_CONFIG, type BudgetStatus, type PaymentStatus } from "@/lib/budget-status";

export const runtime = "nodejs";

function csvField(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const companyId = await requireCompanyId(supabase, user.id);

  const { data: budgets } = await supabase
    .from("budgets")
    .select(
      "numero, titulo, numero_pedido, numero_nota, status, status_pagamento, valor_total, data_previsao_entrega, clients(nome)",
    )
    .eq("company_id", companyId)
    .order("numero", { ascending: true });

  const header = [
    "Nº",
    "Orçamento",
    "Cliente",
    "Pedido",
    "Nota",
    "Status",
    "Pagamento",
    "Previsão de entrega",
    "Valor",
  ];
  const rows = (budgets ?? []).map((budget) => {
    const client = Array.isArray(budget.clients) ? budget.clients[0] : budget.clients;
    const statusLabel = BUDGET_STATUS_CONFIG[budget.status as BudgetStatus]?.label ?? budget.status;
    const paymentStatus = (budget.status_pagamento as PaymentStatus) ?? "aguardando_pagamento";
    return [
      budget.numero ?? "",
      budget.titulo,
      client?.nome ?? "",
      budget.numero_pedido ?? "",
      budget.numero_nota ?? "",
      statusLabel,
      PAYMENT_STATUS_CONFIG[paymentStatus].label,
      formatDate(budget.data_previsao_entrega),
      formatCurrencyBRL(budget.valor_total),
    ];
  });

  const csv = [header, ...rows].map((row) => row.map((field) => csvField(String(field))).join(";")).join("\r\n");

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="orcamentos.csv"',
    },
  });
}
