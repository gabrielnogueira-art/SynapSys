import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { PositionedTextItem, reconstructPdfPageLines } from "./pixReceiptParser";

export type ReceiptExtractionMethod = "text" | "pdf-text" | "pdf-ocr" | "image-ocr";

export interface ReceiptExtractionResult {
  text: string;
  method: ReceiptExtractionMethod;
  pageCount?: number;
}

async function runOcrOnImageSource(
  source: File | HTMLCanvasElement,
  onProgress?: (statusText: string) => void
): Promise<string> {
  onProgress?.("Carregando leitor OCR (português) no navegador...");
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("por", 1, {
    logger: (msg) => {
      if (msg.status === "recognizing text" && typeof msg.progress === "number") {
        const pct = Math.round(msg.progress * 100);
        onProgress?.(`Lendo texto do comprovante (${pct}%)...`);
      }
    },
  });
  try {
    const result = await worker.recognize(source);
    return (result.data.text || "").trim();
  } finally {
    await worker.terminate();
  }
}

async function isPdfBuffer(file: File): Promise<boolean> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return true;
  }
  const head = await file.slice(0, 5).text();
  return head.startsWith("%PDF-");
}

function isTextItem(item: unknown): item is TextItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    "transform" in item &&
    Array.isArray((item as TextItem).transform)
  );
}

/**
 * Extrai texto de comprovantes PIX (.pdf, imagens PNG/JPG/WEBP ou .txt/.csv)
 * 100% no navegador (Zero File Storage — nenhum arquivo é enviado ao servidor).
 */
export async function extractReceiptTextFromFile(
  file: File,
  onProgress?: (statusText: string) => void
): Promise<ReceiptExtractionResult> {
  if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp)$/i.test(file.name)) {
    const text = await runOcrOnImageSource(file, onProgress);
    return { text, method: "image-ocr" };
  }

  if (await isPdfBuffer(file)) {
    onProgress?.("Decodificando camadas do PDF localmente...");
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const workerModule = await import(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"
    );
    pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjs.getDocument({
      data: bytes,
      verbosity: 0,
    });

    try {
      const pdf = await loadingTask.promise;
      const maxPages = Math.min(pdf.numPages, 4);
      const pageTexts: string[] = [];

      for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
        onProgress?.(`Extraindo texto da página ${pageNum} de ${maxPages}...`);
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const positioned: PositionedTextItem[] = [];
        for (const item of content.items) {
          if (!isTextItem(item) || !item.str.trim()) continue;
          const x = Number(item.transform[4]) || 0;
          const y = Number(item.transform[5]) || 0;
          positioned.push({ str: item.str, x, y });
        }
        const reconstructed = reconstructPdfPageLines(positioned);
        if (reconstructed) pageTexts.push(reconstructed);
      }

      const combinedText = pageTexts.join("\n").trim();
      if (combinedText.replace(/\s+/g, "").length >= 25) {
        return {
          text: combinedText,
          method: "pdf-text",
          pageCount: pdf.numPages,
        };
      }

      // PDF escaneado / somente imagem: renderiza em canvas em memória e aplica OCR
      onProgress?.("PDF sem texto selecionável; executando leitura OCR local...");
      const ocrPages: string[] = [];
      const ocrLimit = Math.min(pdf.numPages, 2);
      for (let pageNum = 1; pageNum <= ocrLimit; pageNum += 1) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          const pageOcr = await runOcrOnImageSource(canvas, onProgress);
          if (pageOcr) ocrPages.push(pageOcr);
        }
        canvas.width = 0;
        canvas.height = 0;
      }

      return {
        text: ocrPages.join("\n").trim(),
        method: "pdf-ocr",
        pageCount: pdf.numPages,
      };
    } finally {
      await loadingTask.destroy().catch(() => {});
    }
  }

  // Arquivos texto / CSV
  const raw = await file.text();
  const printable = raw
    .replace(/[^\x20-\x7E\u00C0-\u017F\n\r]/g, " ")
    .replace(/ {3,}/g, " ")
    .trim();
  return { text: printable, method: "text" };
}
