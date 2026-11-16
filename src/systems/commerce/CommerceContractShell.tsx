import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  ShieldAlert,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import { CommerceModuleId, ModuleId, PlatformContract } from "@/platform/types";
import { ContractBanner } from "@/platform/components/ContractBanner";
import { AreaKey, ClientShell, ShellSidebarItem } from "@/platform/components/ClientShell";
import { CommerceWorkspace } from "@/systems/commerce/CommerceWorkspace";
import { getModuleById } from "@/platform/catalog";
import { isModuleAllowed } from "@/platform/contractLinks";
import { useContractAccess } from "@/platform/useContractAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { switchToOwnerMode, useViewerSession } from "@/platform/session";
import { supabase } from "@/integrations/supabase/client";

const COMMERCE_ICON: Record<CommerceModuleId, React.ReactNode> = {
  comercio_tesouraria: <DollarSign className="h-4 w-4" />,
  comercio_secretaria: <ClipboardList className="h-4 w-4" />,
  comercio_estoque: <Package className="h-4 w-4" />,
  comercio_rh: <Users className="h-4 w-4" />,
  comercio_pdv: <ShoppingCart className="h-4 w-4" />,
};

export const CommerceContractShell = ({
  contract,
  initialArea,
}: {
  contract: PlatformContract;
  initialArea?: ModuleId;
}) => {
  const navigate = useNavigate();
  const session = useViewerSession();
  const access = useContractAccess(contract.id);
  const role = useUserRole();

  const effectiveAllowed =
    session.mode === "client"
      ? session.allowedModules && session.allowedModules.length > 0
        ? session.allowedModules
        : null
      : role.role === "master"
      ? null
      : access.allowedModules;

  const commerceModules = useMemo(
    () =>
      contract.activeModules.filter(
        (m): m is CommerceModuleId =>
          m.startsWith("comercio_") && isModuleAllowed(effectiveAllowed, m)
      ),
    [contract.activeModules, effectiveAllowed]
  );

  const showOverview = commerceModules.length > 1;

  const defaultArea: AreaKey =
    initialArea && commerceModules.includes(initialArea as CommerceModuleId)
      ? initialArea
      : showOverview
      ? "painel_geral"
      : commerceModules[0] ?? "comercio_tesouraria";

  const [activeArea, setActiveArea] = useState<AreaKey>(defaultArea);

  useEffect(() => {
    if (initialArea && commerceModules.includes(initialArea as CommerceModuleId)) {
      setActiveArea(initialArea);
    }
  }, [initialArea, commerceModules]);

  const effectiveArea: AreaKey =
    (activeArea === "painel_geral" && showOverview) ||
    commerceModules.includes(activeArea as CommerceModuleId)
      ? activeArea
      : defaultArea;

  const sidebarItems = useMemo<ShellSidebarItem[]>(() => {
    const items: ShellSidebarItem[] = [];
    if (showOverview) {
      items.push({
        id: "menu-inicial",
        label: "Menu Inicial (Painel Geral)",
        icon: <Home className="h-4 w-4" />,
        active: effectiveArea === "painel_geral",
        onClick: () => setActiveArea("painel_geral"),
      });
    }
    return [
      ...items,
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
  }, [showOverview, effectiveArea, commerceModules]);

  if (commerceModules.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Nenhuma área liberada
            </CardTitle>
            <CardDescription>
              Esta conta não possui áreas habilitadas dentro do contrato {contract.code}. Solicite ao administrador do contrato.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            {session.mode === "client" && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  switchToOwnerMode();
                  navigate("/plataforma");
                }}
              >
                Voltar à Plataforma
              </Button>
            )}
            <Button
              className="w-full"
              onClick={async () => {
                await supabase.auth.signOut();
                switchToOwnerMode();
                navigate(`${contract.entryPath}/login`);
              }}
            >
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        visibleModules={commerceModules}
        showOverview={showOverview}
      >
        {effectiveArea === "painel_geral" && showOverview ? (
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
                {commerceModules.length} módulo(s) liberado(s)
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
