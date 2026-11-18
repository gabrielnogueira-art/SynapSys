import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  Church,
  DollarSign,
  Grip,
  HandHeart,
  Home,
  Landmark,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Store,
  User,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { ModuleId, PlatformContract } from "@/platform/types";
import { getModuleById } from "@/platform/catalog";
import { useContractAccess } from "@/platform/useContractAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { switchToOwnerMode, useViewerSession } from "@/platform/session";

export interface ShellSidebarItem {
  id: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
}

export type AreaKey = "painel_geral" | ModuleId;

interface ClientShellProps {
  contract: PlatformContract;
  activeArea: AreaKey;
  onSelectArea: (area: AreaKey) => void;
  sidebarItems: ShellSidebarItem[];
  visibleModules?: ModuleId[];
  showOverview?: boolean;
  customInstitutionTitle?: string;
  customLeaderSubtitle?: string;
  children: ReactNode;
}

const MODULE_ICON: Record<ModuleId, ReactNode> = {
  igreja_ebd: <BookOpen className="h-5 w-5" />,
  igreja_tesouraria: <Landmark className="h-5 w-5" />,
  igreja_secretaria: <Building2 className="h-5 w-5" />,
  igreja_cantina: <UtensilsCrossed className="h-5 w-5" />,
  igreja_livraria: <BookOpen className="h-5 w-5" />,
  igreja_social: <HandHeart className="h-5 w-5" />,
  comercio_tesouraria: <DollarSign className="h-5 w-5" />,
  comercio_secretaria: <Briefcase className="h-5 w-5" />,
  comercio_estoque: <Package className="h-5 w-5" />,
  comercio_rh: <Users className="h-5 w-5" />,
  comercio_pdv: <ShoppingCart className="h-5 w-5" />,
};

