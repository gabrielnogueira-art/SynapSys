import type { LabModuleId } from "../types";
import type {
  CantinaData,
  CantinaEvent,
  CantinaItem,
  CantinaSale,
  DigitalTitheRecord,
  LabPromotionsMap,
  LabRoleMode,
  LabsSandboxState,
  LivrariaData,
  MembroPortalData,
  SocialData,
  SocialDelivery,
} from "./labsTypes";
import { roundCurrency, todayIsoDate } from "../saasDefaults";

export const DEFAULT_LAB_PROMOTIONS: LabPromotionsMap = {
  igreja_cantina: {
    moduleId: "igreja_cantina",
    stage: "em_incubacao",
    promotedToCatalog: false,
    commercialModel: "addon",
    addonMonthlyPrice: 49.9,
    notes: "Controle de produção por culto/evento, PDV rápido e fechamento de caixa com sobras/quebras.",
  },
  igreja_livraria: {
    moduleId: "igreja_livraria",
    stage: "em_incubacao",
    promotedToCatalog: false,
    commercialModel: "addon",
    addonMonthlyPrice: 59.9,
    notes: "Revistas EBD por trimestre/faixa etária, livros com estoque mínimo e camisetas de congressos.",
  },
  igreja_social: {
    moduleId: "igreja_social",
    stage: "em_incubacao",
    promotedToCatalog: false,
    commercialModel: "pacote_padrao",
    addonMonthlyPrice: 39.9,
    notes: "Campanhas de alimentos, montagem automática de cestas e entregas com trava mensal por família.",
  },
  igreja_membro: {
    moduleId: "igreja_membro",
    stage: "em_incubacao",
    promotedToCatalog: false,
    commercialModel: "pacote_padrao",
    addonMonthlyPrice: 49.9,
    notes: "Área do Membro + Carteirinha integrada Secretaria/EBD + Leitor PIX + Recibo sob demanda (Zero File Storage).",
  },
};

export function createEmptyCantinaData(): CantinaData {
  return { events: [], items: [], sales: [] };
}

export function createEmptyLivrariaData(): LivrariaData {
  return { products: [], sales: [], expenses: [] };
}

export function createEmptyMembroData(): MembroPortalData {
  return {
    churchPixConfig: {
      churchName: "Assembleia de Deus Ministério Madureira",
      churchCnpj: "",
      pixKey: "",
      pixKeyType: "cnpj",
      bankName: "Banco Cora / Nubank PJ",
    },
    members: [],
    activeMemberId: "",
    tithes: [],
  };
}

