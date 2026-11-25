export interface SecretariatMemberLike {
  id: string;
  matricula?: number;
  name: string;
  role: string;
  congregation: string;
  status: string;
  phone: string;
  birthDate?: string;
  gender?: "M" | "F";
  profession?: string;
  createdAt?: string;
}

export interface SecretariatUnitLike {
  id: string;
  name: string;
  status?: string;
}

export interface MemberDirectoryLookupItem {
  id: string;
  matricula?: number;
  name: string;
  role: string;
  congregation: string;
}

export interface BirthdayItem {
  member: SecretariatMemberLike;
  day: number;
  month: number;
  ageTurning: number | null;
  daysUntil: number;
}

export interface AgeBracketRow {
  id: string;
  label: string;
  maleCount: number;
  malePct: number;
  femaleCount: number;
  femalePct: number;
  unspecifiedCount: number;
  total: number;
  pctOfActive: number;
}

export interface CountShareRow {
  label: string;
  count: number;
  pct: number;
}

export interface SecretariatDashboardMetrics {
  totalMembers: number;
  activeCount: number;
  inactiveCount: number;
  maleCount: number;
  femaleCount: number;
  unspecifiedGenderCount: number;
  malePct: number;
  femalePct: number;
  unitsCount: number;
  activeUnitsCount: number;
  birthdaysToday: BirthdayItem[];
  birthdaysWeek: BirthdayItem[];
  birthdaysMonth: BirthdayItem[];
  ageBrackets: AgeBracketRow[];
  missingBirthDateCount: number;
  latestRegistrations: SecretariatMemberLike[];
  roleDistribution: CountShareRow[];
  topProfessions: CountShareRow[];
  unspecifiedProfessionCount: number;
}

export interface EffectiveCongregationResult {
  congregation: string;
  source: "usuario" | "predefinicao" | "padrao";
}

export function resolveEffectiveCongregation(params: {
  sessionCongregation?: string | null;
  accessCongregation?: string | null;
  configuredDefault?: string | null;
  fallback?: string;
}): EffectiveCongregationResult {
  const fromSession = params.sessionCongregation?.trim();
  if (fromSession) return { congregation: fromSession, source: "usuario" };

  const fromAccess = params.accessCongregation?.trim();
  if (fromAccess) return { congregation: fromAccess, source: "usuario" };

  const fromConfig = params.configuredDefault?.trim();
  if (fromConfig) return { congregation: fromConfig, source: "predefinicao" };

  return { congregation: params.fallback?.trim() || "Igreja Sede", source: "padrao" };
}

