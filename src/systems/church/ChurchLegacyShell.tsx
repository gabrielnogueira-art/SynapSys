import { ReactNode, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowDownCircle,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Church,
  ClipboardList,
  DollarSign,
  FileBadge2,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Grip,
  HandHeart,
  Home,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Printer,
  Receipt,
  Settings2,
  User,
  UserCheck,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChurchModuleId, ContractOverrides, ModuleId, PlatformContract } from "@/platform/types";
import { getModuleById } from "@/platform/catalog";
import { useContractAccess } from "@/platform/useContractAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { switchToOwnerMode, useViewerSession } from "@/platform/session";
import { supabase } from "@/integrations/supabase/client";
import { ChurchSecretariatPreview, SecretariatSection } from "@/systems/church/ChurchSecretariatPreview";
import { ChurchTreasuryPreview, TreasurySection } from "@/systems/church/ChurchTreasuryPreview";
import { EbdPortal } from "@/systems/ebd/EbdPortal";
import {
  ChurchCantinaContractView,
  ChurchLivrariaContractView,
  ChurchMembroContractView,
  ChurchSocialContractView,
} from "@/systems/church/modules/ChurchLabContractAdapters";

export type LegacyTabId =
  | "sec-dashboard"
  | "sec-pessoas"
  | "sec-igrejas"
  | "sec-documentos"
  | "sec-agenda"
  | "tr-extrato"
  | "tr-lancamento"
  | "tr-entradas"
  | "tr-saidas"
  | "tr-conferencia"
  | "tr-relatorios"
  | "tr-predefinicoes"
  | "ebd-portal"
  | "extra-cantina"
  | "extra-livraria"
  | "extra-social"
  | "extra-membro";

interface TabCatalogEntry {
  id: LegacyTabId;
  title: string;
  module: ChurchModuleId;
}

const LEGACY_TAB_CATALOG: Record<LegacyTabId, TabCatalogEntry> = {
  "sec-dashboard": { id: "sec-dashboard", title: "Dashboard Secretaria", module: "igreja_secretaria" },
  "sec-pessoas": { id: "sec-pessoas", title: "Cadastro de Membros", module: "igreja_secretaria" },
  "sec-igrejas": { id: "sec-igrejas", title: "Igrejas / Congregações", module: "igreja_secretaria" },
  "sec-documentos": { id: "sec-documentos", title: "Emissão de Documentos", module: "igreja_secretaria" },
  "sec-agenda": { id: "sec-agenda", title: "Agenda Pastoral", module: "igreja_secretaria" },
  "tr-extrato": { id: "tr-extrato", title: "Extrato Bancário & Saldos", module: "igreja_tesouraria" },
  "tr-lancamento": { id: "tr-lancamento", title: "Lançamento Simplificado", module: "igreja_tesouraria" },
  "tr-entradas": { id: "tr-entradas", title: "Lançamentos Financeiros", module: "igreja_tesouraria" },
  "tr-saidas": { id: "tr-saidas", title: "Saídas & Pagamentos", module: "igreja_tesouraria" },
  "tr-conferencia": { id: "tr-conferencia", title: "Conferência de Caixa", module: "igreja_tesouraria" },
  "tr-relatorios": { id: "tr-relatorios", title: "Encerramento do Caixa / Balancete", module: "igreja_tesouraria" },
  "tr-predefinicoes": { id: "tr-predefinicoes", title: "Configurar Lançamento", module: "igreja_tesouraria" },
  "ebd-portal": { id: "ebd-portal", title: "Portal EBD", module: "igreja_ebd" },
  "extra-cantina": { id: "extra-cantina", title: "Cantina & Eventos", module: "igreja_cantina" },
  "extra-livraria": { id: "extra-livraria", title: "Livraria EBD", module: "igreja_livraria" },
  "extra-social": { id: "extra-social", title: "Ação Social & Cestas", module: "igreja_social" },
  "extra-membro": { id: "extra-membro", title: "Portal do Membro & PIX", module: "igreja_membro" },
};

type FloatingMenuKind = "cadastros" | "lancamentos" | "relatorios" | "departamentos" | null;

interface GridTileAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface ReportLinkAction {
  key: string;
  label: string;
  onClick: () => void;
}

interface ChurchLegacyShellProps {
  contract: PlatformContract;
  overrides?: ContractOverrides;
  enabledChurchModules: ChurchModuleId[];
  effectiveLevels: Partial<Record<ModuleId, string>> | null;
  layoutMode: "moderno" | "legado";
  onChangeLayoutMode: (mode: "moderno" | "legado") => void;
}

