import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Briefcase,
  ClipboardList,
  DollarSign,
  Home,
  Package,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import { CommerceModuleId, PlatformContract } from "@/platform/types";
import { ContractBanner } from "@/platform/components/ContractBanner";
import { AreaKey, ClientShell, ShellSidebarItem } from "@/platform/components/ClientShell";
import { CommerceWorkspace } from "@/systems/commerce/CommerceWorkspace";
import { getModuleById } from "@/platform/catalog";

const COMMERCE_ICON: Record<CommerceModuleId, React.ReactNode> = {
  comercio_tesouraria: <DollarSign className="h-4 w-4" />,
  comercio_secretaria: <ClipboardList className="h-4 w-4" />,
  comercio_estoque: <Package className="h-4 w-4" />,
  comercio_rh: <Users className="h-4 w-4" />,
  comercio_pdv: <ShoppingCart className="h-4 w-4" />,
};

export const CommerceContractShell = ({ contract }: { contract: PlatformContract }) => {
  const commerceModules = contract.activeModules.filter((m): m is CommerceModuleId =>
    m.startsWith("comercio_")
  );
  const defaultArea: AreaKey =
    commerceModules.length > 1
      ? "painel_geral"
      : commerceModules[0] ?? "comercio_tesouraria";

  const [activeArea, setActiveArea] = useState<AreaKey>(defaultArea);

  const effectiveArea: AreaKey =
    activeArea === "painel_geral" ||
    commerceModules.includes(activeArea as CommerceModuleId)
      ? activeArea
      : defaultArea;

  const sidebarItems = useMemo<ShellSidebarItem[]>(() => {
    return [
      {
        id: "menu-inicial",
        label: "Menu Inicial (Painel Geral)",
        icon: <Home className="h-4 w-4" />,
        active: effectiveArea === "painel_geral",
        onClick: () => setActiveArea("painel_geral"),
      },
      ...commerceModules.map((modId) => {
        const mod = getModuleById(modId);
        return {
          id: modId,
          label: mod?.shortName ?? modId,
          icon: COMMERCE_ICON[modId] ?? <Briefcase className="h-4 w-4" />,
          active: effectiveArea === modId,
          onClick: () => setActiveArea(modId),
        };
      }),
    ];
  }, [effectiveArea, commerceModules]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ContractBanner
        contract={contract}
        activeModule={
          effectiveArea === "painel_geral"
            ? commerceModules[0]
            : (effectiveArea as CommerceModuleId)
        }
        onSelectModule={(m) => setActiveArea(m as CommerceModuleId)}
      />

      <ClientShell
        contract={contract}
        activeArea={effectiveArea}
        onSelectArea={setActiveArea}
        sidebarItems={sidebarItems}
      >
        {effectiveArea === "painel_geral" ? (
          <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div className="bg-white rounded-xl border p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  <Store className="h-4 w-4" /> Painel Geral do Comércio
                </div>
                <h1 className="text-2xl font-bold text-slate-900">{contract.clientName}</h1>
                <p className="text-sm text-muted-foreground">
                  Selecione o departamento abaixo ou use o menu lateral / botão <strong>Áreas</strong> no topo.
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                {commerceModules.length} módulo(s) ativo(s)
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {commerceModules.map((modId) => {
                const mod = getModuleById(modId);
                return (
                  <Card
                    key={modId}
                    className="hover:shadow-md transition-all cursor-pointer border-emerald-100"
                    onClick={() => setActiveArea(modId)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                          {COMMERCE_ICON[modId]}
                        </div>
                        <Badge variant="secondary">Módulo Comercial</Badge>
                      </div>
                      <CardTitle className="text-base pt-2">{mod?.name ?? modId}</CardTitle>
                      <CardDescription className="text-xs">{mod?.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full" onClick={() => setActiveArea(modId)}>
                        Abrir {mod?.shortName} <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <CommerceWorkspace
            contract={contract}
            activeModule={effectiveArea as CommerceModuleId}
            onSelectModule={(m) => setActiveArea(m)}
          />
        )}
      </ClientShell>
    </div>
  );
};
