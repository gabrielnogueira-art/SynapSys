import type { ChurchPixConfig, DigitalTitheRecord } from "./labsTypes";
import { escapeHtml, formatBRL, formatCompetenceLabel, roundCurrency } from "../saasDefaults";

export interface SamplePixPreset {
  id: string;
  label: string;
  bank: string;
  validTarget: boolean;
  rawText: string;
}

export const SAMPLE_PIX_PRESETS: SamplePixPreset[] = [
  {
    id: "nubank",
    label: "Nubank (Válido • R$ 350,00)",
    bank: "Nubank",
    validTarget: true,
    rawText: [
      "Comprovante de transferência Pix - Nubank",
      "Valor: R$ 350,00",
      "Data: 18/11/2026 às 14:32",
      "Origem: Gabriel Nogueira da Silva",
      "Instituição: Nu Pagamentos S.A. (Nubank)",
      "Destino / Favorecido: Assembleia de Deus Ministério Madureira",
      "CNPJ: 12.345.678/0001-90",
      "ID da transação: E18236120202611181732NUBK004291",
    ].join("\n"),
  },
  {
    id: "itau",
    label: "Itaú (Válido • R$ 480,00)",
    bank: "Itaú",
    validTarget: true,
    rawText: [
      "Itaú Unibanco - Comprovante Pix",
      "Pago em 18/11/2026 09:45",
      "Valor pago: R$ 480,00",
      "Pagador: Maria Oliveira Costa",
      "Recebedor: Assembleia de Deus Ministério Madureira",
      "CNPJ Recebedor: 12345678000190",
      "Autenticação E2E: E60701190202611180945ITAU883120",
    ].join("\n"),
  },
  {
    id: "bradesco",
    label: "Bradesco (Válido • R$ 220,50)",
    bank: "Bradesco",
    validTarget: true,
    rawText: [
      "Banco Bradesco S.A. - Comprovante de Pagamento PIX",
      "Valor da operação: R$ 220,50",
      "Data/Hora: 17/11/2026 às 20:15",
      "Favorecido: AD Ministerio Madureira Sede",
      "CNPJ: 12.345.678/0001-90",
      "Pagador: Gabriel Nogueira da Silva",
      "Identificador E2E: E60746948202611172315BRAD771902",
    ].join("\n"),
  },
  {
    id: "inter",
    label: "Banco Inter (Válido • R$ 600,00)",
    bank: "Banco Inter",
    validTarget: true,
    rawText: [
      "Banco Inter - Comprovante de Transferência PIX",
      "Transferência no valor de R$ 600,00",
      "Realizada em 15/11/2026 - 11:08",
      "Quem pagou: João Pedro Almeida",
      "Quem recebeu: Assembleia de Deus Ministério Madureira",
      "CNPJ: 12.345.678/0001-90",
      "Código da Transação: E00416968202611151408INTR550198",
    ].join("\n"),
  },
  {
    id: "terceiro_invalido",
    label: "Teste Divergente (Outra conta/CNPJ)",
    bank: "Nubank",
    validTarget: false,
    rawText: [
      "Comprovante de transferência Pix - Nubank",
      "Valor: R$ 150,00",
      "Data: 18/11/2026 às 16:10",
      "Origem: Gabriel Nogueira da Silva",
      "Destino / Favorecido: Mercado Central Ltda",
      "CNPJ: 99.888.777/0001-55",
      "ID da transação: E18236120202611181910TEST999111",
    ].join("\n"),
  },
];

export function normalizeDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeFold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export interface PositionedTextItem {
  str: string;
  x: number;
  y: number;
}

/**
 * Reconstrói linhas de leitura (cima->baixo, esquerda->direita) a partir dos itens
 * posicionados extraídos pelo PDF.js, mantendo rótulos e valores alinhados.
 */
