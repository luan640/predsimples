import { notFound, redirect } from "next/navigation";
import { Building2, Calculator, Clock3, LayoutGrid, ListChecks, Package, Phone, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { requireCompanyId } from "@/lib/queries/company";
import { formatRelativeDateTime } from "@/lib/format";
import { BUDGET_STATUS_CONFIG, isBudgetOverdue, type BudgetStatus } from "@/lib/budget-status";
import { SetPageHeader } from "@/components/layout/set-page-header";
import { BudgetStatusFunnel } from "@/components/budgets/budget-status-funnel";
import { BudgetStatusHistoryCard } from "@/components/budgets/budget-status-history-card";
import { BudgetActionsMenu } from "@/components/budgets/budget-actions-menu";
import { BudgetKpiCards } from "@/components/budgets/budget-kpi-cards";
import { ClientMiniCard } from "@/components/budgets/client-mini-card";
import { BudgetForm } from "@/components/budgets/budget-form";
import { ItemsTab } from "@/components/budgets/items-tab";
import { OrcamentoTab } from "@/components/budgets/orcamento-tab";
import { PdfActionsDialog } from "@/components/budgets/pdf-actions-dialog";
import { ObjetivoTab } from "@/components/budgets/objetivo-tab";
import { ScopeTab } from "@/components/budgets/scope-tab";
import {
  updateBudgetAction,
  updateBudgetObjetivoAction,
  updateBudgetStatusAction,
  deleteBudgetAction,
} from "@/lib/actions/budgets";
import { createBudgetItemAction, deleteBudgetItemAction } from "@/lib/actions/budget-items";
import {
  createOrcamentoItemAction,
  updateOrcamentoItemAction,
  deleteOrcamentoItemAction,
} from "@/lib/actions/orcamento-items";
import {
  createPhotoGroupAction,
  addPhotosToGroupAction,
  deletePhotoGroupAction,
  deletePhotoAction,
} from "@/lib/actions/photos";
import {
  createScopeItemAction,
  updateScopeItemAction,
  deleteScopeItemAction,
} from "@/lib/actions/scope";

export default async function OrcamentoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string; message?: string }>;
}) {
  const { id } = await params;
  const { tab, error, message } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = await requireCompanyId(supabase, user.id);

  const { data: budget } = await supabase
    .from("budgets")
    .select("*, clients(id, nome, telefone, email)")
    .eq("id", id)
    .maybeSingle();

  if (!budget) notFound();

  const client = Array.isArray(budget.clients) ? budget.clients[0] : budget.clients;

  const [
    { data: clients },
    { data: items },
    { data: scopeItems },
    { data: materials },
    { data: statusHistory },
    { data: orcamentoItems },
  ] = await Promise.all([
    supabase.from("clients").select("id, nome").eq("company_id", companyId).order("nome"),
    supabase.from("budget_items").select("*").eq("budget_id", id).order("created_at"),
    supabase.from("budget_scope_items").select("id, descricao").eq("budget_id", id).order("ordem"),
    supabase.from("materials").select("id, nome, unidade").eq("company_id", companyId).order("nome"),
    supabase
      .from("budget_status_history")
      .select("id, status, changed_at")
      .eq("budget_id", id)
      .order("changed_at", { ascending: false }),
    supabase
      .from("budget_orcamento_items")
      .select("id, servico, quantidade, valor_unitario, valor_total")
      .eq("budget_id", id)
      .order("ordem"),
  ]);

  const { data: photoGroups } = await supabase
    .from("budget_photo_groups")
    .select("id, titulo, created_at")
    .eq("budget_id", id)
    .order("created_at", { ascending: false });

  const groupIds = (photoGroups ?? []).map((g) => g.id);
  const { data: photos } = groupIds.length
    ? await supabase.from("budget_photos").select("id, group_id, photo_url").in("group_id", groupIds).order("ordem")
    : { data: [] as { id: string; group_id: string; photo_url: string }[] };

  const photosByGroup = new Map<string, { id: string; photo_url: string }[]>();
  for (const photo of photos ?? []) {
    const list = photosByGroup.get(photo.group_id) ?? [];
    list.push({ id: photo.id, photo_url: photo.photo_url });
    photosByGroup.set(photo.group_id, list);
  }

  const photoGroupsWithPhotos = (photoGroups ?? []).map((g) => ({
    ...g,
    photos: photosByGroup.get(g.id) ?? [],
  }));

  const itemsTotal = (items ?? []).reduce((sum, item) => sum + Number(item.valor_total), 0);

  const updateWithId = updateBudgetAction.bind(null, id);
  const updateObjetivoWithId = updateBudgetObjetivoAction.bind(null, id);
  const updateStatusWithId = updateBudgetStatusAction.bind(null, id);
  const deleteWithId = deleteBudgetAction.bind(null, id);
  const createItemWithId = createBudgetItemAction.bind(null, id);
  const deleteItemWithId = deleteBudgetItemAction.bind(null, id);
  const createPhotoGroupWithId = createPhotoGroupAction.bind(null, id);
  const addPhotosWithId = addPhotosToGroupAction.bind(null, id);
  const deletePhotoGroupWithId = deletePhotoGroupAction.bind(null, id);
  const deletePhotoWithId = deletePhotoAction.bind(null, id);
  const createScopeItemWithId = createScopeItemAction.bind(null, id);
  const updateScopeItemWithId = updateScopeItemAction.bind(null, id);
  const deleteScopeItemWithId = deleteScopeItemAction.bind(null, id);
  const createOrcamentoItemWithId = createOrcamentoItemAction.bind(null, id);
  const updateOrcamentoItemWithId = updateOrcamentoItemAction.bind(null, id);
  const deleteOrcamentoItemWithId = deleteOrcamentoItemAction.bind(null, id);

  const updatedAt = formatRelativeDateTime(budget.updated_at);

  return (
    <div className="flex flex-col gap-6">
      <SetPageHeader href="/orcamentos" label="Orçamentos" />

      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {budget.titulo}
          </h1>
          <div className="flex shrink-0 items-center gap-1.5">
            <PdfActionsDialog budgetId={id} numero={budget.numero} titulo={budget.titulo} />
            <BudgetActionsMenu deleteAction={deleteWithId} cancelAction={updateStatusWithId} />
          </div>
        </div>

        {client && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--chart-4),transparent_85%)] text-[color:var(--chart-4)]">
                <Building2 className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{client.nome}</p>
                {client.telefone && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="size-3 shrink-0" />
                    <span className="truncate">{client.telefone}</span>
                  </p>
                )}
              </div>
            </div>
            {client.telefone && (
              <a
                href={`tel:${client.telefone.replace(/\D/g, "")}`}
                aria-label="Ligar para o cliente"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--primary),transparent_88%)] text-primary"
              >
                <Phone className="size-4" />
              </a>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Badge className={BUDGET_STATUS_CONFIG[budget.status as BudgetStatus].className}>
            {BUDGET_STATUS_CONFIG[budget.status as BudgetStatus].label}
          </Badge>
        </div>
      </div>

      <Card size="sm">
        <CardContent className="py-4">
          <BudgetStatusFunnel status={budget.status as BudgetStatus} action={updateStatusWithId} />
        </CardContent>
      </Card>

      <BudgetKpiCards
        valorTotal={budget.valor_total}
        itemsTotal={itemsTotal}
        dataPrevisaoEntrega={budget.data_previsao_entrega}
        overdue={isBudgetOverdue(budget.status as BudgetStatus, budget.data_previsao_entrega)}
      />

      <Tabs defaultValue={tab ?? "visao-geral"}>
        <TabsList variant="line">
          <TabsTrigger value="visao-geral">
            <LayoutGrid className="size-4" />
            Visão geral
          </TabsTrigger>
          <TabsTrigger value="objetivo">
            <Target className="size-4" />
            Objetivo
          </TabsTrigger>
          <TabsTrigger value="escopo">
            <ListChecks className="size-4" />
            Escopo
          </TabsTrigger>
          <TabsTrigger value="itens">
            <Package className="size-4" />
            Itens
          </TabsTrigger>
          <TabsTrigger value="orcamento">
            <Calculator className="size-4" />
            Orçamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-col items-start gap-1.5 space-y-0 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div>
                  <CardTitle className="text-base">Dados do orçamento</CardTitle>
                  <CardDescription>Atualize título, cliente, prazos e valor combinado.</CardDescription>
                </div>
                {updatedAt && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="size-3.5" />
                    Última atualização {updatedAt}
                  </span>
                )}
              </CardHeader>
              <CardContent>
                {(!tab || tab === "visao-geral") && message && (
                  <p className="mb-4 text-sm text-[color:var(--chart-2)]">{message}</p>
                )}
                <BudgetForm
                  action={updateWithId}
                  clients={clients ?? []}
                  defaultValues={budget}
                  submitLabel="Salvar alterações"
                  error={!tab || tab === "visao-geral" ? error : undefined}
                />
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4">
              {client && <ClientMiniCard client={client} />}
              <BudgetStatusHistoryCard entries={statusHistory ?? []} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="objetivo" className="mt-4">
          <ObjetivoTab
            descricao={budget.descricao}
            updateObjetivoAction={updateObjetivoWithId}
            message={tab === "objetivo" ? message : undefined}
            photoGroups={photoGroupsWithPhotos}
            createGroupAction={createPhotoGroupWithId}
            addPhotosAction={addPhotosWithId}
            deletePhotoAction={deletePhotoWithId}
            deleteGroupAction={deletePhotoGroupWithId}
            defaultOpenPhotoDialog={tab === "objetivo" && !!error}
            error={tab === "objetivo" ? error : undefined}
          />
        </TabsContent>

        <TabsContent value="escopo" className="mt-4">
          <ScopeTab
            items={scopeItems ?? []}
            createAction={createScopeItemWithId}
            updateAction={updateScopeItemWithId}
            deleteAction={deleteScopeItemWithId}
            error={tab === "escopo" ? error : undefined}
          />
        </TabsContent>

        <TabsContent value="itens" className="mt-4">
          <ItemsTab
            items={items ?? []}
            materials={materials ?? []}
            createAction={createItemWithId}
            deleteAction={deleteItemWithId}
            error={tab === "itens" ? error : undefined}
          />
        </TabsContent>

        <TabsContent value="orcamento" className="mt-4">
          <OrcamentoTab
            items={orcamentoItems ?? []}
            createAction={createOrcamentoItemWithId}
            updateAction={updateOrcamentoItemWithId}
            deleteAction={deleteOrcamentoItemWithId}
            error={tab === "orcamento" ? error : undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