export const ClientShell = ({
  contract,
  activeArea,
  onSelectArea,
  sidebarItems,
  visibleModules,
  showOverview,
  customInstitutionTitle,
  customLeaderSubtitle,
  children,
}: ClientShellProps) => {
  const navigate = useNavigate();
  const session = useViewerSession();
  const access = useContractAccess(contract.id);
  const role = useUserRole();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const modulesToDisplay = visibleModules ?? contract.activeModules;
  const overviewAllowed = showOverview ?? modulesToDisplay.length > 1;
  const canManageContract =
    session.mode === "client"
      ? session.accessLevel === "gestor_contrato"
      : access.manager;

  const areaLabel =
    activeArea === "painel_geral"
      ? "PAINEL GERAL"
      : (getModuleById(activeArea)?.shortName ?? activeArea).toUpperCase();

  const institutionHeader = (
    customInstitutionTitle ||
    [contract.clientName, contract.city].filter(Boolean).join(" — ")
  ).toUpperCase();

  const leaderSub =
    customLeaderSubtitle ||
    contract.branding?.presidentPastor ||
    (contract.responsibleName
      ? contract.segment === "igreja"
        ? `PASTOR / RESPONSÁVEL: ${contract.responsibleName.toUpperCase()}`
        : `GESTOR RESPONSÁVEL: ${contract.responsibleName.toUpperCase()}`
      : contract.segment === "igreja"
      ? "GESTÃO ECLESIÁSTICA INTEGRADA"
      : "GESTÃO COMERCIAL INTEGRADA");

  const userDisplay =
    session.mode === "client"
      ? { name: session.userName, role: session.roleLabel, email: session.userEmail }
      : access.signedIn
      ? {
          name: access.userName || access.userEmail || "Usuário",
          role: access.roleLabel || "Acesso Autenticado",
          email: access.userEmail || "",
        }
      : {
          name: contract.responsibleName || "Administrador",
          role: "Acesso Preview (Empreendedor)",
          email: contract.responsibleEmail || "admin@sistema.local",
        };

  return (
    <div className="min-h-screen flex bg-slate-100/70">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Left Sidebar (estilo ERP do print) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col bg-[#1b2d3e] text-slate-200 transition-all duration-200 shrink-0 ${
          collapsed ? "w-16" : "w-60"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Area Badge Header */}
        <div className="h-14 px-3 flex items-center justify-between border-b border-white/10 bg-[#152433]">
          {!collapsed && (
            <span className="font-bold tracking-wide text-sm text-amber-400 truncate">
              {areaLabel}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            className="h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10 ml-auto hidden lg:flex"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                item.onClick();
                setMobileOpen(false);
              }}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left ${
                item.active
                  ? "bg-white/15 text-white font-medium border-l-2 border-amber-400"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}
          {canManageContract && (
            <div className="pt-2 mt-2 border-t border-white/10 space-y-1">
              <button
                type="button"
                title={collapsed ? "Usuários do contrato" : undefined}
                onClick={() => {
                  navigate(`${contract.entryPath}/users`);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-left"
              >
                <Users className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">Usuários</span>}
              </button>
              <button
                type="button"
                title={collapsed ? "Configurações do contrato" : undefined}
                onClick={() => {
                  navigate(`${contract.entryPath}/settings`);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-left"
              >
                <Building2 className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">Configurações</span>}
              </button>
            </div>
          )}
        </nav>

        {/* Footer badge */}
        {!collapsed && (
          <div className="p-3 border-t border-white/10 text-[11px] text-slate-400 flex items-center gap-2">
            {contract.segment === "igreja" ? (
              <Church className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            ) : (
              <Store className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            )}
            <span className="truncate">
              {modulesToDisplay.length} área(s) liberada(s)
            </span>
          </div>
        )}
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Institutional Bar (estilo do print) */}
        <header className="h-14 bg-[#243b50] text-white px-4 flex items-center justify-between gap-3 border-b border-white/10 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-8 w-8 text-slate-200 hover:bg-white/10"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {contract.branding?.logoUrl && <img src={contract.branding.logoUrl} alt={contract.clientName} className="h-9 w-9 object-contain shrink-0" />}
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold tracking-wide truncate text-white">
                {institutionHeader}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-300 truncate">
                {leaderSub}
              </div>
            </div>
          </div>

          {/* Right actions: Back to overview + Bell + 9-dots Area Switcher + User */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {overviewAllowed && activeArea !== "painel_geral" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelectArea("painel_geral")}
                className="h-9 px-2.5 text-slate-100 hover:text-white hover:bg-white/10 gap-1.5"
                title="Voltar para a tela inicial do contrato"
              >
                <ArrowLeft className="h-4 w-4 text-amber-400" />
                <span className="hidden sm:inline text-xs font-medium">Painel Geral</span>
              </Button>
            )}

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-200 hover:text-white hover:bg-white/10 relative"
                  title="Avisos do sistema"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 text-sm">
                <div className="font-semibold mb-1">Avisos de {contract.clientName}</div>
                <p className="text-xs text-muted-foreground">
                  Seu ambiente está operando com {modulesToDisplay.length} área(s) liberada(s).
                  Use o botão de grade ao lado para alternar entre as áreas disponíveis no seu acesso.
                </p>
              </PopoverContent>
            </Popover>

            {/* 9-Dots Module/Area Switcher */}
            <Popover open={switcherOpen} onOpenChange={setSwitcherOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2.5 text-slate-100 hover:text-white hover:bg-white/10 gap-1.5"
                  title="Trocar de área"
                >
                  <Grip className="h-4 w-4 text-amber-400" />
                  <span className="hidden md:inline text-xs font-medium">Áreas</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-3">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Áreas do Seu Sistema
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {contract.code}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {overviewAllowed && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectArea("painel_geral");
                        setSwitcherOpen(false);
                      }}
                      className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-colors ${
                        activeArea === "painel_geral"
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Home className="h-5 w-5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">Painel Geral</div>
                        <div className="text-[10px] text-muted-foreground truncate">Visão inicial</div>
                      </div>
                    </button>
                  )}

                  {modulesToDisplay.map((modId) => {
                    const mod = getModuleById(modId);
                    const isActive = activeArea === modId;
                    return (
                      <button
                        key={modId}
                        type="button"
                        onClick={() => {
                          onSelectArea(modId);
                          setSwitcherOpen(false);
                        }}
                        className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-colors ${
                          isActive
                            ? "border-primary bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        <span className="shrink-0">{MODULE_ICON[modId]}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">
                            {mod?.shortName ?? modId}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {mod?.maturity === "producao" ? "Produção" : "Módulo ativo"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {/* User Profile */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-slate-200 hover:text-white hover:bg-white/10 gap-2"
                >
                  <div className="h-7 w-7 rounded-full bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="hidden sm:inline text-xs max-w-[120px] truncate">
                    {userDisplay.name}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold">{userDisplay.name}</div>
                  <div className="text-xs text-muted-foreground">{userDisplay.email}</div>
                  <Badge variant="secondary" className="text-[10px] mt-1">
                    {userDisplay.role}
                  </Badge>
                </div>
                <div className="pt-2 border-t flex flex-col gap-1.5">
                  {overviewAllowed && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => onSelectArea("painel_geral")}
                    >
                      <Home className="h-3.5 w-3.5 mr-2" /> Ir ao Painel Geral
                    </Button>
                  )}
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

        {/* Workspace Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
};
