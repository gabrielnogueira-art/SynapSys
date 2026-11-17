import type {
  ContractClauseTemplate,
  ContractInvoice,
  ContractLegalStatus,
  InvoicePaymentMethod,
  PlatformBillingConfig,
  PlatformContract,
  PricingTier,
  ProjectSegment,
} from "./types";
import { getModuleById, SEGMENT_DEFINITIONS } from "./catalog";

export const DEFAULT_PRICING_TIERS: PricingTier[] = [
  {
    id: "igreja-1",
    segment: "igreja",
    name: "Faixa 1 — Inicial",
    minUnits: 1,
    maxUnits: 10,
    unitPrice: 99.9,
    description: "Até 10 igrejas no mesmo ministério (cobrança por igreja individual).",
  },
  {
    id: "igreja-2",
    segment: "igreja",
    name: "Faixa 2 — Expansão",
    minUnits: 11,
    maxUnits: 30,
    unitPrice: 89.9,
    description: "De 11 a 30 igrejas no ministério (desconto progressivo por unidade).",
  },
  {
    id: "igreja-3",
    segment: "igreja",
    name: "Faixa 3 — Regional",
    minUnits: 31,
    maxUnits: 50,
    unitPrice: 79.9,
    description: "De 31 a 50 igrejas no ministério.",
  },
  {
    id: "igreja-4",
    segment: "igreja",
    name: "Faixa 4 — Convenção",
    minUnits: 51,
    maxUnits: null,
    unitPrice: 69.9,
    description: "Acima de 50 igrejas no mesmo ministério.",
  },
  {
    id: "comercio-1",
    segment: "comercio",
    name: "Comercial — Inicial",
    minUnits: 1,
    maxUnits: 3,
    unitPrice: 149.9,
    description: "De 1 a 3 unidades/lojas (valor unitário por estabelecimento).",
  },
  {
    id: "comercio-2",
    segment: "comercio",
    name: "Comercial — Rede Média",
    minUnits: 4,
    maxUnits: 10,
    unitPrice: 129.9,
    description: "De 4 a 10 unidades/lojas.",
  },
  {
    id: "comercio-3",
    segment: "comercio",
    name: "Comercial — Rede Corporativa",
    minUnits: 11,
    maxUnits: null,
    unitPrice: 109.9,
    description: "Acima de 10 unidades/lojas.",
  },
];

export const DEFAULT_BILLING_CONFIG: PlatformBillingConfig = {
  preferredProvider: "manual_nubank_cora",
  gracePeriodDays: 15,
  pixKey: "",
  beneficiaryName: "SynapSys — Sistemas & Inteligência",
  contractorDocument: "",
  contractorCity: "Rio de Janeiro - RJ",
  supportContact: "contato@synapsys.app",
  paymentInstructions:
    "Pague via PIX Copia e Cola ou código de barras do boleto. Após o pagamento, o acesso permanece regularizado automaticamente na plataforma.",
};