export function createSeedMembroData(today = todayIsoDate()): MembroPortalData {
  const year = today.slice(0, 4);
  const currentMonth = Number(today.slice(5, 7)) || 11;
  const seedMonths = [1, 2, 3, 4, 6, 8, 9].filter((m) => m < currentMonth);

  const tithes: DigitalTitheRecord[] = seedMonths.map((m, idx) => {
    const mm = String(m).padStart(2, "0");
    return {
      id: `dz-seed-${m}`,
      receiptNumber: `DZ-${year}-${String(101 + idx).padStart(4, "0")}`,
      memberId: "mem-gabriel",
      matricula: "3686",
      memberName: "Gabriel Nogueira da Silva",
      memberRole: "Obreiro / Diácono",
      congregation: "Igreja Sede",
      competenceMonth: `${year}-${mm}`,
      amount: m % 2 === 0 ? 350 : 320,
      paidAtIso: `${year}-${mm}-08 19:40`,
      paymentMethod: "PIX",
      e2eCode: `E18236120${year}${mm}081940SEED${100 + idx}`,
      bankOrigin: idx % 2 === 0 ? "Nubank" : "Itaú",
      verifiedRecipient: true,
      status: "conciliado",
      reconciledBy: "Tesouraria Sede",
      reconciledAt: `${year}-${mm}-09`,
      createdAt: `${year}-${mm}-08`,
    };
  });

  if (currentMonth > 10) {
    tithes.unshift({
      id: "dz-seed-pend",
      receiptNumber: `DZ-${year}-0199`,
      memberId: "mem-maria",
      matricula: "3687",
      memberName: "Maria Oliveira Costa",
      memberRole: "Membro",
      congregation: "Igreja Sede",
      competenceMonth: `${year}-${String(currentMonth).padStart(2, "0")}`,
      amount: 480,
      paidAtIso: `${today} 09:45`,
      paymentMethod: "PIX",
      e2eCode: `E60701190${year}${String(currentMonth).padStart(2, "0")}180945ITAU883120`,
      bankOrigin: "Itaú",
      verifiedRecipient: true,
      status: "aguardando_conferencia",
      createdAt: today,
    });
  }

  return {
    churchPixConfig: {
      churchName: "Assembleia de Deus Ministério Madureira",
      churchCnpj: "12.345.678/0001-90",
      pixKey: "12.345.678/0001-90",
      pixKeyType: "cnpj",
      bankName: "Banco Cora / Nubank PJ",
    },
    activeMemberId: "mem-gabriel",
    members: [
      {
        id: "mem-gabriel",
        matricula: "3686",
        fullName: "Gabriel Nogueira da Silva",
        cpfMasked: "***.458.912-**",
        birthDate: "1996-05-14",
        baptismDate: "2012-10-21",
        address: "Rua das Palmeiras, 240 — Centro",
        phone: "(21) 99812-3686",
        email: "gabriel.membro@igreja.org",
        ecclesiasticalRole: "Obreiro / Diácono",
        congregation: "Igreja Sede",
        maritalStatus: "Casado(a)",
        spouseName: "Ana Paula Nogueira (#3685)",
        ebdClassName: "Adultos — Classe Bereia",
        ebdTeachers: "Pr. Marcos Oliveira & Pb. Lucas Souza",
        ebdAttendanceSummary: "10 presenças nos últimos 12 domingos (83%)",
      },
      {
        id: "mem-maria",
        matricula: "3687",
        fullName: "Maria Oliveira Costa",
        cpfMasked: "***.721.304-**",
        birthDate: "1989-11-02",
        baptismDate: "2008-04-13",
        address: "Av. Central, 1105 — Vila Nova",
        phone: "(21) 98845-3687",
        email: "maria.costa@igreja.org",
        ecclesiasticalRole: "Membro",
        congregation: "Igreja Sede",
        maritalStatus: "Casado(a)",
        spouseName: "João Batista Costa (#3688)",
        ebdClassName: "Jovens & Casais — Classe Efésios",
        ebdTeachers: "Dc. Fernanda Lima",
        ebdAttendanceSummary: "11 presenças nos últimos 12 domingos (92%)",
      },
    ],
    tithes,
  };
}

export function createEmptySocialData(): SocialData {
  return {
    basketStock: 0,
    supplies: [],
    basketRecipe: [],
    donations: [],
    assemblies: [],
    families: [],
    deliveries: [],
  };
}

export function createSeedCantinaData(today = todayIsoDate()): CantinaData {
  return {
    events: [
      {
        id: "evt-culto-domingo",
        name: "Culto de Domingo — Cantina Sede",
        date: today,
        status: "aberto",
        initialCash: 100,
        notes: "Turno noite + encerramento da EBD.",
      },
    ],
    items: [
      {
        id: "cnt-salgado",
        eventId: "evt-culto-domingo",
        name: "Salgado Assado / Coxinha",
        category: "salgado",
        unitPrice: 7.0,
        unitCost: 3.1,
        producedQty: 80,
        leftoverQty: 0,
        wasteQty: 0,
      },
      {
        id: "cnt-refri",
        eventId: "evt-culto-domingo",
        name: "Refrigerante Lata 350ml",
        category: "bebida",
        unitPrice: 6.0,
        unitCost: 2.9,
        producedQty: 40,
        leftoverQty: 0,
        wasteQty: 0,
      },
      {
        id: "cnt-bolo",
        eventId: "evt-culto-domingo",
        name: "Bolo Caseiro (Fatia)",
        category: "doce",
        unitPrice: 8.0,
        unitCost: 2.5,
        producedQty: 30,
        leftoverQty: 0,
        wasteQty: 0,
      },
    ],
    sales: [
      {
        id: "csale-1",
        eventId: "evt-culto-domingo",
        createdAt: `${today}T19:15:00`,
        items: [
          { itemId: "cnt-salgado", name: "Salgado Assado / Coxinha", qty: 4, unitPrice: 7.0 },
          { itemId: "cnt-refri", name: "Refrigerante Lata 350ml", qty: 3, unitPrice: 6.0 },
        ],
        total: 46.0,
        paymentMethod: "pix",
        buyerName: "Equipe Louvor",
      },
      {
        id: "csale-2",
        eventId: "evt-culto-domingo",
        createdAt: `${today}T20:05:00`,
        items: [
          { itemId: "cnt-bolo", name: "Bolo Caseiro (Fatia)", qty: 5, unitPrice: 8.0 },
          { itemId: "cnt-salgado", name: "Salgado Assado / Coxinha", qty: 6, unitPrice: 7.0 },
        ],
        total: 82.0,
        paymentMethod: "dinheiro",
      },
    ],
  };
}

