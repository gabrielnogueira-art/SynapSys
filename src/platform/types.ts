export type ProjectSegment = "igreja" | "comercio";

export type ChurchModuleId =
  | "igreja_ebd"
  | "igreja_tesouraria"
  | "igreja_secretaria"
  | "igreja_cantina"
  | "igreja_livraria"
  | "igreja_social"
  | "igreja_membro";

export type LabModuleId =
  | "igreja_cantina"
  | "igreja_livraria"
  | "igreja_social"
  | "igreja_membro";

export type LabLifecycleStage = "em_incubacao" | "em_aprovacao" | "promovido";
export type LabCommercialModel = "pacote_padrao" | "addon";

export interface LabModulePromotion {
  moduleId: LabModuleId;
  stage: LabLifecycleStage;
  promotedToCatalog: boolean;
  commercialModel: LabCommercialModel;
  addonMonthlyPrice: number;
  notes?: string;
  promotedAt?: string;
}

export type CommerceModuleId =
  | "comercio_tesouraria"
  | "comercio_secretaria"
  | "comercio_estoque"
  | "comercio_rh"
  | "comercio_pdv";

export type ModuleId = ChurchModuleId | CommerceModuleId;

export type ContractStatus =
  | "ativo"
  | "implantacao"
  | "demonstracao"
  | "suspenso";

export type ContractLegalStatus =
  | "em_elaboracao"
  | "aguardando_assinatura"
  | "ativo"
  | "suspenso_atraso"
  | "cancelado";

export interface PricingTier {
  id: string;
  segment: ProjectSegment;
  name: string;
  minUnits: number;
  maxUnits: number | null;
  /** Preço unitário por igreja / unidade individual */
  unitPrice: number;
  description?: string;
}

export interface ContractClauseTemplate {
  id: string;
  order: number;
  title: string;
  body: string;
}

export type InvoicePaymentMethod =
  | "asaas"
  | "cora"
  | "nubank_boleto"
  | "pix"
  | "cartao"
  | "dinheiro"
  | "transferencia"
  | "outro";

export type InvoiceStatus = "pendente" | "pago" | "cancelado";

export interface ContractInvoice {
  id: string;
  /** Competência no formato YYYY-MM (ex.: 2026-11) */
  competence: string;
  /** Vencimento no formato YYYY-MM-DD */
  dueDate: string;
  amount: number;
  status: InvoiceStatus;
  provider: InvoicePaymentMethod;
  paymentUrl?: string;
  paymentCode?: string;
  paidAt?: string;
  paidAmount?: number;
  paidMethod?: string;
  notes?: string;
  createdAt: string;
}

export interface ContractActivityEntry {
  id: string;
  at: string;
  type: "contrato" | "plano" | "cobranca" | "status";
  summary: string;
}

export interface PlatformBillingConfig {
  preferredProvider: "manual_nubank_cora" | "asaas" | "cora";
  gracePeriodDays: number;
  pixKey?: string;
  beneficiaryName?: string;
  contractorDocument?: string;
  contractorCity?: string;
  supportContact?: string;
  paymentInstructions?: string;
}

export type AuthSource = "supabase" | "local";

export interface SegmentDefinition {
  id: ProjectSegment;
  name: string;
  tagline: string;
  description: string;
  badgeColor: string;
}

export interface ModuleDefinition {
  id: ModuleId;
  segment: ProjectSegment;
  name: string;
  shortName: string;
  description: string;
  maturity: "producao" | "preview" | "labs";
  isLabModule?: boolean;
  systemFolder: string;
}

export interface PlatformContract {
  id: string;
  code: string;
  clientName: string;
  segment: ProjectSegment;
  status: ContractStatus;
  activeModules: ModuleId[];
  /** Caminho exato da pasta isolada para customizações deste contrato */
  codeFolder: string;
  /** Rota base de entrada na plataforma */
  entryPath: string;
  slug?: string;
  requireLoginOnEntry?: boolean;
  city?: string;
  responsibleName?: string;
  responsibleEmail?: string;
  planName?: string;
  monthlyValue?: number;
  legalName?: string;
  documentNumber?: string;
  address?: string;
  unitsCount?: number;
  billingDueDay?: number;
  contractStartDate?: string;
  adjustmentIndex?: string;
  contractLegalStatus?: ContractLegalStatus;
  customClauses?: ContractClauseTemplate[];
  invoices?: ContractInvoice[];
  activityLog?: ContractActivityEntry[];
  authSource: AuthSource;
  supabaseMinistryId?: string | null;
  isReferenceExample?: boolean;
  notes?: string;
  createdAt: string;
  memberModuleOverrides?: Record<string, ModuleId[]>;
  memberModuleLevelOverrides?: Record<string, Partial<Record<ModuleId, string>>>;
  branding?: {
    logoUrl?: string | null;
    primaryHsl?: string | null;
    presidentPastor?: string | null;
  };
}

export type UserAccessLevel =
  | "dono_plataforma"
  | "gestor_contrato"
  | "operador"
  | "professor";

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  contractId: string;
  roleLabel: string;
  accessLevel: UserAccessLevel;
  authSource: AuthSource;
  status: "ativo" | "pendente" | "bloqueado";
  allowedModules?: ModuleId[];
  moduleLevels?: Partial<Record<ModuleId, string>>;
  ebdAdmin?: boolean;
  notes?: string;
  createdAt: string;
}

export interface PendingAccessRequest {
  id: string;
  userId: string | null;
  email: string;
  displayName: string;
  contractId: string | null;
  requestedArea?: string | null;
  notes?: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface ChangeRequest {
  id: string;
  contractId: string;
  title: string;
  description: string;
  targetModule: ModuleId | "geral";
  status: "solicitado" | "em_andamento" | "concluido";
  createdAt: string;
}

export interface ContractOverrides {
  contractId: string;
  customBrandTitle?: string;
  customSubtitle?: string;
  accentColorHex?: string;
  featureFlags?: Record<string, boolean>;
  clientNotes?: string;
}
