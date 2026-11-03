import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReportDocument } from "@/lib/pdf/report-document";
import { buildOrcamentoFilename } from "@/lib/format";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: budgetId } = await params;

  const supabase = createAdminClient();

  const { data: budget } = await supabase
    .from("budgets")
    .select(
      "company_id, titulo, numero, descricao, valor_total, data_previsao_entrega, prazo_qtd, prazo_unidade, clients(nome, contato_nome)",
    )
    .eq("id", budgetId)
    .single();

  if (!budget) {
    return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
  }

  const { data: company } = await supabase
    .from("companies")
    .select(
      "nome, cidade, responsavel_tecnico_nome, responsavel_tecnico_cargo, responsavel_tecnico_telefone, relatorio_seguranca_padrao, relatorio_prazo_padrao, relatorio_condicoes_pagamento_padrao, relatorio_consideracoes_finais_padrao, relatorio_validade_padrao",
    )
    .eq("id", budget.company_id)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
  }

  const [{ data: items }, { data: scopeItems }, { data: photoGroupRows }, { data: orcamentoItems }] =
    await Promise.all([
      supabase
        .from("budget_items")
        .select("tipo, descricao, quantidade, unidade, valor_unitario, valor_total")
        .eq("budget_id", budgetId)
        .order("created_at"),
      supabase.from("budget_scope_items").select("descricao").eq("budget_id", budgetId).order("ordem"),
      supabase.from("budget_photo_groups").select("id, titulo").eq("budget_id", budgetId).order("created_at"),
      supabase
        .from("budget_orcamento_items")
        .select("servico, quantidade, valor_unitario, valor_total")
        .eq("budget_id", budgetId)
        .order("ordem"),
    ]);

  const groupIds = (photoGroupRows ?? []).map((g) => g.id);
  const { data: photoRows } = groupIds.length
    ? await supabase.from("budget_photos").select("group_id, photo_url").in("group_id", groupIds).order("ordem")
    : { data: [] as { group_id: string; photo_url: string }[] };

  const photoGroups = (photoGroupRows ?? []).map((group) => ({
    titulo: group.titulo,
    photos: (photoRows ?? []).filter((p) => p.group_id === group.id).map((p) => ({ photo_url: p.photo_url })),
  }));

  const pricedItems = [
    ...(items ?? [])
      .filter((i) => i.tipo !== "material")
      .map((i) => ({
        descricao: i.descricao,
        quantidade: i.quantidade,
        unidade: i.unidade,
        valor_unitario: i.valor_unitario,
        valor_total: i.valor_total,
      })),
    ...(orcamentoItems ?? []).map((i) => ({
      descricao: i.servico,
      quantidade: i.quantidade,
      unidade: null,
      valor_unitario: i.valor_unitario,
      valor_total: i.valor_total,
    })),
  ];
  const materiaisLines = (items ?? [])
    .filter((i) => i.tipo === "material")
    .map((i) => `${i.descricao}${i.unidade ? `; ${i.quantidade} ${i.unidade}` : `; ${i.quantidade}`}`);

  const client = Array.isArray(budget.clients) ? budget.clients[0] : budget.clients;

  const buffer = await renderToBuffer(
    ReportDocument({
      company,
      client: { nome: client?.nome ?? "Cliente", contato_nome: client?.contato_nome },
      budget,
      scopeLines: (scopeItems ?? []).map((s) => s.descricao),
      materiaisLines,
      photoGroups,
      items: pricedItems,
    }),
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${buildOrcamentoFilename(budget.numero, budget.titulo)}"`,
    },
  });
}
