"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireCompanyId } from "@/lib/queries/company";
import { getNextBudgetNumero } from "@/lib/queries/budgets";
import { BUDGET_STATUS, PAYMENT_STATUS } from "@/lib/budget-status";

const budgetSchema = z
  .object({
    client_id: z.string().uuid("Selecione um cliente."),
    titulo: z.string().trim().min(2, "Informe um título para o orçamento."),
    valor_total: z.coerce.number().min(0).optional(),
    data_inicio: z.string().optional(),
    data_previsao_entrega: z.string().optional(),
    prazo_qtd: z.coerce.number().int().positive().optional(),
    prazo_unidade: z.enum(["hora", "dia", "semana", "mes"]).optional(),
    numero_pedido: z.coerce.number().int().positive("Nº do pedido deve ser numérico.").optional(),
    numero_nota: z.coerce.number().int().positive("Nº da nota deve ser numérico.").optional(),
  })
  .refine(
    (data) => !data.data_inicio || !data.data_previsao_entrega || data.data_inicio <= data.data_previsao_entrega,
    {
      message: "A previsão de entrega não pode ser antes do início.",
      path: ["data_previsao_entrega"],
    },
  );

function parseBudgetForm(formData: FormData) {
  return budgetSchema.safeParse({
    client_id: formData.get("client_id"),
    titulo: formData.get("titulo"),
    valor_total: formData.get("valor_total") || 0,
    data_inicio: formData.get("data_inicio") || undefined,
    data_previsao_entrega: formData.get("data_previsao_entrega") || undefined,
    prazo_qtd: formData.get("prazo_qtd") || undefined,
    prazo_unidade: formData.get("prazo_unidade") || undefined,
    numero_pedido: formData.get("numero_pedido") || undefined,
    numero_nota: formData.get("numero_nota") || undefined,
  });
}

function friendlyBudgetSaveError(message: string) {
  if (message.includes("budgets_company_numero_pedido_unique")) {
    return "Esse número de pedido já está em uso em outro orçamento.";
  }
  if (message.includes("budgets_company_numero_nota_unique")) {
    return "Esse número de nota já está em uso em outro orçamento.";
  }
  return message;
}

