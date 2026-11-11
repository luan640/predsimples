"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { CircleDollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PAYMENT_STATUS_CONFIG, type PaymentStatus } from "@/lib/budget-status";

export function BudgetPaymentToggle({
  status,
  action,
}: {
  status: PaymentStatus;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  const nextStatus: PaymentStatus = status === "pago" ? "aguardando_pagamento" : "pago";

  function toggle() {
    const formData = new FormData();
    formData.set("status_pagamento", nextStatus);
    if (currentTab) formData.set("tab", currentTab);
    startTransition(() => {
      action(formData);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge className={PAYMENT_STATUS_CONFIG[status].className}>{PAYMENT_STATUS_CONFIG[status].label}</Badge>
      <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={toggle}>
        <CircleDollarSign className="size-3.5" />
        Marcar como {PAYMENT_STATUS_CONFIG[nextStatus].label.toLowerCase()}
      </Button>
    </div>
  );
}
