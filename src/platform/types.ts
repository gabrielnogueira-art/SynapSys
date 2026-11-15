export type ProjectSegment = "igreja" | "comercio";

export type ChurchModuleId =
  | "igreja_ebd"
  | "igreja_tesouraria"
  | "igreja_secretaria";

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
  maturity: "producao" | "preview";
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
  city?: string;
  responsibleName?: string;
  responsibleEmail?: string;
  planName?: string;
  monthlyValue?: number;
  authSource: AuthSource;
  supabaseMinistryId?: string | null;
  isReferenceExample?: boolean;
  notes?: string;
  createdAt: string;
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
  notes?: string;
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