export async function createBudgetAction(formData: FormData) {
  const parsed = parseBudgetForm(formData);

  if (!parsed.success) {
    redirect(`/orcamentos?novo=1&error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = await requireCompanyId(supabase, user.id);
  const numero = await getNextBudgetNumero(supabase, companyId);

  const { data, error } = await supabase
    .from("budgets")
    .insert({
      company_id: companyId,
      client_id: parsed.data.client_id,
      titulo: parsed.data.titulo,
      numero,
      valor_total: parsed.data.valor_total || 0,
      data_inicio: parsed.data.data_inicio || null,
      data_previsao_entrega: parsed.data.data_previsao_entrega || null,
      prazo_qtd: parsed.data.prazo_qtd || 1,
      prazo_unidade: parsed.data.prazo_unidade || "dia",
      numero_pedido: parsed.data.numero_pedido || null,
      numero_nota: parsed.data.numero_nota || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    const message = friendlyBudgetSaveError(error?.message ?? "Erro ao criar orçamento.");
    redirect(`/orcamentos?novo=1&error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/orcamentos");
  redirect(`/orcamentos/${data.id}?message=${encodeURIComponent("Orçamento criado.")}`);
}

export async function updateBudgetAction(budgetId: string, formData: FormData) {
  const parsed = parseBudgetForm(formData);

  if (!parsed.success) {
    redirect(`/orcamentos/${budgetId}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("budgets")
    .update({
      client_id: parsed.data.client_id,
      titulo: parsed.data.titulo,
      valor_total: parsed.data.valor_total || 0,
      data_inicio: parsed.data.data_inicio || null,
      data_previsao_entrega: parsed.data.data_previsao_entrega || null,
      prazo_qtd: parsed.data.prazo_qtd || 1,
      prazo_unidade: parsed.data.prazo_unidade || "dia",
      numero_pedido: parsed.data.numero_pedido || null,
      numero_nota: parsed.data.numero_nota || null,
    })
    .eq("id", budgetId);

  if (error) {
    redirect(`/orcamentos/${budgetId}?error=${encodeURIComponent(friendlyBudgetSaveError(error.message))}`);
  }

  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${budgetId}`);
  redirect(`/orcamentos/${budgetId}?message=${encodeURIComponent("Orçamento atualizado.")}`);
}

export async function updateBudgetObjetivoAction(budgetId: string, formData: FormData) {
  const descricao = (formData.get("descricao") as string)?.trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("budgets").update({ descricao }).eq("id", budgetId);

  if (error) {
    redirect(`/orcamentos/${budgetId}?tab=objetivo&error=${encodeURIComponent(error.message)}`);
  }

  if (descricao) {
    const { count } = await supabase
      .from("budget_orcamento_items")
      .select("id", { count: "exact", head: true })
      .eq("budget_id", budgetId);

    if (!count) {
      await supabase.from("budget_orcamento_items").insert({
        budget_id: budgetId,
        servico: `SERVIÇO DE ENGENHARIA - ${descricao}`,
        quantidade: 1,
        valor_unitario: 0,
        ordem: 0,
      });
    }
  }

  revalidatePath(`/orcamentos/${budgetId}`);
  redirect(`/orcamentos/${budgetId}?tab=objetivo&message=${encodeURIComponent("Objetivo atualizado.")}`);
}

export async function updateBudgetStatusAction(budgetId: string, formData: FormData) {
  const status = formData.get("status");
  const tab = formData.get("tab");
  const tabParam = typeof tab === "string" && tab ? `tab=${encodeURIComponent(tab)}&` : "";
  const parsed = z.enum(BUDGET_STATUS).safeParse(status);

  if (!parsed.success) {
    redirect(`/orcamentos/${budgetId}?${tabParam}error=${encodeURIComponent("Status inválido.")}`);
  }

  const supabase = await createClient();
  const updates: Record<string, string | null> = { status: parsed.data };

  if (parsed.data === "concluido") {
    updates.data_conclusao = new Date().toISOString().slice(0, 10);
  }

  const { error } = await supabase.from("budgets").update(updates).eq("id", budgetId);

  if (error) {
    redirect(`/orcamentos/${budgetId}?${tabParam}error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("budget_status_history").insert({ budget_id: budgetId, status: parsed.data });

  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${budgetId}`);
  redirect(`/orcamentos/${budgetId}?${tabParam}message=${encodeURIComponent("Status atualizado.")}`);
}

export async function updateBudgetPaymentStatusAction(budgetId: string, formData: FormData) {
  const statusPagamento = formData.get("status_pagamento");
  const tab = formData.get("tab");
  const tabParam = typeof tab === "string" && tab ? `tab=${encodeURIComponent(tab)}&` : "";
  const parsed = z.enum(PAYMENT_STATUS).safeParse(statusPagamento);

  if (!parsed.success) {
    redirect(`/orcamentos/${budgetId}?${tabParam}error=${encodeURIComponent("Status de pagamento inválido.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("budgets")
    .update({ status_pagamento: parsed.data })
    .eq("id", budgetId);

  if (error) {
    redirect(`/orcamentos/${budgetId}?${tabParam}error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/orcamentos");
  revalidatePath("/dashboard");
  revalidatePath(`/orcamentos/${budgetId}`);
  redirect(`/orcamentos/${budgetId}?${tabParam}message=${encodeURIComponent("Status de pagamento atualizado.")}`);
}

export async function deleteBudgetAction(budgetId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", budgetId);

  if (error) {
    redirect(`/orcamentos/${budgetId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/orcamentos");
  redirect(`/orcamentos?message=${encodeURIComponent("Orçamento excluído.")}`);
}