export const DEFAULT_CONTRACT_CLAUSES: ContractClauseTemplate[] = [
  {
    id: "clausula-1",
    order: 1,
    title: "CLÁUSULA 1ª — DO OBJETO E ESCOPO MODULAR",
    body:
      "O presente instrumento tem por objeto o licenciamento de uso de software como serviço (SaaS) da plataforma SynapSys, no segmento {{segmento}}, contemplando os módulos ativos: {{modulos_contratados}}, em ambiente lógico isolado sob o identificador {{codigo_contrato}}, dimensionado para {{limite_unidades}} unidade(s)/igreja(s).",
  },
  {
    id: "clausula-2",
    order: 2,
    title: "CLÁUSULA 2ª — IDENTIFICAÇÃO DAS PARTES",
    body:
      "CONTRATADA: {{contratada_nome}}, inscrita sob o documento {{contratada_documento}}, com sede/foro em {{foro_cidade}}.\nCONTRATANTE: {{razao_social}}, inscrita no CNPJ/CPF sob nº {{cnpj_cpf}}, localizada em {{endereco_cidade}}, neste ato representada por {{responsavel_nome}} ({{responsavel_email}}).",
  },
  {
    id: "clausula-3",
    order: 3,
    title: "CLÁUSULA 3ª — INVESTIMENTO, PRECIFICAÇÃO POR UNIDADE E PAGAMENTO",
    body:
      "Pela disponibilização da plataforma e manutenção contínua, o CONTRATANTE pagará à CONTRATADA o valor mensal de {{valor_mensal}}, calculado conforme enquadramento na {{faixa_preco}} ({{regra_calculo}}), com vencimento todo dia {{dia_vencimento}} de cada mês, a partir de {{data_inicio}}, por meio de boleto bancário, PIX ou plataforma de cobrança indicada.",
  },
  {
    id: "clausula-4",
    order: 4,
    title: "CLÁUSULA 4ª — NÍVEL DE SERVIÇO (SLA), SUPORTE E ATUALIZAÇÕES",
    body:
      "A CONTRATADA compromete-se a manter a plataforma em nuvem com rotinas automatizadas de cópia de segurança (backup), atualizações corretivas e evolutivas contínuas, além de suporte técnico em horário comercial pelos canais oficiais ({{suporte_contato}}). Novas personalizações exclusivas de tela ou regra de negócio poderão ser orçadas em apartado.",
  },
  {
    id: "clausula-5",
    order: 5,
    title: "CLÁUSULA 5ª — CONFIDENCIALIDADE, PROPRIEDADE DOS DADOS E LGPD",
    body:
      "Todos os dados cadastrais, financeiros, registros de membros, alunos, turmas e lançamentos inseridos pelo CONTRATANTE são de propriedade exclusiva do CONTRATANTE, armazenados com isolamento lógico e controle de acesso em nível de linha (RLS) conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Em caso de encerramento contratual, será garantida a exportação integral das informações em formato estruturado.",
  },
  {
    id: "clausula-6",
    order: 6,
    title: "CLÁUSULA 6ª — REAJUSTE, INADIMPLÊNCIA E RESCISÃO",
    body:
      "Os valores contratuais poderão ser reajustados anualmente pelo índice {{indice_reajuste}} acumulado no período ou por alteração na quantidade de unidades/igrejas ativas conforme a tabela vigente. O não pagamento após {{dias_carencia}} dias do vencimento sujeita a cobrança a multa de 2% e juros de 1% ao mês, facultando à CONTRATADA a suspensão temporária de acesso até a regularização financeira. Qualquer das partes poderá solicitar o cancelamento com aviso prévio mínimo de 30 (trinta) dias, sem multa rescisória.",
  },
  {
    id: "clausula-7",
    order: 7,
    title: "CLÁUSULA 7ª — FORO",
    body:
      "Para dirimir quaisquer controvérsias oriundas deste contrato, as partes elegem o foro da comarca de {{foro_cidade}}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.",
  },
];

