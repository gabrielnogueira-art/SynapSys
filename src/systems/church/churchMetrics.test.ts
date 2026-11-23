import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTreasuryClosingReportHtml,
  buildTreasuryCsv,
  computeAgeAtDate,
  computeSecretariatDashboardMetrics,
  computeTreasuryReports,
  findMemberByMatriculaInput,
  resolveEffectiveCongregation,
  suggestAccountPlanForRole,
} from "./churchMetrics";

describe("resolveEffectiveCongregation priority", () => {
  it("prioritizes logged user congregation over configured default and falls back cleanly", () => {
    assert.deepEqual(
      resolveEffectiveCongregation({
        sessionCongregation: "Congregação Venda Nova",
        accessCongregation: "Igreja Sede",
        configuredDefault: "Congregação Centro",
      }),
      { congregation: "Congregação Venda Nova", source: "usuario" }
    );

    assert.deepEqual(
      resolveEffectiveCongregation({
        sessionCongregation: null,
        accessCongregation: "Congregação Guarus",
        configuredDefault: "Igreja Sede",
      }),
      { congregation: "Congregação Guarus", source: "usuario" }
    );

    assert.deepEqual(
      resolveEffectiveCongregation({
        sessionCongregation: null,
        accessCongregation: null,
        configuredDefault: "Congregação Bairro Novo",
      }),
      { congregation: "Congregação Bairro Novo", source: "predefinicao" }
    );

    assert.deepEqual(resolveEffectiveCongregation({}), {
      congregation: "Igreja Sede",
      source: "padrao",
    });
  });
});

describe("matricula lookup & plano de contas suggestion", () => {
  const sampleMembers = [
    { id: "m1", matricula: 3686, name: "Gabriel Nogueira", role: "Diácono", congregation: "Igreja Sede" },
    { id: "m2", matricula: 3687, name: "Maria Costa", role: "Membro", congregation: "Congregação Centro" },
    { id: "m3", matricula: 10, name: "Pr. Paulo", role: "Pastor", congregation: "Igreja Sede" },
  ];

  it("finds member by matricula ignoring # and spaces", () => {
    assert.equal(findMemberByMatriculaInput(sampleMembers, "#3686")?.id, "m1");
    assert.equal(findMemberByMatriculaInput(sampleMembers, " 3687 ")?.id, "m2");
    assert.equal(findMemberByMatriculaInput(sampleMembers, "abc"), undefined);
  });

  it("suggests Plano de Contas for tithes without overriding explicit offerings", () => {
    const plans = [
      "01.010 - Dízimo de Membros",
      "01.015 - Dízimo de Obreiros",
      "01.020 - Dízimo de Pastor",
      "02.001 - Oferta Geral",
    ];
    assert.equal(
      suggestAccountPlanForRole("Diácono", "01.010 - Dízimo de Membros", plans),
      "01.015 - Dízimo de Obreiros"
    );
    assert.equal(
      suggestAccountPlanForRole("Pastor", "01.010 - Dízimo de Membros", plans),
      "01.020 - Dízimo de Pastor"
    );
    assert.equal(
      suggestAccountPlanForRole("Membro", "01.015 - Dízimo de Obreiros", plans),
      "01.010 - Dízimo de Membros"
    );
    // Does not overwrite if treasurer selected an offering
    assert.equal(
      suggestAccountPlanForRole("Diácono", "02.001 - Oferta Geral", plans),
      null
    );
  });
});

