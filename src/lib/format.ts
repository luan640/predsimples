export function formatCurrencyBRL(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value ?? 0);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T00:00:00`));
}

export function formatRelativeDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  const isToday = date.toDateString() === new Date().toDateString();
  if (isToday) return `hoje às ${time}`;
  return `em ${new Intl.DateTimeFormat("pt-BR").format(date)} às ${time}`;
}

export function buildOrcamentoFilename(numero: string | null | undefined, titulo: string) {
  const slug = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);

  const numeroPart = numero ? `${numero.replace(/\//g, "-")}-` : "";

  return `orcamento-${numeroPart}${slug}.pdf`;
}
