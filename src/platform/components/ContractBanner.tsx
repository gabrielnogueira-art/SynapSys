import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Copy, Eye, FolderGit2, Layers, Users } from "lucide-react";
import { ModuleId, PlatformContract } from "@/platform/types";
import { buildAntigravityEditPrompt, getModuleById, SEGMENT_DEFINITIONS } from "@/platform/catalog";
import { useToast } from "@/hooks/use-toast";
import { switchToClientSimulation, useViewerSession } from "@/platform/session";
import { useUserRole } from "@/hooks/useUserRole";
import { ContractLinkMenu } from "./ContractLinkMenu";

interface ContractBannerProps {
  contract: PlatformContract;
  activeModule?: ModuleId;
  onSelectModule?: (m: ModuleId) => void;
}

/**
 * Barra de engenharia e navegação da Plataforma.
 * Visível APENAS no Modo Empreendedor (Dono da Plataforma).
 * Quando um cliente final acessa o sistema (session.mode === "client"), retorna null.
 */
export const ContractBanner = ({
  contract,
  activeModule,
  onSelectModule,
}: ContractBannerProps) => {
  const session = useViewerSession();
  const role = useUserRole();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Nunca exibir para usuários finais autenticados em contratos ou durante simulação de cliente
  const isClientAccountSignedIn = Boolean(role.role && role.role !== "master");
  if (session.mode !== "owner" || isClientAccountSignedIn || role.role !== "master") {
    return null;
  }

  const seg = SEGMENT_DEFINITIONS[contract.segment];

  const handleCopyPrompt = async () => {
    const prompt = buildAntigravityEditPrompt(contract, {
      title: "Alteração solicitada pelo cliente",
      description: "<descrever aqui a solicitação>",
      targetModule: activeModule ?? "geral",
    });
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast({
        title: "Referência copiada!",
        description: `Contrato ${contract.code} (GitHub/${contract.codeFolder}) pronto para colar no Antigravity.`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copie manualmente",
        description: `GitHub/${contract.codeFolder}`,
      });
    }
  };

  const handleSimulateClient = () => {
    switchToClientSimulation({
      id: `sim-${contract.id}`,
      name: contract.responsibleName || contract.clientName,
      email: contract.responsibleEmail || `acesso@${contract.id}.local`,
      contractId: contract.id,
      roleLabel: contract.segment === "igreja" ? "Gestor da Igreja" : "Gestor Comercial",
      accessLevel: "gestor_contrato",
      authSource: contract.authSource,
      status: "ativo",
      createdAt: contract.createdAt,
    });
    toast({
      title: `Simulando visão do cliente (${contract.code})`,
      description: "A barra da plataforma foi ocultada e o acesso ficou restrito a este contrato.",
    });
  };

  if (collapsed) {
    return (
      <div className="bg-slate-950 text-slate-100 border-b border-slate-800 px-4 py-1.5 flex items-center justify-between text-xs print:hidden">
        <div className="flex items-center gap-2">
          <Badge className="bg-indigo-600 text-white text-[10px]">DONO DA PLATAFORMA</Badge>
          <Link to="/" className="inline-flex items-center gap-1 text-slate-300 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Plataforma
          </Link>
          <span className="text-slate-600">|</span>
          <span className="font-semibold text-white">{contract.code}</span>
          <span className="text-slate-300 truncate max-w-[240px]">{contract.clientName}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-slate-300 hover:text-white hover:bg-slate-800"
          onClick={() => setCollapsed(false)}
        >
          <ChevronDown className="h-3.5 w-3.5 mr-1" /> Expandir barra admin
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 text-slate-100 border-b border-indigo-900/60 px-4 py-2 print:hidden">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2.5 text-xs bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Voltar à Plataforma
            </Button>
          </Link>

          <Badge className="bg-indigo-600 text-white hover:bg-indigo-600 text-[10px]">
            VISÃO EMPREENDEDOR
          </Badge>

          <Badge variant="outline" className="font-mono text-xs border-slate-600 text-white">
            {contract.code}
          </Badge>

          <Badge variant="outline" className="text-xs border-slate-700 text-slate-300 hidden sm:inline-flex">
            {seg.name}
          </Badge>

          <div className="hidden xl:flex items-center gap-1.5 rounded bg-slate-900 px-2 py-1 text-[11px] font-mono text-slate-300 border border-slate-800">
            <FolderGit2 className="h-3.5 w-3.5 text-amber-400" />
            <span>GitHub/{contract.codeFolder}/</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {onSelectModule && contract.activeModules.length > 1 && (
            <div className="hidden md:flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
              <Layers className="h-3 w-3 text-slate-400 ml-1" />
              {contract.activeModules.map((modId) => {
                const mod = getModuleById(modId);
                const isActive = activeModule === modId;
                return (
                  <button
                    key={modId}
                    type="button"
                    onClick={() => onSelectModule(modId)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {mod?.shortName ?? modId}
                  </button>
                );
              })}
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleSimulateClient}
            className="h-7 px-2.5 text-xs bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200"
            title="Oculta esta barra e restringe a navegação exatamente como o cliente final vê"
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> Simular Visão Cliente
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyPrompt}
            className="h-7 px-2.5 text-xs bg-transparent border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Copiado
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copiar Ref.
              </>
            )}
          </Button>

          <Link to={`${contract.entryPath}/users`}>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs bg-transparent border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              <Users className="h-3.5 w-3.5 mr-1" /> Logins
            </Button>
          </Link>

          <ContractLinkMenu contract={contract} />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCollapsed(true)}
            className="h-7 px-1.5 text-slate-400 hover:text-white hover:bg-slate-800"
            title="Recolher barra"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