describe("computeSecretariatDashboardMetrics", () => {
  it("computes birthdays (day/week/month), gender split, age brackets, roles and top professions", () => {
    const refDate = new Date(2026, 10, 22); // 2026-11-22 (month 11)
    assert.equal(computeAgeAtDate("2018-11-22", refDate), 8);
    assert.equal(computeAgeAtDate("2000-12-01", refDate), 25);

    const members = [
      {
        id: "1",
        matricula: 1,
        name: "Ana Clara",
        role: "Membro",
        congregation: "Igreja Sede",
        status: "Ativo",
        phone: "111",
        birthDate: "2018-11-22", // today birthday, age 8 (Crianca)
        gender: "F" as const,
        profession: "Estudante",
        createdAt: "2026-11-22T10:00:00Z",
      },
      {
        id: "2",
        matricula: 2,
        name: "Lucas Souza",
        role: "Diácono",
        congregation: "Igreja Sede",
        status: "Ativo",
        phone: "222",
        birthDate: "1998-11-25", // +3 days -> week + month, age 27 (Jovens + Adultos)
        gender: "M" as const,
        profession: "Estudante",
        createdAt: "2026-11-21T10:00:00Z",
      },
      {
        id: "3",
        matricula: 3,
        name: "Marta Silva",
        role: "Missionário(a)",
        congregation: "Venda Nova",
        status: "Ativo",
        phone: "333",
        birthDate: "1960-11-05", // same month earlier -> month only, age 66 (Idosos)
        gender: "F" as const,
        profession: "Do Lar",
        createdAt: "2026-11-20T10:00:00Z",
      },
      {
        id: "4",
        matricula: 4,
        name: "Ex Membro",
        role: "Membro",
        congregation: "Igreja Sede",
        status: "Transferido",
        phone: "444",
        birthDate: "1990-11-22",
        gender: "M" as const,
        profession: "Médico",
        createdAt: "2026-11-19T10:00:00Z",
      },
    ];

    const metrics = computeSecretariatDashboardMetrics(
      members,
      [{ id: "u1", name: "Igreja Sede", status: "Ativa" }],
      refDate
    );

    assert.equal(metrics.totalMembers, 4);
    assert.equal(metrics.activeCount, 3);
    assert.equal(metrics.inactiveCount, 1);
    assert.equal(metrics.maleCount, 1);
    assert.equal(metrics.femaleCount, 2);
    assert.equal(metrics.birthdaysToday.length, 1);
    assert.equal(metrics.birthdaysWeek.length, 2);
    assert.equal(metrics.birthdaysMonth.length, 3);

    const criancas = metrics.ageBrackets.find((b) => b.id === "criancas");
    assert.equal(criancas?.femaleCount, 1);
    assert.equal(criancas?.femalePct, 100);
    assert.equal(metrics.topProfessions[0]?.label, "Estudante");
    assert.equal(metrics.topProfessions[0]?.count, 2);
    assert.equal(metrics.roleDistribution.length, 3);
    assert.equal(metrics.latestRegistrations[0]?.id, "1");
  });
});

describe("computeTreasuryReports & export helpers", () => {
  it("groups entries by method, account plan and congregation and builds safe printable/CSV outputs", () => {
    const entries = [
      {
        id: "t1",
        receiptNumber: "REC-0001",
        date: "2026-11-22",
        referenceMonth: "2026-11",
        type: "entrada" as const,
        category: "01.015 - Dízimo de Obreiros",
        department: "1 - Tesouraria",
        bankAccount: "Caixa",
        paymentMethod: "Dinheiro",
        contributorName: "Dc. Carlos",
        congregation: "Igreja Sede",
        description: "Dízimo",
        amount: 350,
      },
      {
        id: "t2",
        receiptNumber: "REC-0002",
        date: "2026-11-22",
        referenceMonth: "2026-11",
        type: "entrada" as const,
        category: "01.010 - Dízimo de Membros",
        department: "1 - Tesouraria",
        bankAccount: "Banco Inter",
        paymentMethod: "PIX",
        contributorName: "Maria",
        congregation: "Congregação Beta",
        description: "Dízimo",
        amount: 200,
      },
      {
        id: "t3",
        receiptNumber: "REC-0003",
        date: "2026-11-22",
        type: "saida" as const,
        category: "Energia",
        department: "1 - Tesouraria",
        bankAccount: "Caixa",
        paymentMethod: "Dinheiro",
        congregation: "Igreja Sede",
        description: "Conta de Luz",
        amount: 100,
      },
    ];

    const rep = computeTreasuryReports(entries);
    assert.equal(rep.totalIncome, 550);
    assert.equal(rep.totalExpense, 100);
    assert.equal(rep.netBalance, 450);
    assert.equal(rep.byCongregation.length, 2);

    const html = buildTreasuryClosingReportHtml({
      churchName: "AD Madureira <Sede>",
      periodLabel: "11/2026",
      congregationLabel: "Todas",
      generatedBy: "Tesoureiro",
      summary: rep,
    });
    assert.equal(html.includes("&lt;Sede&gt;"), true);
    assert.equal(html.includes("01.015 - Dízimo de Obreiros"), true);

    const csv = buildTreasuryCsv(entries);
    assert.equal(csv.includes('"REC-0001"'), true);
    assert.equal(csv.includes("350,00"), true);
  });
});
