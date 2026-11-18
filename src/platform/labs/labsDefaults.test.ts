import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getModulesBySegment, getOfficialCatalogModules } from "../catalog";
import {
  assembleSocialBaskets,
  buildMemberAnnualTimeline,
  computeCantinaEventSummary,
  computeLivrariaSummary,
  createSeedCantinaData,
  createSeedLivrariaData,
  createSeedMembroData,
  createSeedSocialData,
  DEFAULT_LAB_PROMOTIONS,
  nextTitheReceiptNumber,
  validateSocialDelivery,
} from "./labsDefaults";
import {
  buildPrintableTitheReceiptHtml,
  parsePixReceiptText,
  reconstructPdfPageLines,
  SAMPLE_PIX_PRESETS,
} from "./pixReceiptParser";

describe("labs official catalog promotion gating", () => {
  it("hides unpromoted lab modules from official catalog and exposes when promoted", () => {
    const before = getModulesBySegment("igreja", DEFAULT_LAB_PROMOTIONS);
    assert.deepEqual(
      before.map((m) => m.id),
      ["igreja_ebd", "igreja_tesouraria", "igreja_secretaria"]
    );
    assert.equal(getOfficialCatalogModules().length, 8);

    const withCantinaPromoted = {
      ...DEFAULT_LAB_PROMOTIONS,
      igreja_cantina: {
        ...DEFAULT_LAB_PROMOTIONS.igreja_cantina,
        stage: "promovido" as const,
        promotedToCatalog: true,
      },
    };
    const after = getModulesBySegment("igreja", withCantinaPromoted);
    assert.equal(after.some((m) => m.id === "igreja_cantina"), true);
    assert.equal(after.some((m) => m.id === "igreja_livraria"), false);
  });
});

describe("cantina closing formula", () => {
  it("computes (Producao - Sobras) * Preco = Receita Esperada and drawer diff", () => {
    const data = createSeedCantinaData("2026-11-18");
    // Item 0: 80 salgados @ R$ 7,00 -> mark 10 sobras -> expected (80-10)*7 = 490
    // Keep other items completely leftover so only salgado was consumed
    const items = data.items.map((it) =>
      it.id === "cnt-salgado"
        ? { ...it, leftoverQty: 10, wasteQty: 2 }
        : { ...it, leftoverQty: it.producedQty }
    );
    const summary = computeCantinaEventSummary(data.events[0], items, data.sales);
    assert.equal(summary.expectedRevenueFromConsumption, 490);
    // Salgado waste 2 -> net expected after waste = (80 - 10 - 2) * 7 = 476
    assert.equal(summary.netExpectedAfterWaste, 476);
    assert.equal(summary.recordedSalesTotal, 128); // 46 pix + 82 dinheiro
    assert.equal(summary.cashDrawerExpected, 182); // 100 initial + 82 dinheiro
  });
});

describe("livraria inventory and net profit", () => {
  it("detects low stock, pending deliveries, and computes net profit", () => {
    const data = createSeedLivrariaData("2026-11-18");
    const summary = computeLivrariaSummary(data);
    assert.equal(summary.lowStockProducts.length, 3); // Mestre (4), Biblia (3), Camiseta G (4)
    assert.equal(summary.pendingDeliveries.length, 1); // Camiseta G
    // paid = 96 + 90 = 186; COGS = 6*9.5 (57) + 2*24 (48) = 105; extraExpenses = 420
    assert.equal(summary.paidRevenue, 186);
    assert.equal(summary.costOfGoodsSold, 105);
    assert.equal(summary.netProfit, -339);
  });
});

describe("acao social basket assembly & anti-duplication", () => {
  it("deducts supplies on assembly and detects shortages", () => {
    const data = createSeedSocialData("2026-11-18");
    const okRes = assembleSocialBaskets(data, 5, "Diacono Teste", "2026-11-18");
    assert.equal(okRes.ok, true);
    if (okRes.ok) {
      assert.equal(okRes.nextData.basketStock, 17);
      const arroz = okRes.nextData.supplies.find((s) => s.id === "sup-arroz");
      const feijao = okRes.nextData.supplies.find((s) => s.id === "sup-feijao");
      assert.equal(arroz?.stockQty, 21); // 26 - 5*1
      assert.equal(feijao?.stockQty, 28); // 38 - 5*2
    }

    const tooMany = assembleSocialBaskets(data, 50);
    assert.equal(tooMany.ok, false);
  });

  it("prevents duplicate delivery to same family in the same month", () => {
    const data = createSeedSocialData("2026-11-18");
    // fam-1 already received in 2026-11
    const dupCheck = validateSocialDelivery(data, "fam-1", "2026-11-25", 1, false);
    assert.equal(dupCheck.ok, false);

    // Override by Admin allowed
    const overrideCheck = validateSocialDelivery(data, "fam-1", "2026-11-25", 1, true);
    assert.equal(overrideCheck.ok, true);

    // Next month allowed cleanly
    const nextMonthCheck = validateSocialDelivery(data, "fam-1", "2026-12-05", 1, false);
    assert.equal(nextMonthCheck.ok, true);

    // fam-2 allowed in same month
    const fam2Check = validateSocialDelivery(data, "fam-2", "2026-11-25", 1, false);
    assert.equal(fam2Check.ok, true);
  });
});

