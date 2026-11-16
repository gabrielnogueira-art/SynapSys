import { Download, FileText, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatReferenceMonthLabel } from "./receiptFormat";

export interface ThermalReceiptEntry {
  id: string;
  receiptNumber: string;
  date: string;
  referenceMonth?: string;
  type: "entrada" | "saida";
  purpose: string;
  bankAccount: string;
  paymentMethod: string;
  contributorName: string;
  contributorMatricula?: number;
  contributorRole: string;
  congregation: string;
  description: string;
  notes?: string;
  amount: number;
  createdAtIso: string;
  createdByName: string;
  createdByEmail: string;
}

export interface ThermalChurchHeader {
  churchName: string;
  subtitle?: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  footerMessage?: string;
}

interface ThermalReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: ThermalReceiptEntry | null;
  churchHeader: ThermalChurchHeader;
  paperWidth: "58mm" | "80mm";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateBr(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

function formatTimestampBr(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString("pt-BR");
}

function formatBrl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildStandaloneReceiptHtml(
  entry: ThermalReceiptEntry,
  header: ThermalChurchHeader,
  paperWidth: "58mm" | "80mm"
): string {
  const widthCss = paperWidth === "58mm" ? "58mm" : "80mm";
  const fontSize = paperWidth === "58mm" ? "10px" : "11px";
  const amountStr = formatBrl(entry.amount);
  const issueTime = formatTimestampBr(entry.createdAtIso);
  const refLabel = formatReferenceMonthLabel(entry.referenceMonth);
  const title =
    entry.type === "entrada"
      ? "RECIBO DE DÍZIMO / OFERTA"
      : "COMPROVANTE DE PAGAMENTO";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Recibo ${escapeHtml(entry.receiptNumber)}</title>
  <style>
    @page { size: ${widthCss} auto; margin: 2mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0 auto;
      padding: 6px;
      width: ${widthCss};
      font-family: 'Courier New', Courier, monospace;
      font-size: ${fontSize};
      line-height: 1.35;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .title { font-size: 1.05em; font-weight: 700; margin: 4px 0; }
    .sep { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
    .row span:last-child { text-align: right; word-break: break-word; }
    .amount-box {
      border: 1px solid #000;
      padding: 5px;
      margin: 6px 0;
      text-align: center;
      font-size: 1.25em;
      font-weight: 700;
    }
    .small { font-size: 0.9em; }
    @media print {
      body { width: ${widthCss}; margin: 0; padding: 2mm; }
    }
  </style>
</head>
<body>
  <div class="center bold">${escapeHtml(header.churchName.toUpperCase())}</div>
  ${header.subtitle ? `<div class="center small">${escapeHtml(header.subtitle)}</div>` : ""}
  ${header.cnpj ? `<div class="center small">CNPJ: ${escapeHtml(header.cnpj)}</div>` : ""}
  ${header.address ? `<div class="center small">${escapeHtml(header.address)}</div>` : ""}
  ${header.phone ? `<div class="center small">Tel: ${escapeHtml(header.phone)}</div>` : ""}
  <div class="sep"></div>
  <div class="center title">${title}</div>
  <div class="row"><span>Recibo Nº:</span><span class="bold">${escapeHtml(entry.receiptNumber)}</span></div>
  <div class="row"><span>Emissão:</span><span>${escapeHtml(issueTime)}</span></div>
  <div class="sep"></div>
  <div class="row"><span>${entry.type === "entrada" ? "Contribuinte:" : "Favorecido:"}</span><span class="bold">${escapeHtml(entry.contributorName || "-")}</span></div>
  ${
    entry.contributorMatricula
      ? `<div class="row"><span>Matrícula:</span><span>#${entry.contributorMatricula}</span></div>`
      : ""
  }
  <div class="row"><span>Condição:</span><span>${escapeHtml(entry.contributorRole)}</span></div>
  <div class="row"><span>Finalidade:</span><span>${escapeHtml(entry.purpose)}</span></div>
  ${
    entry.referenceMonth
      ? `<div class="row"><span>Referência:</span><span class="bold">${escapeHtml(refLabel)}</span></div>`
      : ""
  }
  <div class="row"><span>Data Lanç.:</span><span>${escapeHtml(formatDateBr(entry.date))}</span></div>
  <div class="row"><span>Conta/Banco:</span><span>${escapeHtml(entry.bankAccount)}</span></div>
  <div class="row"><span>Pagamento:</span><span>${escapeHtml(entry.paymentMethod)}</span></div>
  <div class="row"><span>Congregação:</span><span>${escapeHtml(entry.congregation)}</span></div>
  <div class="amount-box">VALOR: ${escapeHtml(amountStr)}</div>
  ${
    entry.notes || entry.description
      ? `<div class="small"><strong>Obs.:</strong> ${escapeHtml(entry.notes || entry.description)}</div><div class="sep"></div>`
      : `<div class="sep"></div>`
  }
  <div class="small"><strong>Lançado por:</strong> ${escapeHtml(entry.createdByName)}</div>
  <div class="small">Login: ${escapeHtml(entry.createdByEmail)}</div>
  ${
    header.footerMessage
      ? `<div class="sep"></div><div class="center small">${escapeHtml(header.footerMessage)}</div>`
      : ""
  }
</body>
</html>`;
}

function buildPlainTextReceipt(
  entry: ThermalReceiptEntry,
  header: ThermalChurchHeader,
  paperWidth: "58mm" | "80mm"
): string {
  const cols = paperWidth === "58mm" ? 32 : 42;
  const line = "-".repeat(cols);
  const lines = [
    header.churchName.toUpperCase(),
    ...(header.subtitle ? [header.subtitle] : []),
    ...(header.cnpj ? [`CNPJ: ${header.cnpj}`] : []),
    ...(header.address ? [header.address] : []),
    ...(header.phone ? [`Tel: ${header.phone}`] : []),
    line,
    entry.type === "entrada" ? "RECIBO DE DIZIMO / OFERTA" : "COMPROVANTE DE PAGAMENTO",
    `Recibo No: ${entry.receiptNumber}`,
    `Emissao:   ${formatTimestampBr(entry.createdAtIso)}`,
    line,
    `${entry.type === "entrada" ? "Contribuinte" : "Favorecido"}: ${entry.contributorName || "-"}`,
    ...(entry.contributorMatricula ? [`Matricula: #${entry.contributorMatricula}`] : []),
    `Condicao:   ${entry.contributorRole}`,
    `Finalidade: ${entry.purpose}`,
    ...(entry.referenceMonth ? [`Referencia: ${formatReferenceMonthLabel(entry.referenceMonth)}`] : []),
    `Data Lanc.: ${formatDateBr(entry.date)}`,
    `Conta:      ${entry.bankAccount}`,
    `Pagamento:  ${entry.paymentMethod}`,
    `Congreg.:   ${entry.congregation}`,
    line,
    `VALOR: ${formatBrl(entry.amount)}`,
    line,
    ...(entry.notes || entry.description ? [`Obs.: ${entry.notes || entry.description}`, line] : []),
    `Lancado por: ${entry.createdByName}`,
    `Login: ${entry.createdByEmail}`,
    ...(header.footerMessage ? [line, header.footerMessage] : []),
  ];
  return lines.join("\n");
}

export function ThermalReceiptDialog({
  open,
  onOpenChange,
  entry,
  churchHeader,
  paperWidth,
}: ThermalReceiptDialogProps) {
  if (!entry) return null;

  const handlePrint = () => {
    const html = buildStandaloneReceiptHtml(entry, churchHeader, paperWidth);
    const popup = window.open("", "_blank", "width=420,height=720");
    if (popup) {
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      setTimeout(() => {
        popup.print();
      }, 250);
    } else {
      window.print();
    }
  };

  const triggerDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = () => {
    const html = buildStandaloneReceiptHtml(entry, churchHeader, paperWidth);
    triggerDownload(html, `recibo-${entry.receiptNumber}.html`, "text/html;charset=utf-8");
  };

  const handleDownloadTxt = () => {
    const txt = buildPlainTextReceipt(entry, churchHeader, paperWidth);
    triggerDownload(txt, `recibo-${entry.receiptNumber}.txt`, "text/plain;charset=utf-8");
  };

  const widthClass = paperWidth === "58mm" ? "w-[232px]" : "w-[316px]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recibo de Impressão ({paperWidth})</DialogTitle>
          <DialogDescription>
            Formato estreito compatível com impressoras térmicas de cupom (bobina {paperWidth}).
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-2 bg-muted/40 rounded-lg border overflow-x-auto">
          <div
            className={`${widthClass} bg-white text-slate-900 font-mono text-[11px] leading-snug p-4 shadow-md border border-slate-200`}
          >
            <div className="text-center font-bold uppercase">
              {churchHeader.churchName}
            </div>
            {churchHeader.subtitle && (
              <div className="text-center text-[10px] text-slate-700">
                {churchHeader.subtitle}
              </div>
            )}
            {churchHeader.cnpj && (
              <div className="text-center text-[10px] text-slate-700">
                CNPJ: {churchHeader.cnpj}
              </div>
            )}
            {churchHeader.address && (
              <div className="text-center text-[10px] text-slate-700">
                {churchHeader.address}
              </div>
            )}
            {churchHeader.phone && (
              <div className="text-center text-[10px] text-slate-700">
                Tel: {churchHeader.phone}
              </div>
            )}

            <div className="border-t border-dashed border-slate-500 my-2" />
            <div className="text-center font-bold text-xs">
              {entry.type === "entrada"
                ? "RECIBO DE DÍZIMO / OFERTA"
                : "COMPROVANTE DE PAGAMENTO"}
            </div>
            <div className="flex justify-between gap-2 mt-1">
              <span>Recibo Nº:</span>
              <span className="font-bold">{entry.receiptNumber}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Emissão:</span>
              <span className="text-right">{formatTimestampBr(entry.createdAtIso)}</span>
            </div>

            <div className="border-t border-dashed border-slate-500 my-2" />
            <div className="flex justify-between gap-2">
              <span>{entry.type === "entrada" ? "Contribuinte:" : "Favorecido:"}</span>
              <span className="font-bold text-right">{entry.contributorName || "-"}</span>
            </div>
            {entry.contributorMatricula && (
              <div className="flex justify-between gap-2">
                <span>Matrícula:</span>
                <span>#{entry.contributorMatricula}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span>Condição:</span>
              <span className="text-right">{entry.contributorRole}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Finalidade:</span>
              <span className="text-right">{entry.purpose}</span>
            </div>
            {entry.referenceMonth && (
              <div className="flex justify-between gap-2">
                <span>Referência:</span>
                <span className="font-bold text-right">
                  {formatReferenceMonthLabel(entry.referenceMonth)}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span>Data Lanç.:</span>
              <span>{formatDateBr(entry.date)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Conta/Banco:</span>
              <span className="text-right">{entry.bankAccount}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Pagamento:</span>
              <span className="text-right">{entry.paymentMethod}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Congregação:</span>
              <span className="text-right">{entry.congregation}</span>
            </div>

            <div className="border border-slate-800 my-2 py-1.5 px-2 text-center font-bold text-sm">
              VALOR: {formatBrl(entry.amount)}
            </div>

            {(entry.notes || entry.description) && (
              <div className="text-[10px] mb-1.5">
                <strong>Obs.:</strong> {entry.notes || entry.description}
              </div>
            )}

            <div className="border-t border-dashed border-slate-500 my-2" />
            <div className="text-[10px]">
              <div>
                <strong>Lançado por:</strong> {entry.createdByName}
              </div>
              <div>Login: {entry.createdByEmail}</div>
            </div>

            {churchHeader.footerMessage && (
              <>
                <div className="border-t border-dashed border-slate-500 my-2" />
                <div className="text-center text-[10px] text-slate-700">
                  {churchHeader.footerMessage}
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleDownloadHtml}>
              <Download className="h-4 w-4 mr-1.5" /> Baixar (.html)
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleDownloadTxt}>
              <FileText className="h-4 w-4 mr-1.5" /> Baixar (.txt)
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button type="button" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" /> Imprimir Recibo
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
