import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  Building2,
  CalendarDays,
  FileBadge2,
  FileText,
  Home,
  Landmark,
  LayoutDashboard,
  Music4,
  PlusCircle,
  Settings2,
  ShieldAlert,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChurchModuleId, ContractOverrides, ModuleId, PlatformContract } from "@/platform/types";
import { EbdPortal } from "@/systems/ebd/EbdPortal";
import { ChurchTreasuryPreview, TreasurySection } from "@/systems/church/ChurchTreasuryPreview";
import { ChurchSecretariatPreview, SecretariatSection } from "@/systems/church/ChurchSecretariatPreview";
import { ChurchOverviewPanel } from "@/systems/church/ChurchOverviewPanel";
import { ContractBanner } from "@/platform/components/ContractBanner";
import { AreaKey, ClientShell, ShellSidebarItem } from "@/platform/components/ClientShell";
import { getModuleById } from "@/platform/catalog";
import { isModuleAllowed } from "@/platform/contractLinks";
import { useContractAccess } from "@/platform/useContractAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { switchToOwnerMode, useViewerSession } from "@/platform/session";
import { supabase } from "@/integrations/supabase/client";

interface ChurchWorkspaceProps {
  contract: PlatformContract;
  overrides?: ContractOverrides;
  initialArea?: ModuleId;
}

/**
 * Workspace modular do segmento Igreja (Painel Geral + EBD, Tesouraria, Secretaria).
 * Exibe apenas os módulos liberados para o usuário autenticado (ou simulado)
 * e vai direto para a área quando o usuário possui acesso a um único módulo.
 */