export function reconstructPdfPageLines(items: PositionedTextItem[]): string {
  const clean = items
    .map((it) => ({ ...it, str: it.str.replace(/\s+/g, " ").trim() }))
    .filter((it) => it.str.length > 0);

  if (clean.length === 0) return "";

  const sorted = [...clean].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Array<{ y: number; items: PositionedTextItem[] }> = [];
  const Y_TOLERANCE = 3.5;

  for (const item of sorted) {
    const targetRow = rows.find((r) => Math.abs(r.y - item.y) <= Y_TOLERANCE);
    if (targetRow) {
      targetRow.items.push(item);
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }

  return rows
    .map((row) =>
      row.items
        .sort((a, b) => a.x - b.x)
        .map((it) => it.str)
        .join(" ")
        .trim()
    )
    .filter(Boolean)
    .join("\n");
}

export interface ParsedPixReceipt {
  amount: number | null;
  paidAtIso: string | null;
  e2eCode: string | null;
  recipientName: string | null;
  recipientCnpj: string | null;
  payerName: string | null;
  bankOrigin: string | null;
  verificationStatus: "verificado" | "divergente" | "incompleto";
  verificationMessage: string;
}

const PT_MONTHS: Record<string, string> = {
  jan: "01",
  janeiro: "01",
  fev: "02",
  fevereiro: "02",
  mar: "03",
  marco: "03",
  abr: "04",
  abril: "04",
  mai: "05",
  maio: "05",
  jun: "06",
  junho: "06",
  jul: "07",
  julho: "07",
  ago: "08",
  agosto: "08",
  set: "09",
  setembro: "09",
  out: "10",
  outubro: "10",
  nov: "11",
  novembro: "11",
  dez: "12",
  dezembro: "12",
};

function parseBrazilianAmount(raw: string): number | null {
  const cleaned = raw.replace(/\s+/g, "");
  if (cleaned.includes(",")) {
    const num = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(num) && num > 0 ? roundCurrency(num) : null;
  }
  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num > 0 ? roundCurrency(num) : null;
}

function extractAmount(text: string): number | null {
  const labeledRegex =
    /(?:valor(?:\s+(?:pago|total|da\s+opera[çc][ãa]o|da\s+transfer[êe]ncia|do\s+pix|transferido))?)(?:\s*[:-]\s*|\s*\r?\n\s*|\s+(?=R\$))(?:R\$\s*)?([\d.\s]+,\d{2}|\d+(?:\.\d{2})?)/gi;
  for (const match of text.matchAll(labeledRegex)) {
    const val = parseBrazilianAmount(match[1]);
    if (val !== null) return val;
  }

  const currencyRegex = /R\$\s*([\d.\s]+,\d{2}|\d+(?:[.,]\d{2})?)/gi;
  for (const match of text.matchAll(currencyRegex)) {
    const val = parseBrazilianAmount(match[1]);
    if (val !== null) return val;
  }

  return null;
}

function extractPaidAtIso(text: string): string | null {
  const brDateMatch = text.match(
    /(\d{2})\/(\d{2})\/(\d{4})(?:[^\d\n]{1,8}(\d{2})[:h](\d{2}))?/
  );
  if (brDateMatch) {
    const [, dd, mm, yyyy, hh, min] = brDateMatch;
    return `${yyyy}-${mm}-${dd}${hh && min ? ` ${hh}:${min}` : " 12:00"}`;
  }

  const folded = normalizeFold(text);
  const ptDateMatch = folded.match(
    /\b(\d{1,2})\s+(?:de\s+)?(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?(?:\s+de)?\s+(\d{4})(?:[^\d\n]{0,12}(\d{2})[:h](\d{2}))?/i
  );
  if (ptDateMatch) {
    const day = ptDateMatch[1].padStart(2, "0");
    const month = PT_MONTHS[ptDateMatch[2].toLowerCase()];
    const year = ptDateMatch[3];
    const hh = ptDateMatch[4];
    const min = ptDateMatch[5];
    if (month) {
      return `${year}-${month}-${day}${hh && min ? ` ${hh}:${min}` : " 12:00"}`;
    }
  }

  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/);
  if (isoMatch) {
    return `${isoMatch[1]} ${isoMatch[2] ?? "12:00"}`;
  }

  return null;
}

function extractE2eCode(text: string): string | null {
  // 1. E2E completo em uma linha (28..34 caracteres padrão BACEN)
  const fullSingleLine = text.match(/\b(E\d{8}[A-Z0-9]{19,25})\b/i);
  if (fullSingleLine) return fullSingleLine[1].toUpperCase();

  // 2. E2E quebrado em duas linhas (linha seguinte contendo apenas código alfanumérico maiúsculo/dígitos)
  const wrappedE2E = text.match(/\b(E\d{8}[A-Z0-9]{8,22})\r?\n\s*([A-Z0-9]{4,16})(?=\s|$)/);
  if (wrappedE2E) {
    const compacted = `${wrappedE2E[1]}${wrappedE2E[2]}`.toUpperCase();
    if (compacted.length >= 20 && compacted.length <= 34) {
      return compacted;
    }
  }

  // 3. E2E curto ou parcial em uma linha
  const directE2E = text.match(/\b(E\d{8}[A-Z0-9]{10,26})\b/i);
  if (directE2E) return directE2E[1].toUpperCase();

  const labeledE2E = text.match(
    /(?:id\s+da\s+transa[çc][ãa]o|autentica[çc][ãa]o(?:\s+e2e)?|identificador(?:\s+e2e)?|end\s*to\s*end(?:\s*id)?|c[óo]digo(?:\s+da\s+transa[çc][ãa]o)?)\s*:?\s*(?:\r?\n\s*)?([A-Z0-9-]{8,40})/i
  );
  if (labeledE2E) return labeledE2E[1].toUpperCase();

  return null;
}

function detectBankOrigin(foldedText: string): string | null {
  const aliases: Array<{ label: string; patterns: string[] }> = [
    { label: "Nubank", patterns: ["nubank", "nu pagamentos"] },
    { label: "Itaú", patterns: ["itau unibanco", "banco itau", "itau"] },
    { label: "Bradesco", patterns: ["bradesco"] },
    { label: "Banco Inter", patterns: ["banco inter", "inter s.a"] },
    { label: "Santander", patterns: ["santander"] },
    { label: "Caixa", patterns: ["caixa economica", "caixa"] },
    { label: "Banco do Brasil", patterns: ["banco do brasil"] },
    { label: "Cora", patterns: ["cora scd", "banco cora", "cora"] },
    { label: "C6 Bank", patterns: ["c6 bank", "banco c6"] },
    { label: "Mercado Pago", patterns: ["mercado pago"] },
    { label: "PagBank", patterns: ["pagbank", "pagseguro"] },
    { label: "Sicoob", patterns: ["sicoob"] },
    { label: "Sicredi", patterns: ["sicredi"] },
    { label: "PicPay", patterns: ["picpay"] },
    { label: "BTG", patterns: ["btg pactual"] },
  ];

  for (const bank of aliases) {
    if (bank.patterns.some((p) => foldedText.includes(p))) {
      return bank.label;
    }
  }
  return null;
}

const SECTION_RECIPIENT_RE =
  /^(?:destino|dados\s+do\s+(?:recebedor|favorecido|benefici[áa]rio)|quem\s+recebeu|recebedor|favorecido|para)$/i;
const SECTION_PAYER_RE =
  /^(?:origem|dados\s+do\s+pagador|quem\s+pagou|pagador|de)$/i;
const SECTION_OTHER_RE =
  /^(?:sobre\s+a\s+transa[çc][ãa]o|dados\s+da\s+transa[çc][ãa]o|identifica[çc][ãa]o|resumo)$/i;
const CNPJ_FULL_OR_MASKED_RE =
  /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|[•●*xX\d]{2}\.[•●*xX\d]{3}\.\d{3}\/\d{4}-[•●*xX\d]{2}|\d{14})/;

