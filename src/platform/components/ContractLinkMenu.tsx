import { Link2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { contractPublicUrl, usePlatformOrigin } from "../contractLinks";
import type { PlatformContract } from "../types";

export function ContractLinkMenu({ contract }: { contract: PlatformContract }) {
  const { toast } = useToast();
  const { origin } = usePlatformOrigin();
  const copy = async (login: boolean) => {
    const url = contractPublicUrl(contract, login, origin);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: login ? "Link do login copiado" : "Link do cliente copiado" });
    } catch {
      toast({ variant: "destructive", title: "Não foi possível copiar", description: url });
    }
  };
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button size="sm" variant="outline"><Link2 className="h-4 w-4 mr-1.5" />Copiar link do cliente</Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onSelect={() => { void copy(false); }}><Link2 className="h-4 w-4 mr-2" />Link do portal</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => { void copy(true); }}><LogIn className="h-4 w-4 mr-2" />Link direto do login</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}