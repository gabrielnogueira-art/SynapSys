import { ModuleId, PlatformContract } from "@/platform/types";
import { ChurchWorkspace } from "@/systems/church/ChurchWorkspace";
import { CTR_002_OVERRIDES } from "./overrides";

export const Ctr002Entry = ({
  contract,
  initialArea,
}: {
  contract: PlatformContract;
  initialArea?: ModuleId;
}) => {
  return <ChurchWorkspace contract={contract} overrides={CTR_002_OVERRIDES} initialArea={initialArea} />;
};