export function createSeedLivrariaData(today = todayIsoDate()): LivrariaData {
  return {
    products: [
      {
        id: "liv-rev-adultos-aluno",
        name: "Revista EBD Adultos — Lições Bíblicas",
        category: "revista_ebd",
        trimester: "4º Trimestre 2026",
        ageGroup: "Adultos",
        audience: "aluno",
        stockQty: 48,
        minStockAlert: 10,
        costPrice: 9.5,
        salePrice: 16.0,
      },
      {
        id: "liv-rev-adultos-prof",
        name: "Revista EBD Adultos — Mestre",
        category: "revista_ebd",
        trimester: "4º Trimestre 2026",
        ageGroup: "Adultos",
        audience: "professor",
        stockQty: 4,
        minStockAlert: 5,
        costPrice: 12.5,
        salePrice: 20.0,
      },
      {
        id: "liv-rev-jovens",
        name: "Revista EBD Jovens Conectados",
        category: "revista_ebd",
        trimester: "4º Trimestre 2026",
        ageGroup: "Jovens",
        audience: "aluno",
        stockQty: 22,
        minStockAlert: 5,
        costPrice: 9.0,
        salePrice: 15.0,
      },
      {
        id: "liv-biblia-estudo",
        name: "Bíblia de Estudo Aplicação Pessoal",
        category: "livro_biblia",
        stockQty: 3,
        minStockAlert: 5,
        costPrice: 78.0,
        salePrice: 129.9,
      },
      {
        id: "liv-camiseta-congresso-m",
        name: "Camiseta Congresso de Jovens 2026",
        category: "vestuario",
        size: "M",
        stockQty: 14,
        minStockAlert: 5,
        costPrice: 24.0,
        salePrice: 45.0,
      },
      {
        id: "liv-camiseta-congresso-g",
        name: "Camiseta Congresso de Jovens 2026",
        category: "vestuario",
        size: "G",
        stockQty: 4,
        minStockAlert: 5,
        costPrice: 24.0,
        salePrice: 45.0,
      },
    ],
    sales: [
      {
        id: "lsale-1",
        createdAt: `${today}T10:15:00`,
        productId: "liv-rev-adultos-aluno",
        productName: "Revista EBD Adultos — Lições Bíblicas",
        qty: 6,
        unitCost: 9.5,
        unitPrice: 16.0,
        total: 96.0,
        paymentMethod: "pix",
        paymentStatus: "pago",
        deliveryStatus: "entregue",
        customerName: "Classe Bereia",
      },
      {
        id: "lsale-2",
        createdAt: `${today}T11:30:00`,
        productId: "liv-camiseta-congresso-g",
        productName: "Camiseta Congresso de Jovens 2026 (G)",
        qty: 2,
        unitCost: 24.0,
        unitPrice: 45.0,
        total: 90.0,
        paymentMethod: "cartao",
        paymentStatus: "pago",
        deliveryStatus: "pendente",
        customerName: "Gabriel & Lucas",
        notes: "Retirar na secretaria domingo.",
      },
    ],
    expenses: [
      {
        id: "lexp-1",
        date: today,
        description: "Pedido trimestral de revistas EBD",
        supplier: "Editora CPAD",
        category: "editora",
        amount: 420.0,
      },
    ],
  };
}

