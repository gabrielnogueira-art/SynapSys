import { PlatformContract } from "@/platform/types";

export const CTR_001_CONFIG: PlatformContract = {
  id: "ctr-001-ebd-exemplo",
  code: "CTR-001",
  clientName: "Igreja Exemplo — Rede EBD (Sistema Atual)",
  segment: "igreja",
  status: "ativo",
  activeModules: ["igreja_ebd"],
  codeFolder: "src/contracts/ctr-001-ebd-exemplo",
  entryPath: "/c/ctr-001-ebd-exemplo",
  city: "Campos / Rio de Janeiro",
  responsibleName: "Administrador Master EBD",
  responsibleEmail: "master@ebd.dev",
  planName: "EBD Multi-Hierarquia (Supabase)",
  monthlyValue: 299,
  authSource: "supabase",
  supabaseMinistryId: "cccccccc-0000-0000-0000-000000000001",
  isReferenceExample: true,
  notes:
    "Contrato exemplo original já existente no repositório. Permite acessar o sistema EBD real (Formulário, Coristas, Admin, Professor) mantendo 100% da integração Supabase.",
  createdAt: "2026-06-15",
};
