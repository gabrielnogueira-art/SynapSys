import { ComponentType } from "react";
import { ChangeRequest, PlatformContract, PlatformUser } from "@/platform/types";
import { CTR_001_CONFIG } from "./ctr-001-ebd-exemplo/contract.config";
import { Ctr001Entry } from "./ctr-001-ebd-exemplo/ContractEntry";
import { CTR_002_CONFIG } from "./ctr-002-igreja-modelo/contract.config";
import { Ctr002Entry } from "./ctr-002-igreja-modelo/ContractEntry";
import { CTR_003_CONFIG } from "./ctr-003-comercio-modelo/contract.config";
import { Ctr003Entry } from "./ctr-003-comercio-modelo/ContractEntry";

/**
 * Registro oficial de contratos definidos em código.
 * Cada contrato aponta para sua pasta isolada em src/contracts/<id>/.
 */
export const INITIAL_CONTRACTS: PlatformContract[] = [
  CTR_001_CONFIG,
  CTR_002_CONFIG,
  CTR_003_CONFIG,
];

export const CONTRACT_COMPONENTS: Record<
  string,
  ComponentType<{ contract: PlatformContract }>
> = {
  [CTR_001_CONFIG.id]: Ctr001Entry,
  [CTR_002_CONFIG.id]: Ctr002Entry,
  [CTR_003_CONFIG.id]: Ctr003Entry,
};

export const INITIAL_PLATFORM_USERS: PlatformUser[] = [
  {
    id: "usr-master",
    name: "Gestor da Plataforma (Master)",
    email: "master@ebd.dev",
    contractId: CTR_001_CONFIG.id,
    roleLabel: "Master / Dono da Plataforma",
    accessLevel: "dono_plataforma",
    authSource: "supabase",
    status: "ativo",
    notes: "Conta master com acesso total à hierarquia EBD no Supabase.",
    createdAt: "2026-06-15",
  },
  {
    id: "usr-madureira",
    name: "AD Madureira (Ministério)",
    email: "admadureira@gmail.com",
    contractId: CTR_001_CONFIG.id,
    roleLabel: "Igreja Mãe / Gestor do Contrato",
    accessLevel: "gestor_contrato",
    authSource: "supabase",
    status: "ativo",
    notes: "Usuário seed de Ministério no sistema EBD.",
    createdAt: "2026-06-15",
  },
  {
    id: "usr-ctr002",
    name: "Pr. Marcos Oliveira",
    email: "secretaria@igrejaesperanca.demo",
    contractId: CTR_002_CONFIG.id,
    roleLabel: "Gestor Igreja (EBD + Tesouraria + Secretaria)",
    accessLevel: "gestor_contrato",
    authSource: "local",
    status: "ativo",
    createdAt: "2026-11-15",
  },
  {
    id: "usr-ctr003",
    name: "Juliana Mendes",
    email: "gestao@comercialhorizonte.demo",
    contractId: CTR_003_CONFIG.id,
    roleLabel: "Diretora Comercial",
    accessLevel: "gestor_contrato",
    authSource: "local",
    status: "ativo",
    createdAt: "2026-11-15",
  },
];

export const INITIAL_CHANGE_REQUESTS: ChangeRequest[] = [
  {
    id: "req-1",
    contractId: CTR_001_CONFIG.id,
    title: "Exemplo: Adequações do relatório trimestral EBD",
    description:
      "Histórico de adequação aplicada apenas no módulo EBD (média de presença, filtro por faixa etária e campo cargo no aluno).",
    targetModule: "igreja_ebd",
    status: "concluido",
    createdAt: "2026-11-10",
  },
  {
    id: "req-2",
    contractId: CTR_003_CONFIG.id,
    title: "Exemplo: Alerta de estoque mínimo no painel inicial",
    description:
      "Exibir contador de itens com estoque abaixo do mínimo configurado no módulo Estoque & Produtos.",
    targetModule: "comercio_estoque",
    status: "solicitado",
    createdAt: "2026-11-15",
  },
];
