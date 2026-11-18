import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getModulesBySegment, getOfficialCatalogModules } from "../catalog";
import {
  assembleSocialBaskets,
  computeCantinaEventSummary,
  computeLivrariaSummary,
  createSeedCantinaData,
  createSeedLivrariaData,
  createSeedSocialData,
  DEFAULT_LAB_PROMOTIONS,
  validateSocialDelivery,
} from "./labsDefaults";

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
