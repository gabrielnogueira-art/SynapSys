import {
  ChangeRequest,
  ModuleDefinition,
  ModuleId,
  PlatformContract,
  ProjectSegment,
  SegmentDefinition,
} from "./types";

export const SEGMENT_DEFINITIONS: Record<ProjectSegment, SegmentDefinition> = {
  igreja: {
    id: "igreja",
    name: "Igreja & Ministério",
    tagline: "Gestão eclesiástica modular",
    description:
      "Projeto voltado para igrejas e ministérios: Escola Bíblica Dominical (EBD), Tesouraria Eclesiástica e Secretaria da Igreja.",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  },
  comercio: {
    id: "comercio",
    name: "Comércio & Empresas",
    tagline: "Gestão comercial e administrativa",
    description:
      "Projeto separado para comércios, lojas e prestadores: Tesouraria/Financeiro, Secretaria, Estoque, RH e Vendas.",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
};

export const MODULE_CATALOG: ModuleDefinition[] = [
  // Segmento Igreja
  {
    id: "igreja_ebd",
    segment: "igreja",
    name: "EBD — Escola Bíblica Dominical",
    shortName: "EBD",
    description:
      "Sistema completo (em produção): hierarquia Ministério → Sede → Regional → Congregação, chamada, alunos, professores, ofertas, confronto e relatórios.",
    maturity: "producao",
    systemFolder: "GitHub/src/systems/ebd",
  },
  {
    id: "igreja_tesouraria",
    segment: "igreja",
    name: "Tesouraria Eclesiástica",
    shortName: "Tesouraria",
    description:
      "Controle de dízimos, ofertas, entradas e despesas por congregação, centros de custo e balancete mensal da igreja.",
    maturity: "preview",
    systemFolder: "GitHub/src/systems/church/ChurchTreasuryPreview.tsx",
  },
  {
    id: "igreja_secretaria",
    segment: "igreja",
    name: "Secretaria da Igreja",
    shortName: "Secretaria",
    description:
      "Rol de membros e congregados, emissão de cartas de mudança, registro de batismos, obreiros e agenda ministerial.",
    maturity: "preview",
    systemFolder: "GitHub/src/systems/church/ChurchSecretariatPreview.tsx",
  },

  // Segmento Comércio & Empresas (projeto distinto)
  {
    id: "comercio_tesouraria",
    segment: "comercio",
    name: "Tesouraria / Financeiro Comercial",
    shortName: "Tesouraria",
    description:
      "Fluxo de caixa diário, contas a pagar e receber, conciliação bancária e DRE gerencial do comércio.",
    maturity: "preview",
    systemFolder: "GitHub/src/systems/commerce/CommerceWorkspace.tsx",
  },
  {
    id: "comercio_secretaria",
    segment: "comercio",
    name: "Secretaria & Administrativo",
    shortName: "Secretaria",
    description:
      "Gestão de contratos, protocolos internos, cadastros corporativos e documentos administrativos.",
    maturity: "preview",
    systemFolder: "GitHub/src/systems/commerce/CommerceWorkspace.tsx",
  },
  {
    id: "comercio_estoque",
    segment: "comercio",
    name: "Estoque & Produtos",
    shortName: "Estoque",
    description:
      "Cadastro de itens/SKUs, entradas e saídas, inventário e alertas automáticos de estoque mínimo.",
    maturity: "preview",
    systemFolder: "GitHub/src/systems/commerce/CommerceWorkspace.tsx",
  },
  {
    id: "comercio_rh",
    segment: "comercio",
    name: "RH & Colaboradores",
    shortName: "RH",
    description:
      "Cadastro de equipe, cargos, departamentos, escalas de trabalho e controle base de folha/benefícios.",
    maturity: "preview",
    systemFolder: "GitHub/src/systems/commerce/CommerceWorkspace.tsx",
  },
  {
    id: "comercio_pdv",
    segment: "comercio",
    name: "Vendas & PDV",
    shortName: "Vendas / PDV",
    description:
      "Registro rápido de pedidos/vendas, clientes e acompanhamento de faturamento diário.",
    maturity: "preview",
    systemFolder: "GitHub/src/systems/commerce/CommerceWorkspace.tsx",
  },
];

export function getModulesBySegment(segment: ProjectSegment): ModuleDefinition[] {
  return MODULE_CATALOG.filter((m) => m.segment === segment);
}

export function getModuleById(id: ModuleId): ModuleDefinition | undefined {
  return MODULE_CATALOG.find((m) => m.id === id);
}

export function slugifyContractFolder(code: string, clientName: string): string {
  const cleanCode = code
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const cleanName = clientName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28);
  return `${cleanCode}-${cleanName || "cliente"}`;
}

/**
 * Gera um prompt padronizado e sem ambiguidades para colar no Antigravity
 * quando o cliente solicitar uma adequação específica.
 */
export function buildAntigravityEditPrompt(
  contract: PlatformContract,
  request?: Pick<ChangeRequest, "title" | "description" | "targetModule">
): string {
  const mod =
    request && request.targetModule !== "geral"
      ? getModuleById(request.targetModule)
      : undefined;

  const lines = [
    `[ALTERAÇÃO EXCLUSIVA DE CONTRATO]`,
    `Contrato: ${contract.code} (${contract.id})`,
    `Cliente: ${contract.clientName}`,
    `Segmento do Projeto: ${SEGMENT_DEFINITIONS[contract.segment].name}`,
    `Pasta Isolada do Contrato: GitHub/${contract.codeFolder}/`,
    `Módulo Alvo: ${mod ? `${mod.name} (${mod.id})` : "Geral do contrato"}`,
    `Regra de Segurança: Aplicar customizações específicas do cliente dentro de GitHub/${contract.codeFolder}/ (ou apenas no escopo deste contrato) sem afetar outros contratos.`,
  ];

  if (request) {
    lines.push(`Título da Solicitação: ${request.title}`);
    lines.push(`Detalhes do Cliente: ${request.description}`);
  } else {
    lines.push(`Solicitação do Cliente: <descreva aqui o que o cliente pediu>`);
  }

  return lines.join("\n");
}