function extractParties(lines: string[]): {
  recipientName: string | null;
  payerName: string | null;
  recipientCnpj: string | null;
} {
  let section: "none" | "recipient" | "payer" = "none";
  let recipientName: string | null = null;
  let payerName: string | null = null;
  let recipientCnpj: string | null = null;
  let anyCnpj: string | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    if (SECTION_RECIPIENT_RE.test(line)) {
      section = "recipient";
      continue;
    }
    if (SECTION_PAYER_RE.test(line)) {
      section = "payer";
      continue;
    }
    if (SECTION_OTHER_RE.test(line)) {
      section = "none";
      continue;
    }

    const cnpjMatch = line.match(CNPJ_FULL_OR_MASKED_RE);
    if (cnpjMatch) {
      if (!anyCnpj) anyCnpj = cnpjMatch[1];
      if (section === "recipient" && !recipientCnpj) {
        recipientCnpj = cnpjMatch[1];
      } else if (
        section === "none" &&
        !recipientCnpj &&
        /(?:cnpj|recebedor|favorecido|destino)/i.test(line)
      ) {
        recipientCnpj = cnpjMatch[1];
      }
    }

    const inlineRecipient = line.match(
      /^(?:destino(?:\s*\/\s*favorecido)?|favorecido|recebedor|quem\s+recebeu|para)\s*:\s*(.+)$/i
    );
    if (inlineRecipient && !recipientName) {
      recipientName = inlineRecipient[1].trim();
      section = "recipient";
      continue;
    }

    const inlinePayer = line.match(/^(?:origem|pagador|quem\s+pagou|de)\s*:\s*(.+)$/i);
    if (inlinePayer && !payerName) {
      payerName = inlinePayer[1].trim();
      section = "payer";
      continue;
    }

    const nameFieldMatch = line.match(/^(?:nome|raz[ãa]o\s+social)(?:\s*:|\s+)(.*)$/i);
    if (nameFieldMatch) {
      const val = (nameFieldMatch[1] || "").trim() || (lines[i + 1] || "").trim();
      if (val && !/^(?:cpf|cnpj|institui|banco|ag[êe]ncia|conta)/i.test(val)) {
        if (section === "recipient" && !recipientName) recipientName = val;
        if (section === "payer" && !payerName) payerName = val;
      }
    }
  }

  return {
    recipientName,
    payerName,
    recipientCnpj: recipientCnpj ?? anyCnpj,
  };
}