export function createSeedSocialData(today = todayIsoDate()): SocialData {
  const month = today.slice(0, 7);
  return {
    basketStock: 12,
    supplies: [
      { id: "sup-arroz", name: "Arroz 5kg", unit: "unid", stockQty: 26, minStockAlert: 10 },
      { id: "sup-feijao", name: "Feijão Carioca 1kg", unit: "kg", stockQty: 38, minStockAlert: 15 },
      { id: "sup-oleo", name: "Óleo de Soja 900ml", unit: "unid", stockQty: 19, minStockAlert: 8 },
      { id: "sup-acucar", name: "Açúcar 2kg", unit: "unid", stockQty: 15, minStockAlert: 6 },
      { id: "sup-macarrao", name: "Macarrão 500g", unit: "unid", stockQty: 30, minStockAlert: 10 },
    ],
    basketRecipe: [
      { supplyId: "sup-arroz", supplyName: "Arroz 5kg", qtyPerBasket: 1, unit: "unid" },
      { supplyId: "sup-feijao", supplyName: "Feijão Carioca 1kg", qtyPerBasket: 2, unit: "kg" },
      { supplyId: "sup-oleo", supplyName: "Óleo de Soja 900ml", qtyPerBasket: 1, unit: "unid" },
      { supplyId: "sup-acucar", supplyName: "Açúcar 2kg", qtyPerBasket: 1, unit: "unid" },
      { supplyId: "sup-macarrao", supplyName: "Macarrão 500g", qtyPerBasket: 2, unit: "unid" },
    ],
    donations: [
      {
        id: "don-1",
        date: today,
        campaign: "Culto das Primícias",
        donorName: "Congregação Sede",
        items: [
          { supplyId: "sup-arroz", supplyName: "Arroz 5kg", qty: 18, unit: "unid" },
          { supplyId: "sup-feijao", supplyName: "Feijão Carioca 1kg", qty: 24, unit: "kg" },
        ],
        directBasketsQty: 4,
        notes: "Arrecadação especial do domingo.",
      },
    ],
    assemblies: [
      {
        id: "asm-1",
        date: today,
        basketsAssembled: 8,
        operatorName: "Diácono João",
      },
    ],
    families: [
      {
        id: "fam-1",
        headName: "Dona Maria Aparecida",
        contact: "(21) 98888-1020",
        neighborhood: "Vila Nova",
        dependentsCount: 4,
        active: true,
        notes: "Acompanhamento mensal contínuo.",
      },
      {
        id: "fam-2",
        headName: "Carlos Eduardo Ferreira",
        contact: "(21) 97777-3040",
        neighborhood: "Centro",
        dependentsCount: 3,
        active: true,
      },
    ],
    deliveries: [
      {
        id: "del-1",
        date: today,
        competenceMonth: month,
        familyId: "fam-1",
        familyName: "Dona Maria Aparecida",
        basketsQty: 1,
        campaignTag: "Entrega Regular",
        deliveredBy: "Diácono João",
      },
    ],
  };
}

export function createSeedLabsSandbox(today = todayIsoDate()): LabsSandboxState {
  return {
    activeModule: "igreja_cantina",
    roleMode: "admin",
    cantina: createSeedCantinaData(today),
    livraria: createSeedLivrariaData(today),
    social: createSeedSocialData(today),
    membro: createSeedMembroData(today),
    updatedAt: new Date().toISOString(),
  };
}