export function findMemberByMatriculaInput<T extends MemberDirectoryLookupItem>(
  members: T[],
  rawInput: string
): T | undefined {
  const digits = rawInput.replace(/[#\s]/g, "");
  if (!/^\d+$/.test(digits)) return undefined;
  const num = parseInt(digits, 10);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return members.find((m) => m.matricula === num);
}

function foldText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function suggestAccountPlanForRole(
  memberRole: string,
  currentPlan: string,
  availablePlans: string[]
): string | null {
  if (availablePlans.length === 0) return null;
  const currentFold = foldText(currentPlan);
  // Só altera automaticamente quando o plano atual está vazio ou selecionado como "dízimo"
  if (currentFold && !currentFold.includes("dizimo")) return null;

  const roleFold = foldText(memberRole);
  const findPlan = (needle: string) =>
    availablePlans.find((p) => foldText(p).includes(needle));

  if (roleFold.includes("pastor")) {
    return findPlan("pastor") ?? findPlan("obreiro") ?? null;
  }
  if (
    ["obreiro", "diacono", "presbitero", "evangelista", "missionari", "auxiliar", "cooperador"].some(
      (kw) => roleFold.includes(kw)
    )
  ) {
    return findPlan("obreiro") ?? null;
  }
  if (roleFold.includes("membro") || roleFold.includes("congregado")) {
    return findPlan("membro") ?? null;
  }
  return null;
}

export function parseIsoDateParts(
  iso?: string
): { year: number; month: number; day: number } | null {
  if (!iso) return null;
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function computeAgeAtDate(birthDate?: string, refDate = new Date()): number | null {
  const parts = parseIsoDateParts(birthDate);
  if (!parts) return null;
  const refY = refDate.getFullYear();
  const refM = refDate.getMonth() + 1;
  const refD = refDate.getDate();
  let age = refY - parts.year;
  if (refM < parts.month || (refM === parts.month && refD < parts.day)) {
    age -= 1;
  }
  return age >= 0 && age <= 150 ? age : null;
}

function roundPct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 10000) / 100;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysUntilBirthday(month: number, day: number, refDate: Date): number {
  const refMid = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const adjustDay = (yr: number) =>
    month === 2 && day === 29 && !isLeapYear(yr) ? 28 : day;

  let candidate = new Date(refMid.getFullYear(), month - 1, adjustDay(refMid.getFullYear()));
  if (candidate.getTime() < refMid.getTime()) {
    const nextYr = refMid.getFullYear() + 1;
    candidate = new Date(nextYr, month - 1, adjustDay(nextYr));
  }
  return Math.round((candidate.getTime() - refMid.getTime()) / 86400000);
}

const AGE_BRACKET_DEFS = [
  { id: "criancas", label: "Criança: 1 a 11 anos", min: 0, max: 11 },
  { id: "adolescentes", label: "Adolescente: 12 a 18 anos", min: 12, max: 18 },
  { id: "jovens", label: "Jovens: 18 a 35 anos", min: 18, max: 35 },
  { id: "adultos", label: "Adultos: 19 a 59 anos", min: 19, max: 59 },
  { id: "idosos", label: "Idosos: 60 a 150 anos", min: 60, max: 150 },
] as const;

export function computeSecretariatDashboardMetrics(
  members: SecretariatMemberLike[],
  units: SecretariatUnitLike[],
  referenceDate = new Date()
): SecretariatDashboardMetrics {
  const activeMembers = members.filter((m) => m.status === "Ativo");
  const activeCount = activeMembers.length;
  const totalMembers = members.length;
  const inactiveCount = totalMembers - activeCount;

  let maleCount = 0;
  let femaleCount = 0;
  let unspecifiedGenderCount = 0;
  let missingBirthDateCount = 0;
  let unspecifiedProfessionCount = 0;

  const refMonth = referenceDate.getMonth() + 1;
  const birthdaysToday: BirthdayItem[] = [];
  const birthdaysWeek: BirthdayItem[] = [];
  const birthdaysMonth: BirthdayItem[] = [];

  const roleCounts = new Map<string, number>();
  const professionCounts = new Map<string, number>();
  const bracketCounts = AGE_BRACKET_DEFS.map(() => ({
    male: 0,
    female: 0,
    unspec: 0,
  }));

  for (const m of activeMembers) {
    if (m.gender === "M") maleCount += 1;
    else if (m.gender === "F") femaleCount += 1;
    else unspecifiedGenderCount += 1;

    const roleName = (m.role || "Membro").trim();
    roleCounts.set(roleName, (roleCounts.get(roleName) ?? 0) + 1);

    const profName = m.profession?.trim();
    if (profName) {
      professionCounts.set(profName, (professionCounts.get(profName) ?? 0) + 1);
    } else {
      unspecifiedProfessionCount += 1;
    }

    const bParts = parseIsoDateParts(m.birthDate);
    if (!bParts) {
      missingBirthDateCount += 1;
      continue;
    }

    const diffDays = daysUntilBirthday(bParts.month, bParts.day, referenceDate);
    const ageNow = computeAgeAtDate(m.birthDate, referenceDate);
    const bItem: BirthdayItem = {
      member: m,
      day: bParts.day,
      month: bParts.month,
      ageTurning: ageNow !== null ? referenceDate.getFullYear() - bParts.year : null,
      daysUntil: diffDays,
    };

    if (diffDays === 0) birthdaysToday.push(bItem);
    if (diffDays >= 0 && diffDays <= 6) birthdaysWeek.push(bItem);
    if (bParts.month === refMonth) birthdaysMonth.push(bItem);

    if (ageNow !== null) {
      AGE_BRACKET_DEFS.forEach((def, idx) => {
        if (ageNow >= def.min && ageNow <= def.max) {
          if (m.gender === "M") bracketCounts[idx].male += 1;
          else if (m.gender === "F") bracketCounts[idx].female += 1;
          else bracketCounts[idx].unspec += 1;
        }
      });
    }
  }

  birthdaysToday.sort((a, b) => a.member.name.localeCompare(b.member.name));
  birthdaysWeek.sort((a, b) => a.daysUntil - b.daysUntil || a.member.name.localeCompare(b.member.name));
  birthdaysMonth.sort((a, b) => a.day - b.day || a.member.name.localeCompare(b.member.name));

  const ageBrackets: AgeBracketRow[] = AGE_BRACKET_DEFS.map((def, idx) => {
    const c = bracketCounts[idx];
    const rowTotal = c.male + c.female + c.unspec;
    const knownGenderTotal = c.male + c.female;
    return {
      id: def.id,
      label: def.label,
      maleCount: c.male,
      malePct: knownGenderTotal > 0 ? Math.round((c.male / knownGenderTotal) * 100) : 0,
      femaleCount: c.female,
      femalePct: knownGenderTotal > 0 ? Math.round((c.female / knownGenderTotal) * 100) : 0,
      unspecifiedCount: c.unspec,
      total: rowTotal,
      pctOfActive: roundPct(rowTotal, activeCount),
    };
  });

  const latestRegistrations = [...members]
    .sort((a, b) => {
      const ca = a.createdAt ?? "";
      const cb = b.createdAt ?? "";
      if (ca !== cb) return cb.localeCompare(ca);
      return (b.matricula ?? 0) - (a.matricula ?? 0);
    })
    .slice(0, 5);

  const roleDistribution: CountShareRow[] = [...roleCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({
      label,
      count,
      pct: roundPct(count, activeCount),
    }));

  const topProfessions: CountShareRow[] = [...professionCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([label, count]) => ({
      label,
      count,
      pct: roundPct(count, activeCount),
    }));

  return {
    totalMembers,
    activeCount,
    inactiveCount,
    maleCount,
    femaleCount,
    unspecifiedGenderCount,
    malePct: roundPct(maleCount, activeCount),
    femalePct: roundPct(femaleCount, activeCount),
    unitsCount: units.length,
    activeUnitsCount: units.filter((u) => !u.status || u.status === "Ativa").length,
    birthdaysToday,
    birthdaysWeek,
    birthdaysMonth,
    ageBrackets,
    missingBirthDateCount,
    latestRegistrations,
    roleDistribution,
    topProfessions,
    unspecifiedProfessionCount,
  };
}

export interface TreasuryEntryLike {
  id: string;
  receiptNumber?: string;
  date: string;
  referenceMonth?: string;
  type: "entrada" | "saida";
  category: string;
  department?: string;
  documentType?: string;
  bankAccount?: string;
  paymentMethod?: string;
  contributorName?: string;
  contributorMatricula?: number;
  contributorRole?: string;
  description: string;
  notes?: string;
  congregation: string;
  amount: number;
  createdByName?: string;
}

export interface TreasuryGroupedRow {
  label: string;
  income: number;
  expense: number;
  net: number;
  count: number;
  pctIncome: number;
  pctExpense: number;
}

export interface TreasuryReportSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  entryCount: number;
  byPaymentMethod: TreasuryGroupedRow[];
  byAccountPlan: TreasuryGroupedRow[];
  byCongregation: TreasuryGroupedRow[];
  byBankAccount: TreasuryGroupedRow[];
  byDepartment: TreasuryGroupedRow[];
}

function groupTreasuryEntries(
  entries: TreasuryEntryLike[],
  keyFn: (e: TreasuryEntryLike) => string,
  totalIncome: number,
  totalExpense: number
): TreasuryGroupedRow[] {
  const map = new Map<string, { income: number; expense: number; count: number }>();
  for (const e of entries) {
    const k = keyFn(e) || "Não informado";
    const cur = map.get(k) ?? { income: 0, expense: 0, count: 0 };
    if (e.type === "entrada") cur.income += e.amount;
    else cur.expense += e.amount;
    cur.count += 1;
    map.set(k, cur);
  }
  return [...map.entries()]
    .map(([label, v]) => ({
      label,
      income: Math.round(v.income * 100) / 100,
      expense: Math.round(v.expense * 100) / 100,
      net: Math.round((v.income - v.expense) * 100) / 100,
      count: v.count,
      pctIncome: roundPct(v.income, totalIncome),
      pctExpense: roundPct(v.expense, totalExpense),
    }))
    .sort((a, b) => b.income + b.expense - (a.income + a.expense) || a.label.localeCompare(b.label));
}

export function computeTreasuryReports(entries: TreasuryEntryLike[]): TreasuryReportSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  for (const e of entries) {
    if (e.type === "entrada") totalIncome += e.amount;
    else totalExpense += e.amount;
  }
  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpense = Math.round(totalExpense * 100) / 100;

  return {
    totalIncome,
    totalExpense,
    netBalance: Math.round((totalIncome - totalExpense) * 100) / 100,
    entryCount: entries.length,
    byPaymentMethod: groupTreasuryEntries(
      entries,
      (e) => e.paymentMethod || "Dinheiro",
      totalIncome,
      totalExpense
    ),
    byAccountPlan: groupTreasuryEntries(
      entries,
      (e) => e.category || "Sem Plano de Contas",
      totalIncome,
      totalExpense
    ),
    byCongregation: groupTreasuryEntries(
      entries,
      (e) => e.congregation || "Igreja Sede",
      totalIncome,
      totalExpense
    ),
    byBankAccount: groupTreasuryEntries(
      entries,
      (e) => e.bankAccount || "Caixa Geral (Dinheiro)",
      totalIncome,
      totalExpense
    ),
    byDepartment: groupTreasuryEntries(
      entries,
      (e) => e.department || "1 - Tesouraria",
      totalIncome,
      totalExpense
    ),
  };
}

