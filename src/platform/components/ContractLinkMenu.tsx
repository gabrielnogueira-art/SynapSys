import { Link2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { contractPublicUrl } from "../contractLinks";
import type { PlatformContract } from "../types";

export function ContractLinkMenu({ contract }: { contract: PlatformContract }) {
  const { toast } = useToast();
  const copy = async (login: boolean) => {
    try {
      await navigator.clipboard.writeText(contractPublicUrl(contract, login));
      toast({ title: login ? "Link do login copiado" : "Link do cliente copiado" });
    } catch {
      toast({ variant: "destructive", title: "Não foi possível copiar", description: contractPublicUrl(contract, login) });
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