export const ChurchWorkspace = ({ contract, overrides, initialArea }: ChurchWorkspaceProps) => {
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

  const effectiveLevels =
    session.mode === "client"
      ? session.moduleLevels ?? null
      : role.role === "master"
      ? null
      : access.moduleLevels;

  const treasuryLevel = effectiveLevels?.igreja_tesouraria ?? "admin";
  const secretariatLevel = effectiveLevels?.igreja_secretaria ?? "admin";

  const enabledChurchModules = useMemo(
    () =>
      contract.activeModules.filter(
        (m): m is ChurchModuleId => m.startsWith("igreja_") && isModuleAllowed(effectiveAllowed, m)
      ),
    [contract.activeModules, effectiveAllowed]
  );

  const showOverview = enabledChurchModules.length > 1;

  const defaultArea: AreaKey =
    initialArea && enabledChurchModules.includes(initialArea as ChurchModuleId)
      ? initialArea
      : showOverview
      ? "painel_geral"
      : enabledChurchModules[0] ?? "igreja_ebd";

  const [activeArea, setActiveArea] = useState<AreaKey>(defaultArea);
  const [secSection, setSecSection] = useState<SecretariatSection>("dashboard");
  const [treasurySection, setTreasurySection] = useState<TreasurySection>("dashboard");

  useEffect(() => {
    if (initialArea && enabledChurchModules.includes(initialArea as ChurchModuleId)) {
      setActiveArea(initialArea);
    }
  }, [initialArea, enabledChurchModules]);

  const effectiveArea: AreaKey =
    (activeArea === "painel_geral" && showOverview) ||
    enabledChurchModules.includes(activeArea as ChurchModuleId)
      ? activeArea
      : defaultArea;

  const isAuthenticated = access.signedIn || Boolean(role.role);
  const isProfessor = role.role === "professor_classe";

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

    if (effectiveArea === "painel_geral") {
      return [
        ...items,
        ...enabledChurchModules.map((modId) => {
          const mod = getModuleById(modId);
          const icon =
            modId === "igreja_ebd" ? (
              <BookOpen className="h-4 w-4" />
            ) : modId === "igreja_tesouraria" ? (
              <Landmark className="h-4 w-4" />
            ) : (
              <Building2 className="h-4 w-4" />
            );
          return {
            id: modId,
            label: mod?.shortName ?? modId,
            icon,
            active: false,
            onClick: () => setActiveArea(modId),
          };
        }),
      ];
    }

    if (effectiveArea === "igreja_secretaria") {
      return [
        ...items,
        {
          id: "sec-dash",
          label: "Dashboard",
          icon: <LayoutDashboard className="h-4 w-4" />,
          active: secSection === "dashboard",
          onClick: () => setSecSection("dashboard"),
        },
        {
          id: "sec-pessoas",
          label: "Pessoas / Membros",
          icon: <Users className="h-4 w-4" />,
          active: secSection === "pessoas",
          onClick: () => setSecSection("pessoas"),
        },
        {
          id: "sec-igrejas",
          label: "Igrejas / Congregações",
          icon: <Building2 className="h-4 w-4" />,
          active: secSection === "igrejas",
          onClick: () => setSecSection("igrejas"),
        },
        {
          id: "sec-docs",
          label: "Emissão de Documentos",
          icon: <FileBadge2 className="h-4 w-4" />,
          active: secSection === "documentos",
          onClick: () => setSecSection("documentos"),
        },
        {
          id: "sec-agenda",
          label: "Agenda Pastoral",
          icon: <CalendarDays className="h-4 w-4" />,
          active: secSection === "agenda",
          onClick: () => setSecSection("agenda"),
        },
      ];
    }

    if (effectiveArea === "igreja_tesouraria") {
      return [
        ...items,
        {
          id: "tr-dash",
          label: "Dashboard Financeiro",
          icon: <LayoutDashboard className="h-4 w-4" />,
          active: treasurySection === "dashboard",
          onClick: () => setTreasurySection("dashboard"),
        },
        ...(treasuryLevel !== "consulta"
          ? [
              {
                id: "tr-launch",
                label: "Lançamento Simplificado",
                icon: <PlusCircle className="h-4 w-4" />,
                active: treasurySection === "lancamento",
                onClick: () => setTreasurySection("lancamento"),
              },
            ]
          : []),
        {
          id: "tr-ent",
          label: "Entradas (Dízimos / Ofertas)",
          icon: <ArrowUpCircle className="h-4 w-4" />,
          active: treasurySection === "entradas",
          onClick: () => setTreasurySection("entradas"),
        },
        {
          id: "tr-sai",
          label: "Saídas & Despesas",
          icon: <ArrowDownCircle className="h-4 w-4" />,
          active: treasurySection === "saidas",
          onClick: () => setTreasurySection("saidas"),
        },
        {
          id: "tr-conf",
          label: "Conferência por Responsável",
          icon: <UserCheck className="h-4 w-4" />,
          active: treasurySection === "conferencia",
          onClick: () => setTreasurySection("conferencia"),
        },
        ...(treasuryLevel === "admin"
          ? [
              {
                id: "tr-pref",
                label: "Predefinições & Listas",
                icon: <Settings2 className="h-4 w-4" />,
                active: treasurySection === "predefinicoes",
                onClick: () => setTreasurySection("predefinicoes"),
              },
            ]
          : []),
      ];
    }

    // EBD
    return [
      ...items,
      {
        id: "ebd-portal",
        label: "Portal EBD",
        icon: <BookOpen className="h-4 w-4" />,
        active: true,
        onClick: () => setActiveArea("igreja_ebd"),
      },
      {
        id: "ebd-form",
        label: "Formulário de Aula",
        icon: <FileText className="h-4 w-4" />,
        onClick: () => navigate(`${contract.entryPath}/form`),
      },
      {
        id: "ebd-choir",
        label: "Hinos (Coristas)",
        icon: <Music4 className="h-4 w-4" />,
        onClick: () => navigate(`${contract.entryPath}/coristas`),
      },
      {
        id: "ebd-login",
        label: isProfessor ? "Painel do Professor" : "Painel Administrativo",
        icon: <UserCog className="h-4 w-4" />,
        onClick: () =>
          navigate(
            isAuthenticated
              ? isProfessor
                ? `${contract.entryPath}/professor`
                : `${contract.entryPath}/admin`
              : `${contract.entryPath}/login?next=${encodeURIComponent(`${contract.entryPath}/admin`)}`
          ),
      },
    ];
  }, [
    showOverview,
    effectiveArea,
    enabledChurchModules,
    secSection,
    treasurySection,
    treasuryLevel,
    navigate,
    contract.entryPath,
    isAuthenticated,
    isProfessor,
  ]);

  if (enabledChurchModules.length === 0) {
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
            ? enabledChurchModules[0]
            : (effectiveArea as ChurchModuleId)
        }
        onSelectModule={(m) => setActiveArea(m as ChurchModuleId)}
      />

      <ClientShell
        contract={contract}
        activeArea={effectiveArea}
        onSelectArea={setActiveArea}
        sidebarItems={sidebarItems}
        visibleModules={enabledChurchModules}
        showOverview={showOverview}
        customInstitutionTitle={overrides?.customBrandTitle}
      >
        {effectiveArea === "painel_geral" && showOverview && (
          <ChurchOverviewPanel
            contract={contract}
            enabledModules={enabledChurchModules}
            onOpenArea={(area) => setActiveArea(area)}
          />
        )}
        {effectiveArea === "igreja_ebd" && (
          <EbdPortal
            contract={contract}
            overrides={overrides}
            basePath={contract.entryPath}
          />
        )}
        {effectiveArea === "igreja_tesouraria" && (
          <ChurchTreasuryPreview
            contractId={contract.id}
            clientName={contract.clientName}
            activeSection={treasurySection}
            onChangeSection={setTreasurySection}
            moduleLevel={treasuryLevel}
          />
        )}
        {effectiveArea === "igreja_secretaria" && (
          <ChurchSecretariatPreview
            contractId={contract.id}
            clientName={contract.clientName}
            activeSection={secSection}
            onChangeSection={setSecSection}
            moduleLevel={secretariatLevel}
          />
        )}
      </ClientShell>
    </div>
  );
};