const SEC_SECTION_BY_TAB: Partial<Record<LegacyTabId, SecretariatSection>> = {
  "sec-dashboard": "dashboard",
  "sec-pessoas": "pessoas",
  "sec-igrejas": "igrejas",
  "sec-documentos": "documentos",
  "sec-agenda": "agenda",
};

const TR_SECTION_BY_TAB: Partial<Record<LegacyTabId, TreasurySection>> = {
  "tr-extrato": "dashboard",
  "tr-lancamento": "lancamento",
  "tr-entradas": "entradas",
  "tr-saidas": "saidas",
  "tr-conferencia": "conferencia",
  "tr-relatorios": "relatorios",
  "tr-predefinicoes": "predefinicoes",
};

const SEC_TAB_BY_SECTION: Record<SecretariatSection, LegacyTabId> = {
  dashboard: "sec-dashboard",
  pessoas: "sec-pessoas",
  igrejas: "sec-igrejas",
  documentos: "sec-documentos",
  agenda: "sec-agenda",
};

const TR_TAB_BY_SECTION: Record<TreasurySection, LegacyTabId> = {
  dashboard: "tr-extrato",
  lancamento: "tr-lancamento",
  entradas: "tr-entradas",
  saidas: "tr-saidas",
  conferencia: "tr-conferencia",
  relatorios: "tr-relatorios",
  predefinicoes: "tr-predefinicoes",
};

