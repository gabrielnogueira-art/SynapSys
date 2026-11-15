import { ContractOverrides } from "@/platform/types";

/**
 * Customizações exclusivas do contrato CTR-001.
 * Toda alteração solicitada especificamente para este cliente deve ficar
 * isolada nesta pasta (src/contracts/ctr-001-ebd-exemplo/).
 */
export const CTR_001_OVERRIDES: ContractOverrides = {
  contractId: "ctr-001-ebd-exemplo",
  customBrandTitle: "Sistema de Gestão da EBD",
  customSubtitle:
    "Contrato exemplo ativo (EBD System Pro) — conectado ao Supabase de produção",
  featureFlags: {
    allowChoirView: true,
    allowTodayStatus: true,
    allowHierarchyScope: true,
  },
  clientNotes:
    "Sistema EBD original do repositório. Mantém hierarquia Ministério > Sede > Regional > Congregação e login real via Supabase.",
};
