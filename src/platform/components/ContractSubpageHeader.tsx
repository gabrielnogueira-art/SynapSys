import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, ChevronRight, Home, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlatformContract } from "@/platform/types";
import { useUserRole } from "@/hooks/useUserRole";
import { useViewerSession } from "@/platform/session";

interface ContractSubpageHeaderProps {
  contract: PlatformContract;
  pageLabel: string;
  parentLabel?: string;
  parentPath?: string;
  fallbackPath?: string;
}

/**
 * Barra contextual de navegação para subpáginas de um contrato (/users, /settings, /admin, etc.).
 * Oferece botão "Voltar" usando histórico real do navegador (com fallback seguro),
 * trilha de breadcrumbs (Master vs Gestor) e atalhos diretos de retorno.
 */
export const ContractSubpageHeader = ({
  contract,
  pageLabel,
  parentLabel,
  parentPath,
  fallbackPath,
}: ContractSubpageHeaderProps) => {
  const navigate = useNavigate();
  const role = useUserRole();
  const session = useViewerSession();

  const isMasterOwner = role.role === "master" && session.mode === "owner";
  const resolvedFallback = fallbackPath ?? contract.entryPath;

  const handleGoBack = () => {
    const historyIdx =
      typeof window !== "undefined" &&
      window.history.state &&
      typeof window.history.state.idx === "number"
        ? window.history.state.idx
        : 0;
    if (historyIdx > 0) {
      navigate(-1);
      return;
    }
    navigate(resolvedFallback);
  };

  return (
    <div className="border-b bg-card/95 backdrop-blur px-4 py-2.5 print:hidden">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleGoBack}
            className="h-8 px-3 text-xs shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Voltar
          </Button>

          <nav
            aria-label="Trilha de navegação"
            className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground min-w-0"
          >
            {isMasterOwner ? (
              <>
                <Link
                  to="/plataforma"
                  className="hover:text-foreground transition-colors font-medium truncate"
                >
                  Plataforma Central
                </Link>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <Link
                  to={contract.entryPath}
                  className="hover:text-foreground transition-colors truncate max-w-[220px]"
                  title={contract.clientName}
                >
                  {contract.clientName}
                </Link>
              </>
            ) : (
              <Link
                to={contract.entryPath}
                className="hover:text-foreground transition-colors font-medium inline-flex items-center gap-1 truncate max-w-[240px]"
                title={contract.clientName}
              >
                <Home className="h-3.5 w-3.5 shrink-0" />
                Painel do Contrato ({contract.clientName})
              </Link>
            )}

            {parentLabel && parentPath && (
              <>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <Link
                  to={parentPath}
                  className="hover:text-foreground transition-colors truncate"
                >
                  {parentLabel}
                </Link>
              </>
            )}

            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
            <span className="font-semibold text-foreground truncate">{pageLabel}</span>
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Badge variant="outline" className="font-mono text-[11px] hidden sm:inline-flex">
            {contract.code}
          </Badge>

          <Link to={contract.entryPath}>
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs">
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              Painel do Contrato
            </Button>
          </Link>

          {isMasterOwner && (
            <Link to="/plataforma">
              <Button type="button" size="sm" variant="secondary" className="h-8 text-xs">
                <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                Plataforma Central
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
