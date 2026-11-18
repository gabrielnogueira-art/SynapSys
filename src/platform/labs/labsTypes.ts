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
// D. MÓDULO PORTAL DO MEMBRO & DÍZIMOS DIGITAIS
// ======================================================
export interface ChurchPixConfig {
  churchName: string;
  churchCnpj: string;
  pixKey: string;
  pixKeyType: "cnpj" | "email" | "telefone" | "aleatoria";
  bankName: string;
}

export interface MemberPortalProfile {
  id: string;
  matricula: string;
  fullName: string;
  cpfMasked: string;
  birthDate: string;
  baptismDate?: string;
  address: string;
  phone: string;
  email: string;
  ecclesiasticalRole: string;
  congregation: string;
  maritalStatus: string;
  spouseName?: string;
  ebdClassName: string;
  ebdTeachers: string;
  ebdAttendanceSummary: string;
}

export type TitheReconciliationStatus = "aguardando_conferencia" | "conciliado";

export interface DigitalTitheRecord {
  id: string;
  receiptNumber: string;
  memberId: string;
  matricula: string;
  memberName: string;
  memberRole: string;
  congregation: string;
  competenceMonth: string; // YYYY-MM
  amount: number;
  paidAtIso: string; // YYYY-MM-DD HH:mm
  paymentMethod: "PIX" | "Dinheiro" | "Cartao";
  e2eCode: string;
  bankOrigin?: string;
  verifiedRecipient: boolean;
  recipientWarning?: string;
  status: TitheReconciliationStatus;
  reconciledBy?: string;
  reconciledAt?: string;
  notes?: string;
  createdAt: string;
}

export interface MembroPortalData {
  churchPixConfig: ChurchPixConfig;
  members: MemberPortalProfile[];
  activeMemberId: string;
  tithes: DigitalTitheRecord[];
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
  membro: MembroPortalData;
  updatedAt: string;
}

export type LabPromotionsMap = Record<LabModuleId, LabModulePromotion>;