export const CONTRACT_TEMPLATE_TAGS: Array<{ tag: string; label: string }> = [
  { tag: "{{codigo_contrato}}", label: "Código (CTR-XXX)" },
  { tag: "{{razao_social}}", label: "Razão social / Cliente" },
  { tag: "{{cnpj_cpf}}", label: "CNPJ / CPF" },
  { tag: "{{endereco_cidade}}", label: "Endereço / Cidade" },
  { tag: "{{responsavel_nome}}", label: "Responsável" },
  { tag: "{{responsavel_email}}", label: "E-mail do gestor" },
  { tag: "{{segmento}}", label: "Segmento" },
  { tag: "{{modulos_contratados}}", label: "Módulos contratados" },
  { tag: "{{limite_unidades}}", label: "Qtde unidades/igrejas" },
  { tag: "{{faixa_preco}}", label: "Nome da faixa" },
  { tag: "{{valor_unitario}}", label: "Valor por unidade" },
  { tag: "{{regra_calculo}}", label: "Memória de cálculo" },
  { tag: "{{valor_mensal}}", label: "Valor mensal total" },
  { tag: "{{dia_vencimento}}", label: "Dia de vencimento" },
  { tag: "{{data_inicio}}", label: "Data de início" },
  { tag: "{{indice_reajuste}}", label: "Índice de reajuste" },
  { tag: "{{dias_carencia}}", label: "Dias de carência" },
  { tag: "{{contratada_nome}}", label: "Nome da Contratada" },
  { tag: "{{contratada_documento}}", label: "CNPJ da Contratada" },
  { tag: "{{foro_cidade}}", label: "Cidade do Foro" },
  { tag: "{{suporte_contato}}", label: "Contato de suporte" },
];

export const CONTRACT_LEGAL_STATUS_META: Record<
  ContractLegalStatus,
  { label: string; badgeVariant: "default" | "secondary" | "outline" | "destructive" }
> = {
  em_elaboracao: { label: "Em elaboração", badgeVariant: "outline" },
  aguardando_assinatura: { label: "Aguardando assinatura", badgeVariant: "secondary" },
  ativo: { label: "Ativo • Vigente", badgeVariant: "default" },
  suspenso_atraso: { label: "Suspenso por atraso", badgeVariant: "destructive" },
  cancelado: { label: "Cancelado", badgeVariant: "destructive" },
};

export const INVOICE_PROVIDER_LABELS: Record<InvoicePaymentMethod, string> = {
  asaas: "Asaas (PIX / Boleto)",
  cora: "Banco Cora",
  nubank_boleto: "Nubank (Boleto / PIX)",
  pix: "PIX Direto",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  transferencia: "Transferência / TED",
  outro: "Outro",
};

export const PREFERRED_PROVIDER_LABELS: Record<
  PlatformBillingConfig["preferredProvider"],
  string
> = {
  manual_nubank_cora: "Manual (Nubank / Cora / PIX)",
  asaas: "Asaas (PIX Dinâmico + Boleto)",
  cora: "Banco Cora (Boleto / PIX)",
};

export function roundCurrency(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function normalizePricingTiers(raw: unknown): PricingTier[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_PRICING_TIERS;
  const cleaned = raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, idx) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `tier-${idx + 1}`,
      segment: item.segment === "comercio" ? ("comercio" as const) : ("igreja" as const),
      name: typeof item.name === "string" && item.name.trim() ? item.name : `Faixa ${idx + 1}`,
      minUnits: Math.max(1, Math.floor(Number(item.minUnits) || 1)),
      maxUnits:
        item.maxUnits === null || item.maxUnits === undefined || item.maxUnits === ""
          ? null
          : Math.max(1, Math.floor(Number(item.maxUnits) || 1)),
      unitPrice: Math.max(0, roundCurrency(Number(item.unitPrice) || 0)),
      description: typeof item.description === "string" ? item.description : undefined,
    }));
  return cleaned.length > 0 ? cleaned : DEFAULT_PRICING_TIERS;
}

export function normalizeClauseTemplates(raw: unknown): ContractClauseTemplate[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_CONTRACT_CLAUSES;
  const cleaned = raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, idx) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `clausula-${idx + 1}`,
      order: Math.max(1, Math.floor(Number(item.order) || idx + 1)),
      title: typeof item.title === "string" && item.title.trim() ? item.title : `Cláusula ${idx + 1}`,
      body: typeof item.body === "string" ? item.body : "",
    }))
    .sort((a, b) => a.order - b.order);
  return cleaned.length > 0 ? cleaned : DEFAULT_CONTRACT_CLAUSES;
}