describe("portal do membro & pix receipt parser (zero file storage)", () => {
  it("extracts valid Nubank and Itau receipts and flags divergent CNPJ", () => {
    const seed = createSeedMembroData("2026-11-18");
    const nubankPreset = SAMPLE_PIX_PRESETS.find((p) => p.id === "nubank");
    const itauPreset = SAMPLE_PIX_PRESETS.find((p) => p.id === "itau");
    const invalidPreset = SAMPLE_PIX_PRESETS.find((p) => p.id === "terceiro_invalido");
    assert.ok(nubankPreset && itauPreset && invalidPreset);

    const parsedNubank = parsePixReceiptText(nubankPreset.rawText, seed.churchPixConfig);
    assert.equal(parsedNubank.amount, 350);
    assert.equal(parsedNubank.e2eCode, "E18236120202611181732NUBK004291");
    assert.equal(parsedNubank.bankOrigin, "Nubank");
    assert.equal(parsedNubank.verificationStatus, "verificado");

    const parsedItau = parsePixReceiptText(itauPreset.rawText, seed.churchPixConfig);
    assert.equal(parsedItau.amount, 480);
    assert.equal(parsedItau.e2eCode, "E60701190202611180945ITAU883120");
    assert.equal(parsedItau.bankOrigin, "Itaú");
    assert.equal(parsedItau.verificationStatus, "verificado");

    const parsedInvalid = parsePixReceiptText(invalidPreset.rawText, seed.churchPixConfig);
    assert.equal(parsedInvalid.amount, 150);
    assert.equal(parsedInvalid.verificationStatus, "divergente");

    const incomplete = parsePixReceiptText("Comprovante sem valor e sem codigo", seed.churchPixConfig);
    assert.equal(incomplete.verificationStatus, "incompleto");
  });

  it("builds 12-month annual timeline and generates sequential receipt numbers", () => {
    const seed = createSeedMembroData("2026-11-18");
    const gabrielTimeline = buildMemberAnnualTimeline(seed.tithes, "mem-gabriel", 2026);
    assert.equal(gabrielTimeline.length, 12);
    assert.equal(gabrielTimeline[0].shortLabel, "Jan");
    assert.equal(gabrielTimeline[0].status, "conciliado");
    assert.equal(gabrielTimeline[4].competenceMonth, "2026-05");
    assert.equal(gabrielTimeline[4].status, "em_aberto");
    assert.equal(gabrielTimeline[10].competenceMonth, "2026-11");
    assert.equal(gabrielTimeline[10].status, "em_aberto");

    const mariaTimeline = buildMemberAnnualTimeline(seed.tithes, "mem-maria", 2026);
    assert.equal(mariaTimeline[10].competenceMonth, "2026-11");
    assert.equal(mariaTimeline[10].status, "aguardando_conferencia");

    const nextNum = nextTitheReceiptNumber(seed.tithes, 2026);
    assert.equal(nextNum, "DZ-2026-0201");
  });

  it("renders dynamic printable receipt with escaped HTML and offline SVG QR", () => {
    const seed = createSeedMembroData("2026-11-18");
    const sampleTithe = seed.tithes[1];
    const html = buildPrintableTitheReceiptHtml(
      { ...sampleTithe, memberName: `<script>alert("xss")</script>Gabriel` },
      { ...seed.churchPixConfig, churchName: `Igreja & <Sede>` },
      "Classe Bereia"
    );
    assert.equal(html.includes("<script>"), false);
    assert.equal(html.includes("&lt;script&gt;"), true);
    assert.equal(html.includes("Igreja &amp; &lt;Sede&gt;"), true);
    assert.equal(html.includes("<svg "), true);
    assert.equal(html.includes("https://"), false);
  });

  it("reconstructs PDF positioned text items and parses multi-line Skia/Nubank receipts", () => {
    const pdfLines = reconstructPdfPageLines([
      { str: "R$ 425,00", x: 180, y: 700 },
      { str: "Valor:", x: 40, y: 701 },
      { str: "Comprovante de transferência Pix", x: 40, y: 760 },
    ]);
    assert.equal(
      pdfLines,
      "Comprovante de transferência Pix\nValor: R$ 425,00"
    );

    const seed = createSeedMembroData("2026-11-18");
    const realStyleNubank = [
      "Comprovante de transferência",
      "18 NOV 2026 - 14:32:10",
      "Valor",
      "R$ 275,50",
      "Destino",
      "Nome Assembleia de Deus Ministério Madureira",
      "CPF/CNPJ ••.345.678/0001-••",
      "Instituição Banco Cora SCD",
      "Origem",
      "Nome Gabriel Nogueira da Silva",
      "Instituição NU PAGAMENTOS - IP",
      "ID da transação:",
      "E18236120202611181732",
      "SKIA009911",
    ].join("\n");

    const parsed = parsePixReceiptText(realStyleNubank, seed.churchPixConfig);
    assert.equal(parsed.amount, 275.5);
    assert.equal(parsed.paidAtIso, "2026-11-18 14:32");
    assert.equal(parsed.e2eCode, "E18236120202611181732SKIA009911");
    assert.equal(parsed.bankOrigin, "Nubank");
    assert.equal(parsed.recipientName, "Assembleia de Deus Ministério Madureira");
    assert.equal(parsed.payerName, "Gabriel Nogueira da Silva");
    assert.equal(parsed.verificationStatus, "verificado");

    // Raw binary PDF guard
    const rawPdfGuard = parsePixReceiptText("%PDF-1.4\n1 0 obj", seed.churchPixConfig);
    assert.equal(rawPdfGuard.amount, null);
    assert.equal(rawPdfGuard.verificationStatus, "incompleto");
  });
});
