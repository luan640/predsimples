import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { applyPrazoTemplate } from "@/lib/prazo";

const styles = StyleSheet.create({
  page: {
    padding: 42,
    paddingBottom: 60,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1b2430",
    lineHeight: 1.4,
  },
  dateline: { textAlign: "right", marginBottom: 18 },
  recipientBlock: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  recipientLabel: { fontFamily: "Helvetica-Bold" },
  recipientName: { fontFamily: "Helvetica-Bold" },
  orcamentoNumero: { fontFamily: "Helvetica-BoldOblique" },
  att: { marginTop: 10, marginBottom: 14, fontFamily: "Helvetica-Bold" },
  proposalTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 16 },
  sectionTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6 },
  paragraph: { textAlign: "justify" },
  emptyNote: { color: "#9a968c", fontStyle: "italic" },
  bulletRow: { flexDirection: "row", marginBottom: 2 },
  bulletMark: { width: 10 },
  bulletText: { flex: 1 },
  photosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 4 },
  photoBlock: { width: 150 },
  photo: { width: 150, height: 112, objectFit: "cover", borderRadius: 3 },
  photoCaption: { fontSize: 8, color: "#6f6b63", marginTop: 2, textAlign: "center" },
  table: { marginTop: 4, borderWidth: 1, borderColor: "#1b2430" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#ebe9e4", borderBottomWidth: 1, borderColor: "#1b2430" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#dad6cd" },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8.5, padding: 5, textAlign: "center" },
  td: { fontSize: 8.5, padding: 5 },
  colComp: { width: "8%", borderRightWidth: 1, borderColor: "#dad6cd" },
  colServico: { width: "50%", borderRightWidth: 1, borderColor: "#dad6cd" },
  colQtd: { width: "10%", borderRightWidth: 1, borderColor: "#dad6cd", textAlign: "center" },
  colUnit: { width: "16%", borderRightWidth: 1, borderColor: "#dad6cd", textAlign: "right" },
  colTotal: { width: "16%", textAlign: "right" },
  totalRow: { flexDirection: "row", backgroundColor: "#ebe9e4" },
  totalLabel: { width: "84%", padding: 5, fontFamily: "Helvetica-Bold", textAlign: "right", fontSize: 9 },
  totalValue: { width: "16%", padding: 5, fontFamily: "Helvetica-Bold", textAlign: "right", fontSize: 9 },
  paymentBox: { marginTop: 10, borderWidth: 1, borderColor: "#dad6cd", borderRadius: 3, padding: 8 },
  paymentTitle: { fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 4 },
  signatureRow: { flexDirection: "row", gap: 16, marginTop: 28 },
  signatureBox: {
    flex: 1,
    borderTopWidth: 1,
    borderColor: "#1b2430",
    marginTop: 40,
    paddingTop: 6,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
  },
  responsavel: { marginTop: 16, textAlign: "center" },
  responsavelNome: { fontFamily: "Helvetica-Bold" },
  validity: { marginTop: 16, fontSize: 9, color: "#6f6b63" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 42,
    right: 42,
    fontSize: 8,
    color: "#9a968c",
    textAlign: "center",
  },
});