export function normalizeBillingConfig(raw: unknown): PlatformBillingConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_BILLING_CONFIG;
  const r = raw as Record<string, unknown>;
  const provider =
    r.preferredProvider === "asaas" || r.preferredProvider === "cora"
      ? r.preferredProvider
      : "manual_nubank_cora";
  return {
    preferredProvider: provider,
    gracePeriodDays: Math.max(1, Math.min(90, Math.floor(Number(r.gracePeriodDays) || 15))),
    pixKey: typeof r.pixKey === "string" ? r.pixKey : "",
    beneficiaryName:
      typeof r.beneficiaryName === "string" && r.beneficiaryName.trim()
        ? r.beneficiaryName
        : DEFAULT_BILLING_CONFIG.beneficiaryName,
    contractorDocument: typeof r.contractorDocument === "string" ? r.contractorDocument : "",
    contractorCity:
      typeof r.contractorCity === "string" && r.contractorCity.trim()
        ? r.contractorCity
        : DEFAULT_BILLING_CONFIG.contractorCity,
    supportContact:
      typeof r.supportContact === "string" && r.supportContact.trim()
        ? r.supportContact
        : DEFAULT_BILLING_CONFIG.supportContact,
    paymentInstructions:
      typeof r.paymentInstructions === "string" && r.paymentInstructions.trim()
        ? r.paymentInstructions
        : DEFAULT_BILLING_CONFIG.paymentInstructions,
  };
}

export interface TierCalculationResult {
  tier: PricingTier;
  units: number;
  unitPrice: number;
  totalMonthly: number;
  savingsPerUnit: number;
  totalSavingsVsBase: number;
  ruleLabel: string;
}

export function calculateTieredPrice(
  segment: ProjectSegment,
  unitsCount: number,
  tiers: PricingTier[] = DEFAULT_PRICING_TIERS
): TierCalculationResult {
  const units = Math.max(1, Math.floor(Number(unitsCount) || 1));
  const segmentTiers = tiers
    .filter((t) => t.segment === segment)
    .sort((a, b) => a.minUnits - b.minUnits);
  const pool =
    segmentTiers.length > 0
      ? segmentTiers
      : DEFAULT_PRICING_TIERS.filter((t) => t.segment === segment).sort(
          (a, b) => a.minUnits - b.minUnits
        );

  const matched =
    pool.find((t) => units >= t.minUnits && (t.maxUnits === null || units <= t.maxUnits)) ??
    (units < pool[0].minUnits ? pool[0] : pool[pool.length - 1]);

  const baseUnitPrice = pool[0]?.unitPrice ?? matched.unitPrice;
  const totalMonthly = roundCurrency(units * matched.unitPrice);
  const savingsPerUnit = Math.max(0, roundCurrency(baseUnitPrice - matched.unitPrice));
  const totalSavingsVsBase = roundCurrency(savingsPerUnit * units);
  const unitNoun = segment === "igreja" ? (units === 1 ? "igreja" : "igrejas") : units === 1 ? "unidade" : "unidades";

  return {
    tier: matched,
    units,
    unitPrice: matched.unitPrice,
    totalMonthly,
    savingsPerUnit,
    totalSavingsVsBase,
    ruleLabel: `${units} ${unitNoun} × ${formatBRL(matched.unitPrice)}`,
  };
}