function escapeHtmlSafe(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtBrl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function buildTreasuryClosingReportHtml(params: {
  churchName: string;
  subtitle?: string;
  cnpj?: string;
  periodLabel: string;
  congregationLabel: string;
  generatedBy: string;
  summary: TreasuryReportSummary;
}): string {
  const { churchName, subtitle, cnpj, periodLabel, congregationLabel, generatedBy, summary } =
    params;

  const renderRows = (rows: TreasuryGroupedRow[]) =>
    rows
      .map(
        (r) => `<tr>
          <td>${escapeHtmlSafe(r.label)}</td>
          <td class="num">${r.count}</td>
          <td class="num pos">${escapeHtmlSafe(fmtBrl(r.income))}</td>
          <td class="num neg">${escapeHtmlSafe(fmtBrl(r.expense))}</td>
          <td class="num bold">${escapeHtmlSafe(fmtBrl(r.net))}</td>
        </tr>`
      )
      .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Encerramento do Caixa — ${escapeHtmlSafe(churchName)}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #0f172a; font-size: 10pt; line-height: 1.4; }
    h1 { font-size: 14pt; margin: 0 0 2px 0; }
    .muted { color: #475569; font-size: 9pt; }
    .head { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; gap: 16px; }
    .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
    .kpi { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; }
    .kpi strong { display: block; font-size: 13pt; margin-top: 2px; }
    h2 { font-size: 11pt; margin: 14px 0 6px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 7px; font-size: 9pt; }
    th { background: #f1f5f9; text-align: left; }
    .num { text-align: right; white-space: nowrap; }
    .pos { color: #047857; }
    .neg { color: #be123c; }
    .bold { font-weight: 700; }
    .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 32px; }
    .sign div { border-top: 1px solid #334155; padding-top: 4px; text-align: center; font-size: 8.5pt; }
  </style>
</head>
<body>
  <div class="head">
    <div>
      <h1>${escapeHtmlSafe(churchName)}</h1>
      ${subtitle ? `<div class="muted">${escapeHtmlSafe(subtitle)}</div>` : ""}
      ${cnpj ? `<div class="muted">CNPJ: ${escapeHtmlSafe(cnpj)}</div>` : ""}
    </div>
    <div style="text-align:right">
      <div class="bold">ENCERRAMENTO DO CAIXA / BALANCETE</div>
      <div class="muted">Período: ${escapeHtmlSafe(periodLabel)}</div>
      <div class="muted">Unidade: ${escapeHtmlSafe(congregationLabel)}</div>
      <div class="muted">Emitido em ${escapeHtmlSafe(new Date().toLocaleString("pt-BR"))}</div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi"><span class="muted">Total Entradas (${summary.entryCount} lanç.)</span><strong class="pos">${escapeHtmlSafe(fmtBrl(summary.totalIncome))}</strong></div>
    <div class="kpi"><span class="muted">Total Saídas</span><strong class="neg">${escapeHtmlSafe(fmtBrl(summary.totalExpense))}</strong></div>
    <div class="kpi"><span class="muted">Saldo Líquido</span><strong>${escapeHtmlSafe(fmtBrl(summary.netBalance))}</strong></div>
  </div>

  <h2>1. Resumo por Espécie / Forma de Pagamento</h2>
  <table>
    <thead><tr><th>Espécie</th><th class="num">Qtd</th><th class="num">Entradas</th><th class="num">Saídas</th><th class="num">Saldo</th></tr></thead>
    <tbody>${renderRows(summary.byPaymentMethod)}</tbody>
  </table>

  <h2>2. Balancete Analítico (Plano de Contas)</h2>
  <table>
    <thead><tr><th>Plano de Contas</th><th class="num">Qtd</th><th class="num">Entradas</th><th class="num">Saídas</th><th class="num">Saldo</th></tr></thead>
    <tbody>${renderRows(summary.byAccountPlan)}</tbody>
  </table>

  <h2>3. Movimento por Congregação</h2>
  <table>
    <thead><tr><th>Igreja / Congregação</th><th class="num">Qtd</th><th class="num">Entradas</th><th class="num">Saídas</th><th class="num">Saldo</th></tr></thead>
    <tbody>${renderRows(summary.byCongregation)}</tbody>
  </table>

  <div class="sign">
    <div>Tesoureiro / Operador (${escapeHtmlSafe(generatedBy)})</div>
    <div>Conferência Pastoral / Conselho Fiscal</div>
  </div>
</body>
</html>`;
}

export function buildTreasuryCsv(entries: TreasuryEntryLike[]): string {
  const escCsv = (val: unknown) => {
    let s = String(val ?? "");
    // Neutraliza fórmulas de planilha (CSV injection), preservando números.
    if (typeof val !== "number" && /^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) {
      s = `'${s}`;
    }
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = [
    "Recibo",
    "Data",
    "Competencia",
    "Tipo",
    "Igreja/Congregacao",
    "Departamento",
    "Plano de Contas",
    "Conta Corrente",
    "Tipo Documento",
    "Especie",
    "Matricula",
    "Contribuinte/Favorecido",
    "Cargo",
    "Historico",
    "Valor",
    "Responsavel",
  ];
  const rows = entries.map((e) => [
    e.receiptNumber || "",
    e.date,
    e.referenceMonth || "",
    e.type === "entrada" ? "Entrada" : "Saida",
    e.congregation,
    e.department || "",
    e.category,
    e.bankAccount || "",
    e.documentType || "",
    e.paymentMethod || "",
    e.contributorMatricula ? `#${e.contributorMatricula}` : "",
    e.contributorName || e.description,
    e.contributorRole || "",
    e.notes || "",
    e.amount.toFixed(2).replace(".", ","),
    e.createdByName || "",
  ]);
  return "\uFEFF" + [header, ...rows].map((r) => r.map(escCsv).join(";")).join("\r\n");
}
