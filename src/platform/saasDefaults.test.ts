import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDueDateForCompetence,
  buildPrintableContractHtml,
  calculateTieredPrice,
  computeInvoiceState,
  DEFAULT_BILLING_CONFIG,
  DEFAULT_CONTRACT_CLAUSES,
  DEFAULT_PRICING_TIERS,
  getContractDelinquencySummary,
  renderClauseTemplate,
} from "./saasDefaults";
import type { ContractInvoice, PlatformContract } from "./types";

describe("saasDefaults pricing tiers", () => {
  it("calculates per-church unit pricing across all 4 tiers", () => {
    const t1 = calculateTieredPrice("igreja", 10, DEFAULT_PRICING_TIERS);
    assert.equal(t1.unitPrice, 99.9);
    assert.equal(t1.totalMonthly, 999);

    const t2 = calculateTieredPrice("igreja", 15, DEFAULT_PRICING_TIERS);
    assert.equal(t2.unitPrice, 89.9);
    assert.equal(t2.totalMonthly, 1348.5);
    assert.equal(t2.savingsPerUnit, 10);

    const t3 = calculateTieredPrice("igreja", 35, DEFAULT_PRICING_TIERS);
    assert.equal(t3.unitPrice, 79.9);
    assert.equal(t3.totalMonthly, 2796.5);

    const t4 = calculateTieredPrice("igreja", 60, DEFAULT_PRICING_TIERS);
    assert.equal(t4.unitPrice, 69.9);
    assert.equal(t4.totalMonthly, 4194);
  });
});

describe("saasDefaults billing & delinquency", () => {
  it("clamps invalid day-of-month dates properly", () => {
    assert.equal(buildDueDateForCompetence("2026-02", 31), "2026-02-28");
    assert.equal(buildDueDateForCompetence("2024-02", 31), "2024-02-29");
    assert.equal(buildDueDateForCompetence("2026-11", 5), "2026-11-05");
  });

  it("computes invoice state and suggests suspension past grace period", () => {
    const overdueInv: ContractInvoice = {
      id: "inv-1",
      competence: "2026-10",
      dueDate: "2026-10-10",
      amount: 1348.5,
      status: "pendente",
      provider: "asaas",
      createdAt: "2026-10-01",
    };
    const dueSoonInv: ContractInvoice = {
      id: "inv-2",
      competence: "2026-11",
      dueDate: "2026-11-20",
      amount: 1348.5,
      status: "pendente",
      provider: "nubank_boleto",
      createdAt: "2026-11-01",
    };

    const st1 = computeInvoiceState(overdueInv, "2026-11-17");
    assert.equal(st1.effectiveStatus, "em_atraso");
    assert.equal(st1.daysOverdue, 38);

    const st2 = computeInvoiceState(dueSoonInv, "2026-11-17");
    assert.equal(st2.effectiveStatus, "a_vencer");
    assert.equal(st2.daysUntilDue, 3);

    const sampleContract: PlatformContract = {
      id: "ctr-sample",
      code: "CTR-010",
      clientName: "AD Central",
      segment: "igreja",
      status: "ativo",
      activeModules: ["igreja_ebd", "igreja_tesouraria"],
      codeFolder: "src/contracts/ctr-sample",
      entryPath: "/c/ctr-sample",
      unitsCount: 15,
      monthlyValue: 1348.5,
      authSource: "supabase",
      createdAt: "2026-01-10",
      invoices: [overdueInv, dueSoonInv],
    };

    const summary = getContractDelinquencySummary(sampleContract, "2026-11-17", 15);
    assert.equal(summary.status, "inadimplente");
    assert.equal(summary.overdueCount, 1);
    assert.equal(summary.dueSoonCount, 1);
    assert.equal(summary.maxDaysOverdue, 38);
    assert.equal(summary.shouldSuggestSuspension, true);
  });
});

describe("saasDefaults contract template & HTML escaping", () => {
  it("renders dynamic tags and escapes unsafe HTML", () => {
    const sampleContract: PlatformContract = {
      id: "ctr-xss",
      code: "CTR-099",
      clientName: "Igreja <script>alert(1)</script>",
      legalName: "Igreja <script>alert(1)</script>",
      documentNumber: "12.345.678/0001-99",
      segment: "igreja",
      status: "ativo",
      activeModules: ["igreja_ebd", "igreja_secretaria"],
      codeFolder: "src/contracts/ctr-xss",
      entryPath: "/c/ctr-xss",
      unitsCount: 15,
      billingDueDay: 10,
      monthlyValue: 1348.5,
      authSource: "supabase",
      createdAt: "2026-11-01",
    };

    const text = renderClauseTemplate(
      DEFAULT_CONTRACT_CLAUSES[2].body,
      sampleContract,
      DEFAULT_PRICING_TIERS,
      DEFAULT_BILLING_CONFIG
    );
    assert.match(text, /Faixa 2 — Expansão/);
    assert.match(text, /15 igrejas × R\$\s*89,90/);
    assert.match(text, /todo dia 10/);

    const html = buildPrintableContractHtml(
      sampleContract,
      DEFAULT_CONTRACT_CLAUSES,
      DEFAULT_PRICING_TIERS,
      DEFAULT_BILLING_CONFIG
    );
    assert.equal(html.includes("<script>alert(1)</script>"), false);
    assert.equal(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), true);
  });
});
