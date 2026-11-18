import type { LabModuleId, LabModulePromotion } from "../types";

export type LabRoleMode = "admin" | "operador" | "voluntario";

// ======================================================
// A. MÓDULO CANTINA & EVENTOS
// ======================================================
export type CantinaPaymentMethod = "dinheiro" | "pix" | "cartao";
export type CantinaItemCategory = "salgado" | "bebida" | "doce" | "combo" | "outro";

export interface CantinaEvent {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  status: "aberto" | "fechado";
  initialCash: number;
  countedCash?: number;
  notes?: string;
}

export interface CantinaItem {
  id: string;
  eventId: string;
  name: string;
  category: CantinaItemCategory;
  unitPrice: number;
  unitCost: number;
  producedQty: number;
  leftoverQty: number;
  wasteQty: number;
}

export interface CantinaSaleLine {
  itemId: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface CantinaSale {
  id: string;
  eventId: string;
  createdAt: string;
  items: CantinaSaleLine[];
  total: number;
  paymentMethod: CantinaPaymentMethod;
  buyerName?: string;
}

export interface CantinaData {
  events: CantinaEvent[];
  items: CantinaItem[];
  sales: CantinaSale[];
}

// ======================================================
// B. MÓDULO LIVRARIA & MATERIAIS EBD
// ======================================================
export type LivrariaCategory = "revista_ebd" | "livro_biblia" | "vestuario" | "artigo";

export interface LivrariaProduct {
  id: string;
  name: string;
  category: LivrariaCategory;
  trimester?: string;
  ageGroup?: string;
  audience?: "aluno" | "professor";
  size?: "PP" | "P" | "M" | "G" | "GG" | "XG" | "Unico";
  stockQty: number;
  minStockAlert: number;
  costPrice: number;
  salePrice: number;
}

export interface LivrariaSale {
  id: string;
  createdAt: string;
  productId: string;
  productName: string;
  qty: number;
  unitCost: number;
  unitPrice: number;
  total: number;
  paymentMethod: "dinheiro" | "pix" | "cartao";
  paymentStatus: "pago" | "pendente";
  deliveryStatus: "entregue" | "pendente";
  customerName?: string;
  notes?: string;
}

export interface LivrariaExpense {
  id: string;
  date: string;
  description: string;
  supplier?: string;
  category: "editora" | "congresso" | "outros";
  amount: number;
}

export interface LivrariaData {
  products: LivrariaProduct[];
  sales: LivrariaSale[];
  expenses: LivrariaExpense[];
}

// ======================================================
// C. MÓDULO AÇÃO SOCIAL & CESTAS BÁSICAS
// ======================================================
export type SocialUnit = "kg" | "L" | "unid";

export interface SocialSupplyItem {
  id: string;
  name: string;
  unit: SocialUnit;
  stockQty: number;
  minStockAlert: number;
}

export interface SocialRecipeLine {
  supplyId: string;
  supplyName: string;
  qtyPerBasket: number;
  unit: SocialUnit;
}

export interface SocialDonation {
  id: string;
  date: string;
  campaign: string;
  donorName?: string;
  items: Array<{ supplyId: string; supplyName: string; qty: number; unit: SocialUnit }>;
  directBasketsQty?: number;
  notes?: string;
}

export interface SocialAssembly {
  id: string;
  date: string;
  basketsAssembled: number;
  operatorName?: string;
}

export interface SocialFamily {
  id: string;
  headName: string;
  contact?: string;
  neighborhood?: string;
  dependentsCount: number;
  active: boolean;
  notes?: string;
}

export interface SocialDelivery {
  id: string;
  date: string; // YYYY-MM-DD
  competenceMonth: string; // YYYY-MM
  familyId: string;
  familyName: string;
  basketsQty: number;
  campaignTag?: string;
  deliveredBy?: string;
  notes?: string;
}

export interface SocialData {
  basketStock: number;
  supplies: SocialSupplyItem[];
  basketRecipe: SocialRecipeLine[];
  donations: SocialDonation[];
  assemblies: SocialAssembly[];
  families: SocialFamily[];
  deliveries: SocialDelivery[];
}

// ======================================================
// SANDBOX DO SYNAPSYS LABS
// ======================================================
export interface LabsSandboxState {
  activeModule: LabModuleId;
  roleMode: LabRoleMode;
  cantina: CantinaData;
  livraria: LivrariaData;
  social: SocialData;
  updatedAt: string;
}

export type LabPromotionsMap = Record<LabModuleId, LabModulePromotion>;