export function todayIsoDate(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function currentCompetence(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function formatCompetenceLabel(competence: string): string {
  const match = competence.match(/^(\d{4})-(\d{2})$/);
  if (!match) return competence;
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const monthIdx = Math.max(0, Math.min(11, parseInt(match[2], 10) - 1));
  return `${months[monthIdx]}/${match[1]}`;
}

export function buildDueDateForCompetence(competence: string, dueDay = 10): string {
  const match = competence.match(/^(\d{4})-(\d{2})$/);
  const year = match ? parseInt(match[1], 10) : new Date().getFullYear();
  const month = match ? parseInt(match[2], 10) : new Date().getMonth() + 1;
  const clampedDay = Math.max(1, Math.min(31, Math.floor(dueDay || 10)));
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(clampedDay, lastDayOfMonth);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseIsoUtcMs(isoDate: string): number | null {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return Date.UTC(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
}

export function diffDaysIso(fromIso: string, toIso: string): number {
  const fromMs = parseIsoUtcMs(fromIso);
  const toMs = parseIsoUtcMs(toIso);
  if (fromMs === null || toMs === null) return 0;
  return Math.round((toMs - fromMs) / 86_400_000);
}

export type EffectiveInvoiceStatus =
  | "pago"
  | "cancelado"
  | "em_atraso"
  | "a_vencer"
  | "em_aberto";

export function computeInvoiceState(
  invoice: ContractInvoice,
  todayIso = todayIsoDate()
): {
  effectiveStatus: EffectiveInvoiceStatus;
  daysOverdue: number;
  daysUntilDue: number;
} {
  if (invoice.status === "pago") {
    return { effectiveStatus: "pago", daysOverdue: 0, daysUntilDue: 0 };
  }
  if (invoice.status === "cancelado") {
    return { effectiveStatus: "cancelado", daysOverdue: 0, daysUntilDue: 0 };
  }
  const delta = diffDaysIso(todayIso, invoice.dueDate);
  if (delta < 0) {
    return { effectiveStatus: "em_atraso", daysOverdue: Math.abs(delta), daysUntilDue: delta };
  }
  if (delta <= 5) {
    return { effectiveStatus: "a_vencer", daysOverdue: 0, daysUntilDue: delta };
  }
  return { effectiveStatus: "em_aberto", daysOverdue: 0, daysUntilDue: delta };
}

export interface ContractDelinquencySummary {
  status: "adimplente" | "a_vencer" | "inadimplente" | "sem_cobranca";
  overdueCount: number;
  overdueAmount: number;
  maxDaysOverdue: number;
  dueSoonCount: number;
  openAmount: number;
  paidAmount: number;
  shouldSuggestSuspension: boolean;
}

export function getContractDelinquencySummary(
  contract: PlatformContract,
  todayIso = todayIsoDate(),
  gracePeriodDays = 15
): ContractDelinquencySummary {
  const invoices = contract.invoices ?? [];
  if (invoices.length === 0) {
    return {
      status: "sem_cobranca",
      overdueCount: 0,
      overdueAmount: 0,
      maxDaysOverdue: 0,
      dueSoonCount: 0,
      openAmount: 0,
      paidAmount: 0,
      shouldSuggestSuspension: false,
    };
  }

  let overdueCount = 0;
  let overdueAmount = 0;
  let maxDaysOverdue = 0;
  let dueSoonCount = 0;
  let openAmount = 0;
  let paidAmount = 0;

  for (const inv of invoices) {
    const state = computeInvoiceState(inv, todayIso);
    if (state.effectiveStatus === "pago") {
      paidAmount = roundCurrency(paidAmount + (inv.paidAmount ?? inv.amount));
    } else if (state.effectiveStatus === "em_atraso") {
      overdueCount += 1;
      overdueAmount = roundCurrency(overdueAmount + inv.amount);
      openAmount = roundCurrency(openAmount + inv.amount);
      if (state.daysOverdue > maxDaysOverdue) maxDaysOverdue = state.daysOverdue;
    } else if (state.effectiveStatus === "a_vencer") {
      dueSoonCount += 1;
      openAmount = roundCurrency(openAmount + inv.amount);
    } else if (state.effectiveStatus === "em_aberto") {
      openAmount = roundCurrency(openAmount + inv.amount);
    }
  }

  const status =
    overdueCount > 0
      ? "inadimplente"
      : dueSoonCount > 0
      ? "a_vencer"
      : "adimplente";

  return {
    status,
    overdueCount,
    overdueAmount,
    maxDaysOverdue,
    dueSoonCount,
    openAmount,
    paidAmount,
    shouldSuggestSuspension:
      overdueCount > 0 && maxDaysOverdue >= gracePeriodDays && contract.status !== "suspenso",
  };
}

export function renderClauseTemplate(
  templateBody: string,
  contract: PlatformContract,
  pricingTiers: PricingTier[] = DEFAULT_PRICING_TIERS,
  billingConfig: PlatformBillingConfig = DEFAULT_BILLING_CONFIG
): string {
  const units = Math.max(1, Math.floor(contract.unitsCount ?? 1));
  const calc = calculateTieredPrice(contract.segment, units, pricingTiers);
  const effectiveMonthly =
    typeof contract.monthlyValue === "number" && contract.monthlyValue > 0
      ? contract.monthlyValue
      : calc.totalMonthly;
  const moduleNames = contract.activeModules
    .map((m) => getModuleById(m)?.name ?? m)
    .join(", ");

  const replacements: Record<string, string> = {
    "{{codigo_contrato}}": contract.code,
    "{{razao_social}}": contract.legalName?.trim() || contract.clientName,
    "{{cnpj_cpf}}": contract.documentNumber?.trim() || "A informar",
    "{{endereco_cidade}}": contract.address?.trim() || contract.city?.trim() || "A informar",
    "{{responsavel_nome}}": contract.responsibleName?.trim() || "Gestor Responsável",
    "{{responsavel_email}}": contract.responsibleEmail?.trim() || "não informado",
    "{{segmento}}": SEGMENT_DEFINITIONS[contract.segment].name,
    "{{modulos_contratados}}": moduleNames || "Conforme anexo operacional",
    "{{limite_unidades}}": String(units),
    "{{faixa_preco}}": calc.tier.name,
    "{{valor_unitario}}": formatBRL(calc.unitPrice),
    "{{regra_calculo}}": calc.ruleLabel,
    "{{valor_mensal}}": formatBRL(effectiveMonthly),
    "{{dia_vencimento}}": String(contract.billingDueDay ?? 10),
    "{{data_inicio}}": contract.contractStartDate || contract.createdAt || todayIsoDate(),
    "{{indice_reajuste}}": contract.adjustmentIndex?.trim() || "IPCA",
    "{{dias_carencia}}": String(billingConfig.gracePeriodDays ?? 15),
    "{{contratada_nome}}": billingConfig.beneficiaryName?.trim() || "SynapSys — Sistemas & Inteligência",
    "{{contratada_documento}}": billingConfig.contractorDocument?.trim() || "A informar",
    "{{foro_cidade}}": billingConfig.contractorCity?.trim() || "Rio de Janeiro - RJ",
    "{{suporte_contato}}": billingConfig.supportContact?.trim() || "contato@synapsys.app",
  };

  let output = templateBody;
  for (const [token, value] of Object.entries(replacements)) {
    output = output.split(token).join(value);
  }
  return output;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildPrintableContractHtml(
  contract: PlatformContract,
  clauses: ContractClauseTemplate[],
  pricingTiers: PricingTier[],
  billingConfig: PlatformBillingConfig
): string {
  const units = Math.max(1, Math.floor(contract.unitsCount ?? 1));
  const calc = calculateTieredPrice(contract.segment, units, pricingTiers);
  const effectiveMonthly =
    typeof contract.monthlyValue === "number" && contract.monthlyValue > 0
      ? contract.monthlyValue
      : calc.totalMonthly;
  const renderedClauses = [...clauses]
    .sort((a, b) => a.order - b.order)
    .map((cl) => ({
      title: renderClauseTemplate(cl.title, contract, pricingTiers, billingConfig),
      body: renderClauseTemplate(cl.body, contract, pricingTiers, billingConfig),
    }));

  const clausesHtml = renderedClauses
    .map(
      (c) => `
      <section class="clause">
        <h2>${escapeHtml(c.title)}</h2>
        ${c.body
          .split("\n")
          .filter(Boolean)
          .map((line) => `<p>${escapeHtml(line)}</p>`)
          .join("")}
      </section>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Contrato ${escapeHtml(contract.code)} - ${escapeHtml(contract.legalName || contract.clientName)}</title>
  <style>
    @page { size: A4; margin: 18mm 18mm 18mm 18mm; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; line-height: 1.55; font-size: 11pt; margin: 0; }
    .doc-header { border-bottom: 2px solid #0891b2; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
    .brand { font-size: 16pt; font-weight: 700; color: #0891b2; letter-spacing: -0.02em; }
    .brand-sub { font-size: 9pt; color: #475569; }
    .meta { text-align: right; font-size: 9pt; color: #475569; }
    h1 { font-size: 13pt; text-transform: uppercase; letter-spacing: 0.03em; margin: 0 0 14px; color: #0f172a; }
    .summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 18px; font-size: 9.5pt; }
    .summary-item strong { color: #334155; display: block; font-size: 8.5pt; text-transform: uppercase; }
    .clause { margin-bottom: 14px; page-break-inside: avoid; }
    .clause h2 { font-size: 10.5pt; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
    .clause p { margin: 0 0 6px; text-align: justify; }
    .signatures { margin-top: 34px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 36px; page-break-inside: avoid; }
    .sig-box { border-top: 1px solid #334155; padding-top: 6px; text-align: center; font-size: 9.5pt; }
    .sig-box small { display: block; color: #475569; font-size: 8.5pt; }
    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <div>
      <div class="brand">${escapeHtml(billingConfig.beneficiaryName || "SynapSys — Sistemas & Inteligência")}</div>
      <div class="brand-sub">Instrumento Particular de Licenciamento de Software (SaaS)</div>
    </div>
    <div class="meta">
      <div><strong>Contrato:</strong> ${escapeHtml(contract.code)}</div>
      <div><strong>Emissão:</strong> ${escapeHtml(todayIsoDate().split("-").reverse().join("/"))}</div>
    </div>
  </div>

  <h1>Contrato de Prestação de Serviços e Licença de Uso de Software</h1>

  <div class="summary-grid">
    <div class="summary-item"><strong>Contratante</strong>${escapeHtml(contract.legalName || contract.clientName)}</div>
    <div class="summary-item"><strong>CNPJ / CPF</strong>${escapeHtml(contract.documentNumber || "A informar")}</div>
    <div class="summary-item"><strong>Unidades / Igrejas Contratadas</strong>${units} unidade(s) (${escapeHtml(calc.tier.name)})</div>
    <div class="summary-item"><strong>Mensalidade / Vencimento</strong>${escapeHtml(formatBRL(effectiveMonthly))} • Todo dia ${contract.billingDueDay ?? 10}</div>
  </div>

  ${clausesHtml}

  <p style="margin-top: 22px;">E, por estarem assim justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor ou por meio de assinatura eletrônica válida.</p>
  <p>${escapeHtml(billingConfig.contractorCity || "Rio de Janeiro - RJ")}, ${escapeHtml(todayIsoDate().split("-").reverse().join("/"))}.</p>

  <div class="signatures">
    <div class="sig-box">
      <strong>${escapeHtml(billingConfig.beneficiaryName || "SynapSys — Sistemas & Inteligência")}</strong>
      <small>CONTRATADA ${billingConfig.contractorDocument ? `• ${escapeHtml(billingConfig.contractorDocument)}` : ""}</small>
    </div>
    <div class="sig-box">
      <strong>${escapeHtml(contract.legalName || contract.clientName)}</strong>
      <small>CONTRATANTE • Resp.: ${escapeHtml(contract.responsibleName || "Gestor")} ${contract.documentNumber ? `(${escapeHtml(contract.documentNumber)})` : ""}</small>
    </div>
  </div>
</body>
</html>`;
}