function Bullets({ lines }: { lines: string[] }) {
  if (lines.length === 0) {
    return <Text style={styles.emptyNote}>Não informado.</Text>;
  }

  return (
    <View>
      {lines.map((line, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bulletMark}>-</Text>
          <Text style={styles.bulletText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

function Paragraph({ text }: { text?: string | null }) {
  if (!text) {
    return <Text style={styles.emptyNote}>Não informado.</Text>;
  }
  return <Text style={styles.paragraph}>{text}</Text>;
}

export type ReportPdfData = {
  company: {
    nome: string;
    cidade?: string | null;
    responsavel_tecnico_nome?: string | null;
    responsavel_tecnico_cargo?: string | null;
    responsavel_tecnico_telefone?: string | null;
    relatorio_seguranca_padrao?: string | null;
    relatorio_prazo_padrao?: string | null;
    relatorio_condicoes_pagamento_padrao?: string | null;
    relatorio_consideracoes_finais_padrao?: string | null;
    relatorio_validade_padrao?: string | null;
  };
  client: { nome: string; contato_nome?: string | null };
  budget: {
    titulo: string;
    numero?: string | null;
    descricao?: string | null;
    valor_total: number;
    data_previsao_entrega?: string | null;
    prazo_qtd?: number | null;
    prazo_unidade?: string | null;
  };
  scopeLines: string[];
  materiaisLines: string[];
  photoGroups: { titulo: string; photos: { photo_url: string }[] }[];
  items: {
    descricao: string;
    quantidade: number;
    unidade: string | null;
    valor_unitario: number;
    valor_total: number;
  }[];
};

function formatCurrency(value?: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateExtended(value?: string | null) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function formatDateShort(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T00:00:00`));
}

export function ReportDocument({
  company,
  client,
  budget,
  scopeLines,
  materiaisLines,
  photoGroups,
  items,
}: ReportPdfData) {
  const itemsTotal = items.reduce((sum, item) => sum + Number(item.valor_total), 0);
  const prazoTexto =
    company.relatorio_prazo_padrao && budget.prazo_qtd && budget.prazo_unidade
      ? applyPrazoTemplate(company.relatorio_prazo_padrao, budget.prazo_qtd, budget.prazo_unidade)
      : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.dateline}>
          {company.cidade ? `${company.cidade}, ` : ""}
          {formatDateExtended()}.
        </Text>

        <View style={styles.recipientBlock}>
          <View>
            <Text style={styles.recipientLabel}>À</Text>
            <Text style={styles.recipientName}>{client.nome}</Text>
          </View>
          {budget.numero && <Text style={styles.orcamentoNumero}>ORÇAMENTO Nº {budget.numero}</Text>}
        </View>

        {client.contato_nome && <Text style={styles.att}>Att. Sr(a). {client.contato_nome}</Text>}

        <Text style={styles.proposalTitle}>PROPOSTA TÉCNICA – {budget.titulo}</Text>

        <Text style={styles.sectionTitle}>1. OBJETIVO</Text>
        <Paragraph text={budget.descricao} />

        {photoGroups.length > 0 ? (
          <View style={styles.photosGrid}>
            {photoGroups.flatMap((group) =>
              group.photos.map((photo, photoIndex) => (
                <View key={`${group.titulo}-${photoIndex}`} style={styles.photoBlock}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image has no alt prop */}
                  <Image src={photo.photo_url} style={styles.photo} />
                  <Text style={styles.photoCaption}>{group.titulo}</Text>
                </View>
              )),
            )}
          </View>
        ) : (
          <Text style={[styles.emptyNote, { marginTop: 4 }]}>Nenhuma foto cadastrada.</Text>
        )}

        <Text style={styles.sectionTitle}>2. ESCOPO DOS SERVIÇOS</Text>
        <Bullets lines={scopeLines} />

        <Text style={styles.sectionTitle}>3. MATERIAIS E MÃO DE OBRA</Text>
        <Bullets lines={materiaisLines} />

        <Text style={styles.sectionTitle}>4. SEGURANÇA</Text>
        <Paragraph text={company.relatorio_seguranca_padrao} />

        <Text style={styles.sectionTitle}>5. PRAZO</Text>
        <Paragraph text={prazoTexto} />

        <Text style={styles.sectionTitle} break={items.length > 6}>
          6. ORÇAMENTO
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colComp]}>COMP.</Text>
            <Text style={[styles.th, styles.colServico]}>SERVIÇO</Text>
            <Text style={[styles.th, styles.colQtd]}>QTD</Text>
            <Text style={[styles.th, styles.colUnit]}>V. UNIT.</Text>
            <Text style={[styles.th, styles.colTotal]}>V. TOTAL</Text>
          </View>
          {items.length > 0 ? (
            items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.td, styles.colComp]}>{`1.${index + 1}`}</Text>
                <Text style={[styles.td, styles.colServico]}>
                  {item.descricao}
                  {item.unidade ? ` (${item.unidade})` : ""}
                </Text>
                <Text style={[styles.td, styles.colQtd]}>{item.quantidade}</Text>
                <Text style={[styles.td, styles.colUnit]}>{formatCurrency(item.valor_unitario)}</Text>
                <Text style={[styles.td, styles.colTotal]}>{formatCurrency(item.valor_total)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.td, { width: "100%" }]}>Nenhum item lançado neste orçamento.</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL GERAL</Text>
            <Text style={styles.totalValue}>{formatCurrency(itemsTotal)}</Text>
          </View>
        </View>

        <View style={styles.paymentBox}>
          <Text style={styles.paymentTitle}>
            VALOR TOTAL DA PROPOSTA: {formatCurrency(budget.valor_total)}
          </Text>
          <Paragraph text={company.relatorio_condicoes_pagamento_padrao} />
          <Text style={styles.paragraph}>Prazo de entrega: {formatDateShort(budget.data_previsao_entrega)}</Text>
          <Text style={styles.paragraph}>
            O custo da refeição relacionados à equipe executante será de responsabilidade da contratante.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>7. CONSIDERAÇÕES FINAIS</Text>
        <Paragraph text={company.relatorio_consideracoes_finais_padrao} />

        <Text style={styles.sectionTitle}>8. RESPONSÁVEL TÉCNICO</Text>
        {company.responsavel_tecnico_nome ? (
          <View style={styles.responsavel}>
            <Text style={styles.responsavelNome}>
              {company.responsavel_tecnico_nome}
              {company.responsavel_tecnico_cargo ? ` - ${company.responsavel_tecnico_cargo}` : ""}
            </Text>
            {company.responsavel_tecnico_telefone && <Text>{company.responsavel_tecnico_telefone}</Text>}
          </View>
        ) : (
          <Text style={styles.emptyNote}>Não informado.</Text>
        )}

        <Text style={styles.validity}>
          {company.relatorio_validade_padrao ||
            "Esta proposta tem validade de 15 (quinze) dias, contados a partir da data de envio, após esta data estará sujeita a alterações e reajustes."}
        </Text>

        <View style={styles.signatureRow}>
          <Text style={styles.signatureBox}>{client.nome}</Text>
          <Text style={styles.signatureBox}>DATA</Text>
        </View>

        <Text style={styles.footer} fixed>
          {company.nome} · Gerado automaticamente
        </Text>
      </Page>
    </Document>
  );
}
