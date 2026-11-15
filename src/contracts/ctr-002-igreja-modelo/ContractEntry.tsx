import { PlatformContract } from "@/platform/types";
import { ChurchWorkspace } from "@/systems/church/ChurchWorkspace";
import { CTR_002_OVERRIDES } from "./overrides";

export const Ctr002Entry = ({ contract }: { contract: PlatformContract }) => {
  return <ChurchWorkspace contract={contract} overrides={CTR_002_OVERRIDES} />;
};
