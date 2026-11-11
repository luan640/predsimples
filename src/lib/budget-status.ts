export const BUDGET_STATUS = [
  "rascunho",
  "enviado",
  "aprovado",
  "em_andamento",
  "concluido",
  "cancelado",
] as const;

export type BudgetStatus = (typeof BUDGET_STATUS)[number];

export const BUDGET_STATUS_CONFIG: Record<
  BudgetStatus,
  { label: string; className: string; dot: string }
> = {
  rascunho: {
    label: "Rascunho",
    className: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  enviado: {
    label: "Enviado",
    className: "bg-[color-mix(in_oklch,var(--chart-4),transparent_80%)] text-[color:var(--chart-4)]",
    dot: "bg-[color:var(--chart-4)]",
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-[color-mix(in_oklch,var(--chart-3),transparent_80%)] text-[color:var(--chart-3)]",
    dot: "bg-[color:var(--chart-3)]",
  },
  em_andamento: {
    label: "Em andamento",
    className: "bg-[color-mix(in_oklch,var(--chart-1),transparent_85%)] text-[color:var(--chart-1)]",
    dot: "bg-[color:var(--chart-1)]",
  },
  concluido: {
    label: "Concluído",
    className: "bg-[color-mix(in_oklch,var(--chart-2),transparent_85%)] text-[color:var(--chart-2)]",
    dot: "bg-[color:var(--chart-2)]",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-muted text-muted-foreground line-through",
    dot: "bg-muted-foreground",
  },
};

const NON_OVERDUE_STATUSES: readonly BudgetStatus[] = ["concluido", "cancelado"];

/** "Atrasado" is never a stored status — it's derived from the delivery date. */
export function isBudgetOverdue(
  status: BudgetStatus,
  dataPrevisaoEntrega: string | null | undefined,
): boolean {
  if (!dataPrevisaoEntrega) return false;
  if (NON_OVERDUE_STATUSES.includes(status)) return false;
  const todayStr = new Date().toLocaleDateString("en-CA");
  return dataPrevisaoEntrega < todayStr;
}

export const PAYMENT_STATUS = ["aguardando_pagamento", "pago"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; className: string }> = {
  aguardando_pagamento: {
    label: "Aguardando pagamento",
    className: "bg-[color-mix(in_oklch,var(--chart-3),transparent_80%)] text-[color:var(--chart-3)]",
  },
  pago: {
    label: "Pago",
    className: "bg-[color-mix(in_oklch,var(--chart-2),transparent_85%)] text-[color:var(--chart-2)]",
  },
};

export const BUDGET_ITEM_TYPES = [
  { value: "material", label: "Material" },
  { value: "mao_de_obra", label: "Mão de obra" },
  { value: "servico", label: "Serviço" },
] as const;