function compareCnpjWithExpected(
  foundRaw: string | null,
  expectedDigits: string
): "exact" | "masked_match" | "mismatch" | "missing" {
  if (!foundRaw || !expectedDigits) return "missing";
  const foundDigits = normalizeDigits(foundRaw);
  if (foundDigits.length === 14) {
    return foundDigits === expectedDigits ? "exact" : "mismatch";
  }
  // Ex: Nubank mascara como ••.345.678/0001-•• -> núcleo numérico parcial
  if (foundRaw.includes("/") && foundDigits.length >= 6 && foundDigits.length < 14) {
    return expectedDigits.includes(foundDigits) ? "masked_match" : "mismatch";
  }
  return "missing";
}

export function parsePixReceiptText(
  rawText: string,
  churchConfig: ChurchPixConfig
): ParsedPixReceipt {
  const text = rawText.trim();
  if (!text) {
    return {
      amount: null,
      paidAtIso: null,
      e2eCode: null,
      recipientName: null,
      recipientCnpj: null,
      payerName: null,
      bankOrigin: null,
      verificationStatus: "incompleto",
      verificationMessage: "Envie ou cole os dados do comprovante PIX para leitura.",
    };
  }

  // Rejeita texto binário bruto caso algo não decodificado tenha chegado aqui
  if (text.startsWith("%PDF-")) {
    return {
      amount: null,
      paidAtIso: null,
      e2eCode: null,
      recipientName: null,
      recipientCnpj: null,
      payerName: null,
      bankOrigin: null,
      verificationStatus: "incompleto",
      verificationMessage:
        "Arquivo PDF detectado em formato bruto. Use 'Selecionar Arquivo / Print' para extrair o texto automaticamente ou cole o texto do comprovante.",
    };
  }

  const lines = text.split(/\r?\n/);
  const foldedText = normalizeFold(text);

  const amount = extractAmount(text);
  const paidAtIso = extractPaidAtIso(text);
  const e2eCode = extractE2eCode(text);
  const bankOrigin = detectBankOrigin(foldedText);
  const { recipientName, payerName, recipientCnpj } = extractParties(lines);

  const expectedCnpjDigits = normalizeDigits(churchConfig.churchCnpj);
  const cnpjResult = compareCnpjWithExpected(recipientCnpj, expectedCnpjDigits);

  const pixKeyClean = churchConfig.pixKey.trim();
  const pixKeyDigits = normalizeDigits(pixKeyClean);
  const textDigits = normalizeDigits(text);
  const keyMatches = Boolean(
    pixKeyClean &&
      (foldedText.includes(normalizeFold(pixKeyClean)) ||
        (pixKeyDigits.length >= 8 && textDigits.includes(pixKeyDigits)))
  );

  const expectedWords = normalizeFold(churchConfig.churchName)
    .split(/\s+/)
    .filter((w) => w.length >= 4 && w !== "sede" && w !== "igreja");
  const holderMatches = Boolean(
    (recipientName && expectedWords.some((w) => normalizeFold(recipientName).includes(w))) ||
      expectedWords.filter((w) => foldedText.includes(w)).length >= 2
  );

  let verificationStatus: ParsedPixReceipt["verificationStatus"] = "incompleto";
  let verificationMessage = "";

  if (!amount || !e2eCode) {
    verificationStatus = "incompleto";
    verificationMessage =
      "Faltou identificar valor ou código E2E/autenticação no texto. Complete ou confira manualmente antes de enviar.";
  } else if (cnpjResult === "mismatch") {
    verificationStatus = "divergente";
    verificationMessage = `Atenção: o CNPJ de destino (${recipientCnpj}) não confere com a conta oficial da igreja (${churchConfig.churchCnpj}). Envio sinalizado para conferência rigorosa da tesouraria.`;
  } else if (
    cnpjResult === "exact" ||
    cnpjResult === "masked_match" ||
    keyMatches ||
    holderMatches
  ) {
    verificationStatus = "verificado";
    if (cnpjResult === "exact" || keyMatches) {
      verificationMessage = "Favorecido e CNPJ/Chave oficial da igreja conferidos com sucesso!";
    } else if (cnpjResult === "masked_match") {
      verificationMessage =
        "Dígitos visíveis do CNPJ mascarado e favorecido conferem com a conta oficial da igreja!";
    } else {
      verificationMessage =
        "Favorecido compatível com a igreja (sem CNPJ explícito — tesouraria confirmará no extrato).";
    }
  } else {
    verificationStatus = "divergente";
    verificationMessage =
      "Não foi possível confirmar CNPJ/favorecido oficial da igreja neste comprovante. Marque para conferência manual.";
  }

  return {
    amount,
    paidAtIso,
    e2eCode,
    recipientName,
    recipientCnpj,
    payerName,
    bankOrigin,
    verificationStatus,
    verificationMessage,
  };
}

