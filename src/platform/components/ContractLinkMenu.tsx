import { Layers, Link2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { getModuleById } from "../catalog";
import { contractModulePublicUrl, contractPublicUrl, usePlatformOrigin } from "../contractLinks";
import type { ModuleId, PlatformContract } from "../types";

export function ContractLinkMenu({ contract }: { contract: PlatformContract }) {
  const { toast } = useToast();
  const { origin } = usePlatformOrigin();

  const copyText = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: `${label} copiado`, description: url });
    } catch {
      toast({ variant: "destructive", title: "Não foi possível copiar", description: url });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Link2 className="h-4 w-4 mr-1.5" />
          Copiar link do cliente
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem
          onSelect={() => {
            void copyText(contractPublicUrl(contract, false, origin), "Link do portal");
          }}
        >
          <Link2 className="h-4 w-4 mr-2" />
          Link do portal
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            void copyText(contractPublicUrl(contract, true, origin), "Link direto do login");
          }}
        >
          <LogIn className="h-4 w-4 mr-2" />
          Link direto do login
        </DropdownMenuItem>
        {contract.activeModules.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
              Links específicos por área
            </DropdownMenuLabel>
            {contract.activeModules.map((modId: ModuleId) => {
              const mod = getModuleById(modId);
              const label = mod?.shortName ?? modId;
              return (
                <DropdownMenuItem
                  key={modId}
                  onSelect={() => {
                    void copyText(
                      contractModulePublicUrl(contract, modId, origin),
                      `Link de ${label}`
                    );
                  }}
                >
                  <Layers className="h-4 w-4 mr-2 text-primary" />
                  Link: {label}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