export function clearLabsTransactionsOnly(state: LabsSandboxState): LabsSandboxState {
  return {
    ...state,
    cantina: {
      ...state.cantina,
      events: state.cantina.events.map((e) => ({ ...e, status: "aberto", countedCash: undefined })),
      items: state.cantina.items.map((i) => ({ ...i, leftoverQty: 0, wasteQty: 0 })),
      sales: [],
    },
    livraria: {
      ...state.livraria,
      sales: [],
      expenses: [],
    },
    social: {
      ...state.social,
      donations: [],
      assemblies: [],
      deliveries: [],
    },
    membro: {
      ...state.membro,
      tithes: [],
    },
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeLabPromotions(raw: unknown): LabPromotionsMap {
  if (!raw || typeof raw !== "object") return DEFAULT_LAB_PROMOTIONS;
  const src = raw as Record<string, unknown>;
  const normalizeOne = (id: LabModuleId) => {
    const def = DEFAULT_LAB_PROMOTIONS[id];
    const item = src[id];
    if (!item || typeof item !== "object") return def;
    const r = item as Record<string, unknown>;
    const stage =
      r.stage === "em_aprovacao" || r.stage === "promovido" ? r.stage : "em_incubacao";
    const model = r.commercialModel === "pacote_padrao" ? "pacote_padrao" : "addon";
    return {
      moduleId: id,
      stage,
      promotedToCatalog: Boolean(r.promotedToCatalog),
      commercialModel: model,
      addonMonthlyPrice: Math.max(0, roundCurrency(Number(r.addonMonthlyPrice ?? def.addonMonthlyPrice))),
      notes: typeof r.notes === "string" ? r.notes : def.notes,
      promotedAt: typeof r.promotedAt === "string" ? r.promotedAt : undefined,
    };
  };
  return {
    igreja_cantina: normalizeOne("igreja_cantina"),
    igreja_livraria: normalizeOne("igreja_livraria"),
    igreja_social: normalizeOne("igreja_social"),
    igreja_membro: normalizeOne("igreja_membro"),
  };
}

export function normalizeLabsSandboxState(raw: unknown): LabsSandboxState {
  const seed = createSeedLabsSandbox();
  if (!raw || typeof raw !== "object") return seed;
  const r = raw as Record<string, unknown>;
  const activeModule: LabModuleId =
    r.activeModule === "igreja_livraria" ||
    r.activeModule === "igreja_social" ||
    r.activeModule === "igreja_membro"
      ? r.activeModule
      : "igreja_cantina";
  const roleMode: LabRoleMode =
    r.roleMode === "operador" || r.roleMode === "voluntario" ? r.roleMode : "admin";
  return {
    activeModule,
    roleMode,
    cantina:
      r.cantina && typeof r.cantina === "object"
        ? {
            events: Array.isArray((r.cantina as CantinaData).events)
              ? (r.cantina as CantinaData).events
              : seed.cantina.events,
            items: Array.isArray((r.cantina as CantinaData).items)
              ? (r.cantina as CantinaData).items
              : seed.cantina.items,
            sales: Array.isArray((r.cantina as CantinaData).sales)
              ? (r.cantina as CantinaData).sales
              : seed.cantina.sales,
          }
        : seed.cantina,
    livraria:
      r.livraria && typeof r.livraria === "object"
        ? {
            products: Array.isArray((r.livraria as LivrariaData).products)
              ? (r.livraria as LivrariaData).products
              : seed.livraria.products,
            sales: Array.isArray((r.livraria as LivrariaData).sales)
              ? (r.livraria as LivrariaData).sales
              : seed.livraria.sales,
            expenses: Array.isArray((r.livraria as LivrariaData).expenses)
              ? (r.livraria as LivrariaData).expenses
              : seed.livraria.expenses,
          }
        : seed.livraria,
    social:
      r.social && typeof r.social === "object"
        ? {
            basketStock: Number((r.social as SocialData).basketStock) || 0,
            supplies: Array.isArray((r.social as SocialData).supplies)
              ? (r.social as SocialData).supplies
              : seed.social.supplies,
            basketRecipe: Array.isArray((r.social as SocialData).basketRecipe)
              ? (r.social as SocialData).basketRecipe
              : seed.social.basketRecipe,
            donations: Array.isArray((r.social as SocialData).donations)
              ? (r.social as SocialData).donations
              : seed.social.donations,
            assemblies: Array.isArray((r.social as SocialData).assemblies)
              ? (r.social as SocialData).assemblies
              : seed.social.assemblies,
            families: Array.isArray((r.social as SocialData).families)
              ? (r.social as SocialData).families
              : seed.social.families,
            deliveries: Array.isArray((r.social as SocialData).deliveries)
              ? (r.social as SocialData).deliveries
              : seed.social.deliveries,
          }
        : seed.social,
    membro:
      r.membro && typeof r.membro === "object"
        ? {
            churchPixConfig:
              (r.membro as MembroPortalData).churchPixConfig &&
              typeof (r.membro as MembroPortalData).churchPixConfig === "object"
                ? (r.membro as MembroPortalData).churchPixConfig
                : seed.membro.churchPixConfig,
            members: Array.isArray((r.membro as MembroPortalData).members)
              ? (r.membro as MembroPortalData).members
              : seed.membro.members,
            activeMemberId:
              typeof (r.membro as MembroPortalData).activeMemberId === "string"
                ? (r.membro as MembroPortalData).activeMemberId
                : seed.membro.activeMemberId,
            tithes: Array.isArray((r.membro as MembroPortalData).tithes)
              ? (r.membro as MembroPortalData).tithes
              : seed.membro.tithes,
          }
        : seed.membro,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : seed.updatedAt,
  };
}

// ======================================================
// CÁLCULOS PUROS DOS MÓDULOS DO LABS
// ======================================================
export interface CantinaItemSummary {
  item: CantinaItem;
  soldPosQty: number;
  consumedQty: number; // produced - leftover
  availableStock: number; // max(0, produced - soldPos - leftover - waste)
  expectedRevenueFromConsumption: number; // (produced - leftover) * unitPrice
  netExpectedAfterWaste: number; // max(0, produced - leftover - waste) * unitPrice
  recordedRevenue: number;
}

export interface CantinaEventSummary {
  eventId: string;
  itemSummaries: CantinaItemSummary[];
  totalProducedUnits: number;
  totalSoldPosUnits: number;
  totalLeftoverUnits: number;
  totalWasteUnits: number;
  expectedRevenueFromConsumption: number;
  netExpectedAfterWaste: number;
  recordedSalesTotal: number;
  byPayment: Record<"dinheiro" | "pix" | "cartao", number>;
  divergenceVsExpected: number;
  estimatedCost: number;
  estimatedProfit: number;
  cashDrawerExpected: number;
  cashDrawerVariance: number | null;
}

export function computeCantinaEventSummary(
  event: CantinaEvent | undefined,
  items: CantinaItem[],
  sales: CantinaSale[]
): CantinaEventSummary {
  const eventId = event?.id ?? "";
  const evItems = items.filter((i) => i.eventId === eventId);
  const evSales = sales.filter((s) => s.eventId === eventId);

  const soldByItem = new Map<string, { qty: number; rev: number }>();
  const byPayment: Record<"dinheiro" | "pix" | "cartao", number> = {
    dinheiro: 0,
    pix: 0,
    cartao: 0,
  };

  let recordedSalesTotal = 0;
  for (const s of evSales) {
    recordedSalesTotal = roundCurrency(recordedSalesTotal + s.total);
    byPayment[s.paymentMethod] = roundCurrency(byPayment[s.paymentMethod] + s.total);
    for (const line of s.items) {
      const prev = soldByItem.get(line.itemId) ?? { qty: 0, rev: 0 };
      soldByItem.set(line.itemId, {
        qty: prev.qty + line.qty,
        rev: roundCurrency(prev.rev + line.qty * line.unitPrice),
      });
    }
  }

  let totalProducedUnits = 0;
  let totalSoldPosUnits = 0;
  let totalLeftoverUnits = 0;
  let totalWasteUnits = 0;
  let expectedRevenueFromConsumption = 0;
  let netExpectedAfterWaste = 0;
  let estimatedCost = 0;

  const itemSummaries: CantinaItemSummary[] = evItems.map((item) => {
    const sold = soldByItem.get(item.id) ?? { qty: 0, rev: 0 };
    const consumedQty = Math.max(0, item.producedQty - item.leftoverQty);
    const netSoldCapacity = Math.max(0, item.producedQty - item.leftoverQty - item.wasteQty);
    const availableStock = Math.max(
      0,
      item.producedQty - sold.qty - item.leftoverQty - item.wasteQty
    );
    const expected = roundCurrency(consumedQty * item.unitPrice);
    const netExpected = roundCurrency(netSoldCapacity * item.unitPrice);

    totalProducedUnits += item.producedQty;
    totalSoldPosUnits += sold.qty;
    totalLeftoverUnits += item.leftoverQty;
    totalWasteUnits += item.wasteQty;
    expectedRevenueFromConsumption = roundCurrency(expectedRevenueFromConsumption + expected);
    netExpectedAfterWaste = roundCurrency(netExpectedAfterWaste + netExpected);
    estimatedCost = roundCurrency(estimatedCost + item.producedQty * item.unitCost);

    return {
      item,
      soldPosQty: sold.qty,
      consumedQty,
      availableStock,
      expectedRevenueFromConsumption: expected,
      netExpectedAfterWaste: netExpected,
      recordedRevenue: sold.rev,
    };
  });

  const cashDrawerExpected = roundCurrency((event?.initialCash ?? 0) + byPayment.dinheiro);
  const cashDrawerVariance =
    typeof event?.countedCash === "number"
      ? roundCurrency(event.countedCash - cashDrawerExpected)
      : null;

  return {
    eventId,
    itemSummaries,
    totalProducedUnits,
    totalSoldPosUnits,
    totalLeftoverUnits,
    totalWasteUnits,
    expectedRevenueFromConsumption,
    netExpectedAfterWaste,
    recordedSalesTotal,
    byPayment,
    divergenceVsExpected: roundCurrency(recordedSalesTotal - expectedRevenueFromConsumption),
    estimatedCost,
    estimatedProfit: roundCurrency(recordedSalesTotal - estimatedCost),
    cashDrawerExpected,
    cashDrawerVariance,
  };
}

export function computeLivrariaSummary(data: LivrariaData) {
  const lowStockProducts = data.products.filter((p) => p.stockQty <= p.minStockAlert);
  const pendingDeliveries = data.sales.filter((s) => s.deliveryStatus === "pendente");
  const pendingPayments = data.sales.filter((s) => s.paymentStatus === "pendente");

  let grossRevenue = 0;
  let paidRevenue = 0;
  let costOfGoodsSold = 0;
  let soldUnits = 0;

  for (const s of data.sales) {
    soldUnits += s.qty;
    grossRevenue = roundCurrency(grossRevenue + s.total);
    if (s.paymentStatus === "pago") {
      paidRevenue = roundCurrency(paidRevenue + s.total);
    }
    costOfGoodsSold = roundCurrency(costOfGoodsSold + s.qty * s.unitCost);
  }

  const extraExpenses = roundCurrency(
    data.expenses.reduce((sum, e) => sum + e.amount, 0)
  );
  const totalStockUnits = data.products.reduce((sum, p) => sum + p.stockQty, 0);
  const netProfit = roundCurrency(paidRevenue - costOfGoodsSold - extraExpenses);

  return {
    lowStockProducts,
    pendingDeliveries,
    pendingPayments,
    grossRevenue,
    paidRevenue,
    costOfGoodsSold,
    extraExpenses,
    totalStockUnits,
    soldUnits,
    netProfit,
  };
}

export function assembleSocialBaskets(
  data: SocialData,
  basketsToBuild: number,
  operatorName?: string,
  dateIso = todayIsoDate()
):
  | {
      ok: true;
      nextData: SocialData;
    }
  | {
      ok: false;
      shortages: Array<{ supplyName: string; required: number; available: number; unit: string }>;
    } {
  const qty = Math.max(1, Math.floor(basketsToBuild));
  if (data.basketRecipe.length === 0) {
    return {
      ok: false,
      shortages: [{ supplyName: "Receita da cesta vazia", required: 1, available: 0, unit: "item" }],
    };
  }

  const supplyMap = new Map(data.supplies.map((s) => [s.id, s]));
  const shortages: Array<{ supplyName: string; required: number; available: number; unit: string }> =
    [];

  for (const line of data.basketRecipe) {
    const supply = supplyMap.get(line.supplyId);
    const required = roundCurrency(line.qtyPerBasket * qty);
    const available = supply?.stockQty ?? 0;
    if (available < required) {
      shortages.push({
        supplyName: line.supplyName,
        required,
        available,
        unit: line.unit,
      });
    }
  }

  if (shortages.length > 0) {
    return { ok: false, shortages };
  }

  const nextSupplies = data.supplies.map((s) => {
    const line = data.basketRecipe.find((l) => l.supplyId === s.id);
    if (!line) return s;
    return {
      ...s,
      stockQty: Math.max(0, roundCurrency(s.stockQty - line.qtyPerBasket * qty)),
    };
  });

  const assembly = {
    id: `asm-${Date.now()}`,
    date: dateIso,
    basketsAssembled: qty,
    operatorName: operatorName?.trim() || undefined,
  };

  return {
    ok: true,
    nextData: {
      ...data,
      basketStock: data.basketStock + qty,
      supplies: nextSupplies,
      assemblies: [assembly, ...data.assemblies],
    },
  };
}

export function validateSocialDelivery(
  data: SocialData,
  familyId: string,
  dateIso: string,
  basketsQty = 1,
  allowDuplicateOverride = false
):
  | { ok: true; competenceMonth: string }
  | { ok: false; reason: string; duplicateDelivery?: SocialDelivery } {
  if (basketsQty < 1) {
    return { ok: false, reason: "Informe ao menos 1 cesta para entrega." };
  }
  if (data.basketStock < basketsQty) {
    return {
      ok: false,
      reason: `Estoque insuficiente de cestas montadas (${data.basketStock} disponível). Monte mais cestas primeiro.`,
    };
  }
  const competenceMonth = dateIso.slice(0, 7);
  const existing = data.deliveries.find(
    (d) => d.familyId === familyId && d.competenceMonth === competenceMonth
  );
  if (existing && !allowDuplicateOverride) {
    return {
      ok: false,
      reason: `Esta família já recebeu cesta em ${competenceMonth} (dia ${existing.date.split("-").reverse().join("/")}).`,
      duplicateDelivery: existing,
    };
  }
  return { ok: true, competenceMonth };
}

export interface AnnualMonthSlot {
  monthIndex: number; // 1..12
  competenceMonth: string; // YYYY-MM
  shortLabel: string;
  tithe: DigitalTitheRecord | null;
  status: "conciliado" | "aguardando_conferencia" | "em_aberto";
}

const MONTH_SHORT_PT = [
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

export function buildMemberAnnualTimeline(
  tithes: DigitalTitheRecord[],
  memberId: string,
  year: number
): AnnualMonthSlot[] {
  const yearPrefix = `${year}-`;
  const memberTithes = tithes.filter(
    (t) => t.memberId === memberId && t.competenceMonth.startsWith(yearPrefix)
  );

  return MONTH_SHORT_PT.map((shortLabel, idx) => {
    const mNum = idx + 1;
    const competenceMonth = `${year}-${String(mNum).padStart(2, "0")}`;
    const matching = memberTithes.filter((t) => t.competenceMonth === competenceMonth);
    const chosen =
      matching.find((t) => t.status === "conciliado") ?? matching[0] ?? null;

    return {
      monthIndex: mNum,
      competenceMonth,
      shortLabel,
      tithe: chosen,
      status: chosen ? chosen.status : "em_aberto",
    };
  });
}

export function nextTitheReceiptNumber(
  tithes: DigitalTitheRecord[],
  year = new Date().getFullYear()
): string {
  const maxSeq = tithes.reduce((max, t) => {
    const m = t.receiptNumber.match(/(\d+)$/);
    return Math.max(max, m ? parseInt(m[1], 10) : 0);
  }, 200);
  return `DZ-${year}-${String(maxSeq + 1).padStart(4, "0")}`;
}