export function buildDeterministicQrSvg(seed: string): string {
  // Gera uma matriz determinística 9x9 simples apenas visual/decorativa para código de autenticidade offline
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const size = 9;
  const cell = 6;
  const rects: string[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const bitIndex = (y * size + x) % 31;
      const isCorner =
        (x < 3 && y < 3) || (x >= size - 3 && y < 3) || (x < 3 && y >= size - 3);
      const on = isCorner ? ((x === 1 && y === 1) ? false : true) : ((hash >>> bitIndex) & 1) === 1;
      if (on) {
        rects.push(`<rect x="${x * cell}" y="${y * cell}" width="${cell - 0.5}" height="${cell - 0.5}" fill="#0f172a" />`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size * cell} ${size * cell}" width="64" height="64">${rects.join("")}</svg>`;
}

export function buildTitheReceiptShareText(
  tithe: DigitalTitheRecord,
  churchConfig: ChurchPixConfig
): string {
  const statusLabel =
    tithe.status === "conciliado"
      ? "Conciliado pela Tesouraria"
      : "Registrado via PIX (Aguardando Conciliação)";
  const [datePart, timePart] = tithe.paidAtIso.split(" ");
  const dateBr = (datePart || tithe.paidAtIso).split("-").reverse().join("/");
  return [
    `*COMPROVANTE DE DÍZIMO — ${churchConfig.churchName}*`,
    churchConfig.churchCnpj ? `CNPJ: ${churchConfig.churchCnpj}` : "",
    `Recibo Nº: ${tithe.receiptNumber}`,
    `--------------------------------`,
    `Dizimista: ${tithe.memberName}`,
    `Matrícula: #${tithe.matricula} (${tithe.memberRole})`,
    `Congregação: ${tithe.congregation}`,
    `Referência: ${formatCompetenceLabel(tithe.competenceMonth)}`,
    `Valor: ${formatBRL(tithe.amount)}`,
    `Data/Hora: ${dateBr}${timePart ? ` às ${timePart}` : ""}`,
    `Meio: ${tithe.paymentMethod}${tithe.bankOrigin ? ` (${tithe.bankOrigin})` : ""}`,
    `Autenticação E2E: ${tithe.e2eCode}`,
    `Situação: ${statusLabel}`,
    `--------------------------------`,
    `Documento gerado dinamicamente (Zero Storage • SynapSys).`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPrintableTitheReceiptHtml(
  tithe: DigitalTitheRecord,
  churchConfig: ChurchPixConfig,
  ebdClassName?: string
): string {
  const statusLabel =
    tithe.status === "conciliado"
      ? "CONCILIADO PELA TESOURARIA"
      : "CONFIRMADO VIA COMPROVANTE PIX";
  const [datePart, timePart] = tithe.paidAtIso.split(" ");
  const dateBr = (datePart || tithe.paidAtIso).split("-").reverse().join("/");
  const qrSvg = buildDeterministicQrSvg(`${tithe.receiptNumber}:${tithe.e2eCode}:${tithe.amount}`);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Recibo de Dízimo ${escapeHtml(tithe.receiptNumber)}</title>
  <style>
    @page { size: A5 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 0; font-size: 10.5pt; line-height: 1.5; }
    .box { border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 18px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0891b2; padding-bottom: 10px; margin-bottom: 14px; gap: 12px; }
    .church { font-size: 13pt; font-weight: 700; color: #0e7490; }
    .sub { font-size: 8.5pt; color: #475569; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; background: #ecfeff; border: 1px solid #06b6d4; color: #0e7490; font-weight: 700; font-size: 8.5pt; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 14px; margin-bottom: 14px; }
    .field strong { display: block; font-size: 8pt; text-transform: uppercase; color: #64748b; }
    .amount-box { background: #f8fafc; border: 1.5px dashed #0891b2; border-radius: 6px; padding: 12px; text-align: center; margin: 12px 0; }
    .amount-box span { display: block; font-size: 8.5pt; color: #475569; }
    .amount-box strong { font-size: 18pt; color: #0f172a; }
    .auth-row { display: flex; justify-content: space-between; align-items: center; gap: 14px; border-top: 1px dashed #cbd5e1; padding-top: 12px; margin-top: 10px; }
    .e2e { font-family: monospace; font-size: 8.5pt; word-break: break-all; color: #334155; }
    .foot { margin-top: 12px; font-size: 8pt; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="box">
    <div class="head">
      <div>
        <div class="church">${escapeHtml(churchConfig.churchName)}</div>
        <div class="sub">CNPJ: ${escapeHtml(churchConfig.churchCnpj || "Não informado")}</div>
        <div class="sub">Congregação: ${escapeHtml(tithe.congregation)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700;font-size:10pt;">RECIBO DE DÍZIMO</div>
        <div class="sub" style="font-family:monospace;">${escapeHtml(tithe.receiptNumber)}</div>
      </div>
    </div>

    <div class="badge">${escapeHtml(statusLabel)}</div>

    <div class="grid">
      <div class="field"><strong>Dizimista</strong>${escapeHtml(tithe.memberName)}</div>
      <div class="field"><strong>Matrícula / Cargo</strong>#${escapeHtml(tithe.matricula)} • ${escapeHtml(tithe.memberRole)}</div>
      <div class="field"><strong>Mês de Referência</strong>${escapeHtml(formatCompetenceLabel(tithe.competenceMonth))}</div>
      <div class="field"><strong>Data / Hora</strong>${escapeHtml(dateBr)}${timePart ? ` às ${escapeHtml(timePart)}` : ""}</div>
      <div class="field"><strong>Forma / Banco</strong>${escapeHtml(tithe.paymentMethod)}${tithe.bankOrigin ? ` (${escapeHtml(tithe.bankOrigin)})` : ""}</div>
      ${ebdClassName ? `<div class="field"><strong>Classe EBD Vinculada</strong>${escapeHtml(ebdClassName)}</div>` : ""}
    </div>

    <div class="amount-box">
      <span>VALOR DEVOLVIDO</span>
      <strong>${escapeHtml(formatBRL(tithe.amount))}</strong>
    </div>

    <div class="auth-row">
      <div>
        <div style="font-size:8pt;font-weight:700;color:#475569;text-transform:uppercase;">Autenticação Bancária (E2E)</div>
        <div class="e2e">${escapeHtml(tithe.e2eCode)}</div>
        ${tithe.reconciledBy ? `<div class="sub" style="margin-top:4px;">Conciliado por: ${escapeHtml(tithe.reconciledBy)}</div>` : ""}
      </div>
      <div title="Código visual de autenticidade">${qrSvg}</div>
    </div>

    <div class="foot">
      Recibo gerado dinamicamente a partir dos registros do sistema (Zero File Storage • SynapSys).
    </div>
  </div>
</body>
</html>`;
}