export const ChurchLegacyShell = ({
  contract,
  overrides,
  enabledChurchModules,
  effectiveLevels,
  layoutMode,
  onChangeLayoutMode,
}: ChurchLegacyShellProps) => {
  const navigate = useNavigate();
  const session = useViewerSession();
  const access = useContractAccess(contract.id);
  const role = useUserRole();

  const treasuryLevel = effectiveLevels?.igreja_tesouraria ?? "admin";
  const secretariatLevel = effectiveLevels?.igreja_secretaria ?? "admin";
  const hasSecretariat = enabledChurchModules.includes("igreja_secretaria");
  const hasTreasury = enabledChurchModules.includes("igreja_tesouraria");
  const hasEbd = enabledChurchModules.includes("igreja_ebd");
  const extraModules = useMemo(
    () =>
      enabledChurchModules.filter(
        (m) =>
          m === "igreja_cantina" ||
          m === "igreja_livraria" ||
          m === "igreja_social" ||
          m === "igreja_membro"
      ),
    [enabledChurchModules]
  );

  const canManageContract =
    session.mode === "client"
      ? session.accessLevel === "gestor_contrato"
      : access.manager;

  const isTabAllowed = useMemo(() => {
    return (tabId: LegacyTabId): boolean => {
      const meta = LEGACY_TAB_CATALOG[tabId];
      if (!enabledChurchModules.includes(meta.module)) return false;
      if (tabId === "tr-lancamento" && treasuryLevel === "consulta") return false;
      if (tabId === "tr-predefinicoes" && treasuryLevel !== "admin") return false;
      return true;
    };
  }, [enabledChurchModules, treasuryLevel]);

  const initialTabId = useMemo<LegacyTabId | null>(() => {
    if (hasSecretariat) return "sec-dashboard";
    if (hasTreasury) return treasuryLevel !== "consulta" ? "tr-lancamento" : "tr-extrato";
    if (hasEbd) return "ebd-portal";
    if (extraModules[0] === "igreja_cantina") return "extra-cantina";
    if (extraModules[0] === "igreja_livraria") return "extra-livraria";
    if (extraModules[0] === "igreja_social") return "extra-social";
    if (extraModules[0] === "igreja_membro") return "extra-membro";
    return null;
  }, [hasSecretariat, hasTreasury, hasEbd, extraModules, treasuryLevel]);

  const [openTabs, setOpenTabs] = useState<LegacyTabId[]>(() =>
    initialTabId ? [initialTabId] : []
  );
  const [activeTabId, setActiveTabId] = useState<LegacyTabId | null>(initialTabId);
  const [mountedModules, setMountedModules] = useState<{
    sec: boolean;
    tr: boolean;
    ebd: boolean;
    cantina: boolean;
    livraria: boolean;
    social: boolean;
    membro: boolean;
  }>(() => ({
    sec: initialTabId?.startsWith("sec-") ?? false,
    tr: initialTabId?.startsWith("tr-") ?? false,
    ebd: initialTabId === "ebd-portal",
    cantina: initialTabId === "extra-cantina",
    livraria: initialTabId === "extra-livraria",
    social: initialTabId === "extra-social",
    membro: initialTabId === "extra-membro",
  }));
  const [lastSecSection, setLastSecSection] = useState<SecretariatSection>("dashboard");
  const [lastTrSection, setLastTrSection] = useState<TreasurySection>(
    treasuryLevel !== "consulta" ? "lancamento" : "dashboard"
  );

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [floatingMenu, setFloatingMenu] = useState<FloatingMenuKind>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const openOrFocusTab = useCallback(
    (tabId: LegacyTabId) => {
      if (!isTabAllowed(tabId)) return;
      setOpenTabs((prev) => (prev.includes(tabId) ? prev : [...prev, tabId]));
      setActiveTabId(tabId);
      setFloatingMenu(null);
      setMobileOpen(false);
      setMountedModules((prev) => ({
        sec: prev.sec || tabId.startsWith("sec-"),
        tr: prev.tr || tabId.startsWith("tr-"),
        ebd: prev.ebd || tabId === "ebd-portal",
        cantina: prev.cantina || tabId === "extra-cantina",
        livraria: prev.livraria || tabId === "extra-livraria",
        social: prev.social || tabId === "extra-social",
        membro: prev.membro || tabId === "extra-membro",
      }));
      const secSec = SEC_SECTION_BY_TAB[tabId];
      if (secSec) setLastSecSection(secSec);
      const trSec = TR_SECTION_BY_TAB[tabId];
      if (trSec) setLastTrSection(trSec);
    },
    [isTabAllowed]
  );

  const closeTab = (tabId: LegacyTabId) => {
    setOpenTabs((prev) => {
      const idx = prev.indexOf(tabId);
      const next = prev.filter((t) => t !== tabId);
      if (activeTabId === tabId) {
        const fallback = next[idx] ?? next[idx - 1] ?? null;
        setActiveTabId(fallback);
        if (fallback) {
          const secSec = SEC_SECTION_BY_TAB[fallback];
          if (secSec) setLastSecSection(secSec);
          const trSec = TR_SECTION_BY_TAB[fallback];
          if (trSec) setLastTrSection(trSec);
        }
      }
      return next;
    });
  };

  const institutionHeader = (
    overrides?.customBrandTitle ||
    [contract.clientName, contract.city].filter(Boolean).join(" — ")
  ).toUpperCase();

  const leaderSub =
    contract.branding?.presidentPastor ||
    (contract.responsibleName
      ? contract.responsibleName.toUpperCase()
      : "PASTOR / GESTÃO ECLESIÁSTICA");

  const userDisplay =
    session.mode === "client"
      ? {
          name: session.userName,
          role: session.roleLabel,
          email: session.userEmail,
          congregation: session.assignedCongregation,
        }
      : access.signedIn
      ? {
          name: access.userName || access.userEmail || "Usuário",
          role: access.roleLabel || "Acesso Autenticado",
          email: access.userEmail || "",
          congregation: access.assignedCongregation ?? undefined,
        }
      : {
          name: contract.responsibleName || "Administrador",
          role: "Acesso Preview (Empreendedor)",
          email: contract.responsibleEmail || "admin@sistema.local",
          congregation: undefined,
        };

  const sidebarModuleBadge = useMemo(() => {
    if (!activeTabId) return hasTreasury ? "FINANCEIRO" : "SECRETARIA";
    if (activeTabId.startsWith("tr-")) return "FINANCEIRO";
    if (activeTabId.startsWith("sec-")) return "SECRETARIA";
    if (activeTabId === "ebd-portal") return "EBD";
    return "DEPARTAMENTOS";
  }, [activeTabId, hasTreasury]);

  const cadastrosTiles = useMemo<GridTileAction[]>(() => {
    const tiles: GridTileAction[] = [];
    if (hasSecretariat) {
      tiles.push(
        {
          key: "sec-pessoas",
          label: "Pessoas / Membros",
          icon: <Users className="h-7 w-7 text-slate-700" />,
          onClick: () => openOrFocusTab("sec-pessoas"),
        },
        {
          key: "sec-igrejas",
          label: "Igrejas / Congregações",
          icon: <Building2 className="h-7 w-7 text-slate-700" />,
          onClick: () => openOrFocusTab("sec-igrejas"),
        },
        {
          key: "sec-documentos",
          label: "Emissão de Documentos",
          icon: <FileBadge2 className="h-7 w-7 text-slate-700" />,
          onClick: () => openOrFocusTab("sec-documentos"),
        },
        {
          key: "sec-agenda",
          label: "Agenda Pastoral",
          icon: <CalendarDays className="h-7 w-7 text-slate-700" />,
          onClick: () => openOrFocusTab("sec-agenda"),
        }
      );
    }
    if (hasTreasury && treasuryLevel === "admin") {
      tiles.push({
        key: "tr-predefinicoes",
        label: "Predefinições Cadastrais",
        icon: <Settings2 className="h-7 w-7 text-slate-700" />,
        onClick: () => openOrFocusTab("tr-predefinicoes"),
      });
    }
    if (hasEbd) {
      tiles.push({
        key: "ebd-portal",
        label: "Classes & Alunos EBD",
        icon: <BookOpen className="h-7 w-7 text-slate-700" />,
        onClick: () => openOrFocusTab("ebd-portal"),
      });
    }
    if (canManageContract) {
      tiles.push({
        key: "ctr-users",
        label: "Usuários & Logins",
        icon: <UserCheck className="h-7 w-7 text-slate-700" />,
        onClick: () => {
          setFloatingMenu(null);
          navigate(`${contract.entryPath}/users`);
        },
      });
    }
    return tiles;
  }, [
    hasSecretariat,
    hasTreasury,
    treasuryLevel,
    hasEbd,
    canManageContract,
    contract.entryPath,
    openOrFocusTab,
    navigate,
  ]);

  const lancamentosTiles = useMemo<GridTileAction[]>(() => {
    const tiles: GridTileAction[] = [];
    if (hasTreasury) {
      if (treasuryLevel !== "consulta") {
        tiles.push({
          key: "tr-lancamento",
          label: "Lançamento Simplificado",
          icon: <DollarSign className="h-7 w-7 text-slate-700" />,
          onClick: () => openOrFocusTab("tr-lancamento"),
        });
      }
      tiles.push(
        {
          key: "tr-entradas",
          label: "Lançamentos Financeiros",
          icon: <FileSpreadsheet className="h-7 w-7 text-slate-700" />,
          onClick: () => openOrFocusTab("tr-entradas"),
        },
        {
          key: "tr-saidas",
          label: "Saídas & Pagamentos",
          icon: <ArrowDownCircle className="h-7 w-7 text-slate-700" />,
          onClick: () => openOrFocusTab("tr-saidas"),
        },
        {
          key: "tr-conferencia",
          label: "Conferência de Caixa",
          icon: <UserCheck className="h-7 w-7 text-slate-700" />,
          onClick: () => openOrFocusTab("tr-conferencia"),
        },
        {
          key: "tr-extrato",
          label: "Extrato Bancário",
          icon: <Landmark className="h-7 w-7 text-slate-700" />,
          onClick: () => openOrFocusTab("tr-extrato"),
        },
        {
          key: "tr-relatorios",
          label: "Repasse / Encerramento",
          icon: <Archive className="h-7 w-7 text-slate-700" />,
          onClick: () => openOrFocusTab("tr-relatorios"),
        }
      );
    }
    if (hasEbd) {
      tiles.push({
        key: "ebd-form",
        label: "Lançar Chamada EBD",
        icon: <ClipboardList className="h-7 w-7 text-slate-700" />,
        onClick: () => {
          setFloatingMenu(null);
          navigate(`${contract.entryPath}/form`);
        },
      });
    }
    if (enabledChurchModules.includes("igreja_membro")) {
      tiles.push({
        key: "extra-membro",
        label: "Dízimo Digital (PIX)",
        icon: <Receipt className="h-7 w-7 text-slate-700" />,
        onClick: () => openOrFocusTab("extra-membro"),
      });
    }
    return tiles;
  }, [
    hasTreasury,
    treasuryLevel,
    hasEbd,
    enabledChurchModules,
    contract.entryPath,
    openOrFocusTab,
    navigate,
  ]);

  const reportLinks = useMemo<ReportLinkAction[]>(() => {
    const list: ReportLinkAction[] = [];
    if (hasTreasury) {
      list.push(
        {
          key: "r-livro",
          label: "Livro de Lançamento Financeiro",
          onClick: () => openOrFocusTab("tr-entradas"),
        },
        {
          key: "r-extrato",
          label: "Extrato de Conta Corrente",
          onClick: () => openOrFocusTab("tr-extrato"),
        },
        {
          key: "r-balancete",
          label: "Balancete Analítico (Plano de Contas)",
          onClick: () => openOrFocusTab("tr-relatorios"),
        },
        {
          key: "r-especie",
          label: "Resumo por Espécie (Dinheiro / PIX)",
          onClick: () => openOrFocusTab("tr-relatorios"),
        },
        {
          key: "r-repasse",
          label: "Repasse / Movimento por Congregação",
          onClick: () => openOrFocusTab("tr-relatorios"),
        },
        {
          key: "r-caixa",
          label: "Encerramento do Caixa (Imprimir)",
          onClick: () => openOrFocusTab("tr-relatorios"),
        },
        {
          key: "r-operador",
          label: "Conferência por Responsável",
          onClick: () => openOrFocusTab("tr-conferencia"),
        },
        {
          key: "r-saidas",
          label: "Relação de Saídas & Despesas",
          onClick: () => openOrFocusTab("tr-saidas"),
        }
      );
    }
    if (hasSecretariat) {
      list.push(
        {
          key: "r-aniv",
          label: "Aniversariantes (Dia / Semana / Mês)",
          onClick: () => openOrFocusTab("sec-dashboard"),
        },
        {
          key: "r-faixa",
          label: "Faixa Etária & Cargos Eclesiásticos",
          onClick: () => openOrFocusTab("sec-dashboard"),
        },
        {
          key: "r-prof",
          label: "Top 10 Profissões Declaradas",
          onClick: () => openOrFocusTab("sec-dashboard"),
        },
        {
          key: "r-docs",
          label: "Emissão de Cartas & Certificados",
          onClick: () => openOrFocusTab("sec-documentos"),
        }
      );
    }
    if (hasEbd) {
      list.push({
        key: "r-ebd",
        label: "Painel & Relatórios EBD",
        onClick: () => openOrFocusTab("ebd-portal"),
      });
    }
    return list;
  }, [hasTreasury, hasSecretariat, hasEbd, openOrFocusTab]);

  const departmentTiles = useMemo<GridTileAction[]>(() => {
    const tiles: GridTileAction[] = [];
    if (enabledChurchModules.includes("igreja_cantina")) {
      tiles.push({
        key: "extra-cantina",
        label: "Cantina & Eventos",
        icon: <UtensilsCrossed className="h-7 w-7 text-slate-700" />,
        onClick: () => openOrFocusTab("extra-cantina"),
      });
    }
    if (enabledChurchModules.includes("igreja_livraria")) {
      tiles.push({
        key: "extra-livraria",
        label: "Livraria & Materiais EBD",
        icon: <BookOpen className="h-7 w-7 text-slate-700" />,
        onClick: () => openOrFocusTab("extra-livraria"),
      });
    }
    if (enabledChurchModules.includes("igreja_social")) {
      tiles.push({
        key: "extra-social",
        label: "Ação Social & Cestas",
        icon: <HandHeart className="h-7 w-7 text-slate-700" />,
        onClick: () => openOrFocusTab("extra-social"),
      });
    }
    if (enabledChurchModules.includes("igreja_membro")) {
      tiles.push({
        key: "extra-membro",
        label: "Portal do Membro & PIX",
        icon: <UserCheck className="h-7 w-7 text-slate-700" />,
        onClick: () => openOrFocusTab("extra-membro"),
      });
    }
    return tiles;
  }, [enabledChurchModules, openOrFocusTab]);

  const activeSecSection: SecretariatSection =
    (activeTabId && SEC_SECTION_BY_TAB[activeTabId]) ?? lastSecSection;
  const activeTreasurySection: TreasurySection =
    (activeTabId && TR_SECTION_BY_TAB[activeTabId]) ?? lastTrSection;

  const isSecVisible = Boolean(activeTabId?.startsWith("sec-"));
  const isTrVisible = Boolean(activeTabId?.startsWith("tr-"));

  return (
    <div className="min-h-screen flex bg-[#eef2f6] text-slate-900">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/45 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Vertical Esquerda (Estilo Membros Web) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-[#22282e] text-slate-200 transition-all duration-200 shrink-0 border-r border-slate-700/60 ${
          collapsed ? "w-14" : "w-52"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="h-14 px-3 flex items-center justify-between bg-[#1b2228] border-b border-slate-700/60">
          {!collapsed && (
            <span className="font-bold tracking-wider text-xs text-white truncate">
              {sidebarModuleBadge}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 ml-auto hidden lg:flex"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto text-[13px]">
          <button
            type="button"
            title={collapsed ? "Menu Inicial" : undefined}
            onClick={() => {
              if (initialTabId) openOrFocusTab(initialTabId);
              setMobileOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors text-left ${
              activeTabId === initialTabId
                ? "bg-[#32465a] text-white font-medium"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Home className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">Menu Inicial</span>}
          </button>

          {cadastrosTiles.length > 0 && (
            <button
              type="button"
              title={collapsed ? "Cadastros" : undefined}
              onClick={() => {
                setFloatingMenu("cadastros");
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors text-left ${
                floatingMenu === "cadastros"
                  ? "bg-[#32465a] text-white font-medium"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <FolderKanban className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">Cadastros</span>}
            </button>
          )}

          {lancamentosTiles.length > 0 && (
            <button
              type="button"
              title={collapsed ? "Lançamentos" : undefined}
              onClick={() => {
                setFloatingMenu("lancamentos");
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors text-left ${
                floatingMenu === "lancamentos" || activeTabId === "tr-lancamento"
                  ? "bg-[#32465a] text-white font-medium"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Wallet className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">Lançamentos</span>}
            </button>
          )}

          {hasTreasury && (
            <button
              type="button"
              title={collapsed ? "Extrato Bancário" : undefined}
              onClick={() => openOrFocusTab("tr-extrato")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors text-left ${
                activeTabId === "tr-extrato"
                  ? "bg-[#32465a] text-white font-medium"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Landmark className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">Extrato Bancário</span>}
            </button>
          )}

          {hasSecretariat && (
            <button
              type="button"
              title={collapsed ? "Documentos" : undefined}
              onClick={() => openOrFocusTab("sec-documentos")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors text-left ${
                activeTabId === "sec-documentos"
                  ? "bg-[#32465a] text-white font-medium"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <FileBadge2 className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">Documentos</span>}
            </button>
          )}

          {departmentTiles.length > 0 && (
            <button
              type="button"
              title={collapsed ? "Departamentos Extras" : undefined}
              onClick={() => {
                setFloatingMenu("departamentos");
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors text-left ${
                floatingMenu === "departamentos"
                  ? "bg-[#32465a] text-white font-medium"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">Departamentos</span>}
            </button>
          )}

          {hasTreasury && (
            <button
              type="button"
              title={collapsed ? "Encerramento do Caixa" : undefined}
              onClick={() => openOrFocusTab("tr-relatorios")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors text-left ${
                activeTabId === "tr-relatorios"
                  ? "bg-[#32465a] text-white font-medium"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Archive className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">Encerramento do Caixa</span>}
            </button>
          )}

          {reportLinks.length > 0 && (
            <button
              type="button"
              title={collapsed ? "Relatórios" : undefined}
              onClick={() => {
                setFloatingMenu("relatorios");
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors text-left ${
                floatingMenu === "relatorios"
                  ? "bg-[#32465a] text-white font-medium"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Printer className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">Relatórios</span>}
            </button>
          )}

          {canManageContract && (
            <div className="pt-2 mt-2 border-t border-slate-700/60 space-y-0.5">
              <button
                type="button"
                title={collapsed ? "Usuários do Contrato" : undefined}
                onClick={() => {
                  navigate(`${contract.entryPath}/users`);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-left"
              >
                <Users className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">Usuários</span>}
              </button>
              <button
                type="button"
                title={collapsed ? "Configurações" : undefined}
                onClick={() => {
                  navigate(`${contract.entryPath}/settings`);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-left"
              >
                <Building2 className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">Configurações</span>}
              </button>
            </div>
          )}
        </nav>

        {!collapsed && (
          <div className="p-2.5 border-t border-slate-700/60 text-[10px] text-slate-400 flex items-center gap-1.5">
            <Church className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Modo Legado (MDI)</span>
          </div>
        )}
      </aside>

      {/* Coluna Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar institucional estilo Membros Web */}
        <header className="h-14 bg-[#32465a] text-white px-3 sm:px-4 flex items-center justify-between gap-2 border-b border-slate-700 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-8 w-8 text-slate-200 hover:bg-white/10"
            >
              <Menu className="h-5 w-5" />
            </Button>
            {contract.branding?.logoUrl && (
              <img
                src={contract.branding.logoUrl}
                alt={contract.clientName}
                className="h-8 w-8 object-contain shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold tracking-wide truncate text-white">
                {institutionHeader}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-300 truncate">
                {leaderSub}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Alternador visível direto na barra superior */}
            <div
              className="inline-flex items-center rounded-md bg-black/25 p-0.5 border border-white/15 text-[11px]"
              role="group"
              aria-label="Alternar modo de layout"
            >
              <button
                type="button"
                onClick={() => onChangeLayoutMode("moderno")}
                className={`px-2 py-1 rounded transition-colors ${
                  layoutMode === "moderno"
                    ? "bg-amber-400 text-slate-950 font-semibold shadow-sm"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                <span className="hidden sm:inline">Modo </span>Moderno
              </button>
              <button
                type="button"
                onClick={() => onChangeLayoutMode("legado")}
                className={`px-2 py-1 rounded transition-colors ${
                  layoutMode === "legado"
                    ? "bg-amber-400 text-slate-950 font-semibold shadow-sm"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                <span className="hidden sm:inline">Modo </span>Legado
              </button>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-200 hover:text-white hover:bg-white/10 relative"
                  title="Avisos do sistema"
                >
                  <Bell className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 text-sm">
                <div className="font-semibold mb-1">Modo Legado ativo</div>
                <p className="text-xs text-muted-foreground">
                  As telas que você abrir ficam fixadas na barra de abas no topo preservando o que já foi digitado. Alterne para &ldquo;Modo Moderno&rdquo; a qualquer momento sem perder seus dados.
                </p>
              </PopoverContent>
            </Popover>

            <Popover open={switcherOpen} onOpenChange={setSwitcherOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-slate-100 hover:text-white hover:bg-white/10 gap-1"
                  title="Abrir janela rápida"
                >
                  <Grip className="h-4 w-4 text-amber-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-2.5 space-y-1.5 text-xs">
                <div className="font-semibold text-muted-foreground uppercase text-[10px] px-1">
                  Atalhos Rápidos
                </div>
                {cadastrosTiles.slice(0, 4).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      t.onClick();
                      setSwitcherOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-muted flex items-center justify-between"
                  >
                    <span>{t.label}</span>
                  </button>
                ))}
                {lancamentosTiles.slice(0, 4).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      t.onClick();
                      setSwitcherOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-muted flex items-center justify-between"
                  >
                    <span>{t.label}</span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-slate-200 hover:text-white hover:bg-white/10 gap-1.5"
                >
                  <div className="h-6 w-6 rounded-full bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div className="hidden md:flex flex-col items-start text-left max-w-[120px]">
                    <span className="text-[11px] truncate w-full leading-tight">
                      {userDisplay.name}
                    </span>
                    {userDisplay.congregation && (
                      <span className="text-[9px] text-amber-300 truncate w-full leading-tight">
                        {userDisplay.congregation}
                      </span>
                    )}
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold">{userDisplay.name}</div>
                  <div className="text-xs text-muted-foreground">{userDisplay.email}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {userDisplay.role}
                    </Badge>
                    {userDisplay.congregation && (
                      <Badge variant="outline" className="text-[10px]">
                        {userDisplay.congregation}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t flex flex-col gap-1.5">
                  {session.mode === "client" && (!role.role || role.role === "master") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start text-rose-600 hover:text-rose-700"
                      onClick={() => {
                        switchToOwnerMode();
                        navigate("/plataforma");
                      }}
                    >
                      <LogOut className="h-3.5 w-3.5 mr-2" /> Encerrar sessão do cliente
                    </Button>
                  )}
                  {access.signedIn || role.role ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        switchToOwnerMode();
                        navigate(`${contract.entryPath}/login`);
                      }}
                    >
                      <LogOut className="h-3.5 w-3.5 mr-2" /> Sair
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`${contract.entryPath}/login`)}
                    >
                      <LogOut className="h-3.5 w-3.5 mr-2" /> Login Admin
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Barra Horizontal de Abas MDI (Estilo Membros Web) */}
        <div className="bg-[#dde3ea] border-b border-slate-300 px-2 pt-1.5 flex items-end gap-1 overflow-x-auto min-h-[38px]">
          {openTabs.length === 0 ? (
            <div className="text-xs text-slate-600 px-2 py-1">
              Nenhuma aba aberta — escolha uma opção no menu à esquerda
            </div>
          ) : (
            openTabs.map((tabId) => {
              const meta = LEGACY_TAB_CATALOG[tabId];
              const isActive = activeTabId === tabId;
              return (
                <div
                  key={tabId}
                  className={`group inline-flex items-center gap-2 rounded-t border border-b-0 px-3 py-1.5 text-xs select-none shrink-0 transition-colors ${
                    isActive
                      ? "bg-[#eef2f6] text-slate-900 font-semibold border-slate-300 shadow-[0_-1px_0_#32465a_inset]"
                      : "bg-[#cfd7e1] text-slate-700 hover:bg-[#e1e6ed] border-slate-300/80"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openOrFocusTab(tabId)}
                    className="truncate max-w-[200px]"
                  >
                    {meta.title}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tabId);
                    }}
                    title={`Fechar ${meta.title}`}
                    className={`rounded-full p-0.5 transition-colors ${
                      isActive
                        ? "text-rose-700 hover:bg-rose-100"
                        : "text-slate-500 hover:text-rose-700 hover:bg-slate-200"
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Área de Conteúdo MDI Keep-Alive */}
        <main className="flex-1 overflow-auto bg-[#eef2f6]">
          {activeTabId === null && (
            <div className="p-6 max-w-4xl mx-auto space-y-4">
              <div className="rounded-lg border border-slate-300 bg-white p-6 space-y-4 shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Área de Trabalho — {contract.clientName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Clique em qualquer atalho abaixo ou use o menu lateral esquerdo para abrir abas.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hasSecretariat && (
                    <Button
                      size="sm"
                      onClick={() => openOrFocusTab("sec-dashboard")}
                    >
                      Abrir Dashboard Secretaria
                    </Button>
                  )}
                  {hasTreasury && treasuryLevel !== "consulta" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openOrFocusTab("tr-lancamento")}
                    >
                      Abrir Lançamento Simplificado
                    </Button>
                  )}
                  {hasTreasury && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openOrFocusTab("tr-relatorios")}
                    >
                      Encerramento do Caixa / Balancete
                    </Button>
                  )}
                  {hasEbd && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openOrFocusTab("ebd-portal")}
                    >
                      Portal EBD
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {mountedModules.sec && hasSecretariat && (
            <div className={isSecVisible ? "block" : "hidden"}>
              <ChurchSecretariatPreview
                embedded
                contractId={contract.id}
                clientName={contract.clientName}
                activeSection={activeSecSection}
                onChangeSection={(sec) => {
                  setLastSecSection(sec);
                  openOrFocusTab(SEC_TAB_BY_SECTION[sec]);
                }}
                moduleLevel={secretariatLevel}
              />
            </div>
          )}

          {mountedModules.tr && hasTreasury && (
            <div className={isTrVisible ? "block" : "hidden"}>
              <ChurchTreasuryPreview
                embedded
                hideQuickForm={
                  activeTabId === "tr-extrato" ||
                  activeTabId === "tr-entradas" ||
                  activeTabId === "tr-saidas"
                }
                hideListInLaunch={activeTabId === "tr-lancamento"}
                contractId={contract.id}
                clientName={contract.clientName}
                activeSection={activeTreasurySection}
                onChangeSection={(sec) => {
                  setLastTrSection(sec);
                  openOrFocusTab(TR_TAB_BY_SECTION[sec]);
                }}
                moduleLevel={treasuryLevel}
              />
            </div>
          )}

          {mountedModules.ebd && hasEbd && (
            <div className={activeTabId === "ebd-portal" ? "block" : "hidden"}>
              <EbdPortal
                contract={contract}
                overrides={overrides}
                basePath={contract.entryPath}
              />
            </div>
          )}

          {mountedModules.cantina && enabledChurchModules.includes("igreja_cantina") && (
            <div className={activeTabId === "extra-cantina" ? "block" : "hidden"}>
              <ChurchCantinaContractView
                contractId={contract.id}
                moduleLevel={effectiveLevels?.igreja_cantina}
              />
            </div>
          )}

          {mountedModules.livraria && enabledChurchModules.includes("igreja_livraria") && (
            <div className={activeTabId === "extra-livraria" ? "block" : "hidden"}>
              <ChurchLivrariaContractView
                contractId={contract.id}
                moduleLevel={effectiveLevels?.igreja_livraria}
              />
            </div>
          )}

          {mountedModules.social && enabledChurchModules.includes("igreja_social") && (
            <div className={activeTabId === "extra-social" ? "block" : "hidden"}>
              <ChurchSocialContractView
                contractId={contract.id}
                moduleLevel={effectiveLevels?.igreja_social}
              />
            </div>
          )}

          {mountedModules.membro && enabledChurchModules.includes("igreja_membro") && (
            <div className={activeTabId === "extra-membro" ? "block" : "hidden"}>
              <ChurchMembroContractView
                contractId={contract.id}
                moduleLevel={effectiveLevels?.igreja_membro}
              />
            </div>
          )}
        </main>
      </div>

      {/* Janela Flutuante de Submenu (Estilo Desktop / Membros Web) */}
      {floatingMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
          onClick={() => setFloatingMenu(null)}
        >
          <div
            className="w-full max-w-2xl bg-white text-slate-800 border border-slate-400 shadow-2xl rounded-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#e5e9ef] border-b border-slate-300 px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                {floatingMenu === "cadastros"
                  ? "Secretaria / Cadastros"
                  : floatingMenu === "lancamentos"
                  ? "Financeiro / Lançamentos"
                  : floatingMenu === "relatorios"
                  ? "Financeiro / Relatórios"
                  : "Departamentos & Módulos"}
              </span>
              <button
                type="button"
                onClick={() => setFloatingMenu(null)}
                className="text-slate-600 hover:text-slate-950 p-0.5 rounded hover:bg-slate-300/60"
                title="Fechar janela"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {floatingMenu === "relatorios" ? (
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 bg-white max-h-[75vh] overflow-y-auto">
                {reportLinks.map((rep, idx) => (
                  <button
                    key={rep.key}
                    type="button"
                    onClick={rep.onClick}
                    className="text-left text-xs text-sky-700 hover:text-sky-900 underline underline-offset-2 py-1"
                  >
                    {idx + 1} - {rep.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white max-h-[75vh] overflow-y-auto">
                {(floatingMenu === "cadastros"
                  ? cadastrosTiles
                  : floatingMenu === "lancamentos"
                  ? lancamentosTiles
                  : departmentTiles
                ).map((tile) => (
                  <button
                    key={tile.key}
                    type="button"
                    onClick={tile.onClick}
                    className="flex flex-col items-center justify-start gap-2 p-3 rounded border border-transparent hover:border-slate-300 hover:bg-slate-100 text-center transition-colors"
                  >
                    <div className="flex items-center justify-center">{tile.icon}</div>
                    <span className="text-xs font-medium text-slate-700 leading-tight">
                      {tile.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
