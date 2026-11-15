import { PlatformContract } from "@/platform/types";
import { ChurchWorkspace } from "@/systems/church/ChurchWorkspace";
import { CTR_001_OVERRIDES } from "./overrides";

/**
 * Entrada exclusiva do contrato CTR-001 (EBD Existente).
 * Se este cliente pedir regras/telas exclusivas no futuro, customize aqui sem afetar outros contratos.
 */
export const Ctr001Entry = ({ contract }: { contract: PlatformContract }) => {
  return <ChurchWorkspace contract={contract} overrides={CTR_001_OVERRIDES} />;
};
