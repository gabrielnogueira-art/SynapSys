import { useMemo, useState } from "react";
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
  UserCog,
  Users,
} from "lucide-react";
import { ChurchModuleId, ContractOverrides, PlatformContract } from "@/platform/types";
import { EbdPortal } from "@/systems/ebd/EbdPortal";
import { ChurchTreasuryPreview, TreasurySection } from "@/systems/church/ChurchTreasuryPreview";
import { ChurchSecretariatPreview, SecretariatSection } from "@/systems/church/ChurchSecretariatPreview";
import { ChurchOverviewPanel } from "@/systems/church/ChurchOverviewPanel";
import { ContractBanner } from "@/platform/components/ContractBanner";
import { AreaKey, ClientShell, ShellSidebarItem } from "@/platform/components/ClientShell";
import { getModuleById } from "@/platform/catalog";

interface ChurchWorkspaceProps {
  contract: PlatformContract;
  overrides?: ContractOverrides;
}

/**
 * Workspace modular do segmento Igreja (Painel Geral + EBD, Tesouraria, Secretaria).
 * Exibe Painel Geral inicial quando a igreja possui múltiplas áreas e navega entre elas
 * pela sidebar esquerda ou pelo seletor de áreas no topo direito.
 */
export const ChurchWorkspace = ({ contract, overrides }: ChurchWorkspaceProps) => {
  const navigate = useNavigate();
  const enabledChurchModules = contract.activeModules.filter((m): m is ChurchModuleId =>
    m.startsWith("igreja_")
  );

  // Se a igreja tem mais de 1 área contratada, inicia no Painel Geral
  const defaultArea: AreaKey =
    enabledChurchModules.length > 1
      ? "painel_geral"
      : enabledChurchModules[0] ?? "igreja_ebd";

  const [activeArea, setActiveArea] = useState<AreaKey>(defaultArea);
  const [secSection, setSecSection] = useState<SecretariatSection>("dashboard");
  const [treasurySection, setTreasurySection] = useState<TreasurySection>("dashboard");

  const effectiveArea: AreaKey =
    activeArea === "painel_geral" ||
    enabledChurchModules.includes(activeArea as ChurchModuleId)
      ? activeArea
      : defaultArea;

  const sidebarItems = useMemo<ShellSidebarItem[]>(() => {
    const homeItem: ShellSidebarItem = {
      id: "menu-inicial",
      label: "Menu Inicial (Painel Geral)",
      icon: <Home className="h-4 w-4" />,
      active: effectiveArea === "painel_geral",
      onClick: () => setActiveArea("painel_geral"),
    };

    if (effectiveArea === "painel_geral") {
      return [
        homeItem,
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
        homeItem,
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
        homeItem,
        {
          id: "tr-dash",
          label: "Dashboard Financeiro",
          icon: <LayoutDashboard className="h-4 w-4" />,
          active: treasurySection === "dashboard",
          onClick: () => setTreasurySection("dashboard"),
        },
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
      ];
    }

    // EBD
    return [
      homeItem,
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
        label: "Área Administrativa",
        icon: <UserCog className="h-4 w-4" />,
        onClick: () => navigate(`${contract.entryPath}/login`),
      },
    ];
  }, [
    effectiveArea,
    enabledChurchModules,
    secSection,
    treasurySection,
    navigate,
    contract.entryPath,
  ]);

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
        customInstitutionTitle={overrides?.customBrandTitle}
      >
        {effectiveArea === "painel_geral" && (
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
          />
        )}
        {effectiveArea === "igreja_secretaria" && (
          <ChurchSecretariatPreview
            contractId={contract.id}
            clientName={contract.clientName}
            activeSection={secSection}
            onChangeSection={setSecSection}
          />
        )}
      </ClientShell>
    </div>
  );
};
