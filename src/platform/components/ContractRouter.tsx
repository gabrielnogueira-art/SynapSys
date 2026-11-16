import { Link, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { usePlatformStore } from "@/platform/store";
import { CONTRACT_COMPONENTS } from "@/contracts/registry";
import { GenericContractEntry } from "@/contracts/GenericContractEntry";
import { ContractBanner } from "@/platform/components/ContractBanner";
import { EBDRegistrationForm } from "@/components/EBDRegistrationForm";
import ChoirView from "@/pages/Choir";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Admin from "@/pages/Admin";
import Professor from "@/pages/Professor";
import { ModuleId, PlatformContract } from "@/platform/types";
import { useContractAccess } from "@/platform/useContractAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { PlatformUsersTab } from "./PlatformUsersTab";
import { ContractModulesDialog } from "./ContractModulesDialog";
import { canAccessContract, switchToOwnerMode, useViewerSession } from "@/platform/session";
import { getModuleById } from "@/platform/catalog";
import { isModuleAllowed, moduleRouteSlug, shouldRequireEntryLogin } from "@/platform/contractLinks";
import { supabase } from "@/integrations/supabase/client";

function WithBanner({
  contract,
  children,
}: {
  contract: PlatformContract;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <ContractBanner contract={contract} />
      <div className="flex-1">{children}</div>
    </div>
  );
}

/**
 * Roteador isolado por contrato (/c/:contractId/*).
 * Suporta entrada geral (/c/:slug), rotas por módulo (/c/:slug/ebd, /tesouraria, /secretaria, ...)
 * e restrição automática por usuário/módulo.
 */
export const ContractRouter = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const store = usePlatformStore();
  const { contracts, loading, error } = store;
  const contract = contracts.find((c) => c.id === contractId || c.slug === contractId);
  const access = useContractAccess(contract?.id);
  const role = useUserRole();
  const location = useLocation();
  const session = useViewerSession();

  if (loading) return <div className="p-8 text-muted-foreground">Carregando contrato…</div>;
  if (error) return <div className="p-8" role="alert">{error}</div>;
  const isAuthRoute = /\/(login|signup)\/?$/.test(location.pathname);

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Contrato não encontrado</CardTitle>
            <CardDescription>
              O identificador <code>{contractId}</code> não corresponde a nenhum contrato ativo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={session.mode === "client" ? `/c/${session.contractId}` : role.role === "master" ? "/plataforma" : "/"}>
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />{" "}
                {session.mode === "client" ? "Voltar ao Meu Sistema" : role.role === "master" ? "Voltar à Plataforma" : "Voltar ao Site"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isClientAccountSignedIn = Boolean(role.role && role.role !== "master");

  if (!canAccessContract(session, contract.id) && !isAuthRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Acesso Restrito ao Contrato
            </CardTitle>
            <CardDescription>
              Esta sessão de cliente está vinculada apenas ao contrato ativo e não possui permissão para acessar{" "}
              {contract.code}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={session.mode === "client" ? `/c/${session.contractId}` : "/plataforma"}>
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Meu Sistema
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Isolamento de contrato na interface: usuário de um contrato suspenso não acessa o sistema
  if (
    contract.status === "suspenso" &&
    (isClientAccountSignedIn || (role.role !== "master" && session.mode !== "owner")) &&
    !isAuthRoute
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Acesso Restrito
            </CardTitle>
            <CardDescription>
              O contrato {contract.code} está suspenso. Entre em contato com o responsável pela plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={session.mode === "owner" ? "/" : `${contract.entryPath}/login`}>
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />{" "}
                {session.mode === "owner" ? "Voltar à Plataforma" : "Ir para Login"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const effectiveAllowed =
    session.mode === "client"
      ? session.allowedModules && session.allowedModules.length > 0
        ? session.allowedModules
        : null
      : role.role === "master"
      ? null
      : access.allowedModules;

  const loginRedirectPath = `${contract.entryPath}/login?next=${encodeURIComponent(
    `${location.pathname}${location.search}`
  )}`;

  const unauthorizedContractCard = (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="max-w-md w-full border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" /> Acesso Restrito ao Contrato
          </CardTitle>
          <CardDescription>
            Sua conta conectada ({access.userEmail || "usuário"}) não está vinculada a {contract.clientName}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await supabase.auth.signOut();
              switchToOwnerMode();
              window.location.assign(`${contract.entryPath}/login`);
            }}
          >
            Trocar de conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const restrictedModuleCard = (modId: ModuleId) => (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="max-w-md w-full border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" /> Área não liberada
          </CardTitle>
          <CardDescription>
            Sua conta não tem permissão para acessar{" "}
            <strong>{getModuleById(modId)?.name ?? modId}</strong> neste contrato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to={contract.entryPath}>
            <Button className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar às minhas áreas
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );

  const EntryComponent = CONTRACT_COMPONENTS[contract.id] ?? GenericContractEntry;

  const renderEntry = (initialArea?: ModuleId) => {
    if (access.loading || role.loading) {
      return <div className="p-8 text-muted-foreground">Verificando acesso…</div>;
    }
    if (shouldRequireEntryLogin(contract.requireLoginOnEntry, access.signedIn)) {
      return <Navigate to={loginRedirectPath} replace />;
    }
    if (access.signedIn && !access.allowed && role.role !== "master" && session.mode === "owner") {
      return unauthorizedContractCard;
    }
    if (initialArea && !isModuleAllowed(effectiveAllowed, initialArea)) {
      return restrictedModuleCard(initialArea);
    }
    return <EntryComponent contract={contract} initialArea={initialArea} />;
  };

  const guardEbdSubroute = (element: React.ReactNode, requireAuthAlways = false) => {
    if (access.loading || role.loading) {
      return <div className="p-8 text-muted-foreground">Verificando acesso…</div>;
    }
    if (
      (requireAuthAlways && !access.signedIn) ||
      shouldRequireEntryLogin(contract.requireLoginOnEntry, access.signedIn)
    ) {
      return <Navigate to={loginRedirectPath} replace />;
    }
    if (access.signedIn && !access.allowed && role.role !== "master" && session.mode === "owner") {
      return unauthorizedContractCard;
    }
    if (!contract.activeModules.includes("igreja_ebd")) {
      return restrictedModuleCard("igreja_ebd");
    }
    if ((access.signedIn || session.mode === "client") && !isModuleAllowed(effectiveAllowed, "igreja_ebd")) {
      return restrictedModuleCard("igreja_ebd");
    }
    return <WithBanner contract={contract}>{element}</WithBanner>;
  };

  return (
    <Routes>
      <Route
        path="users"
        element={
          access.loading || role.loading ? (
            <div className="p-8 text-muted-foreground">Verificando permissão…</div>
          ) : access.manager || role.role === "master" ? (
            <WithBanner contract={contract}>
              <div className="p-4">
                <PlatformUsersTab
                  contracts={[contract]}
                  users={store.users.filter((u) => u.contractId === contract.id)}
                  pendingRequests={store.pendingRequests}
                  isMaster={role.role === "master"}
                  onAddUser={store.addUser}
                  onUpdateAccess={store.updateUserAccess}
                  onApprovePending={store.approvePendingUser}
                  onRejectPending={store.rejectPendingUser}
                  onUpdateStatus={store.updateUserStatus}
                  onDeleteUser={store.deleteUser}
                />
              </div>
            </WithBanner>
          ) : (
            <Navigate
              to={`${contract.entryPath}/login?next=${encodeURIComponent(location.pathname)}`}
              replace
            />
          )
        }
      />
      <Route
        path="settings"
        element={
          access.loading || role.loading ? (
            <div className="p-8 text-muted-foreground">Verificando permissão…</div>
          ) : access.manager || role.role === "master" ? (
            <ContractModulesDialog
              contract={contract}
              brandingOnly={role.role !== "master"}
              onClose={() => window.location.assign(contract.entryPath)}
              onSave={async (id, patch) => {
                if (role.role === "master") await store.updateContract(id, patch);
                else await store.updateBranding(id, patch.branding);
              }}
            />
          ) : (
            <Navigate
              to={`${contract.entryPath}/login?next=${encodeURIComponent(location.pathname)}`}
              replace
            />
          )
        }
      />
      <Route index element={renderEntry()} />
      {contract.activeModules.map((modId) => (
        <Route
          key={modId}
          path={moduleRouteSlug(modId)}
          element={renderEntry(modId)}
        />
      ))}
      <Route path="form" element={guardEbdSubroute(<EBDRegistrationForm />)} />
      <Route path="coristas" element={guardEbdSubroute(<ChoirView />)} />
      <Route
        path="login"
        element={
          <WithBanner contract={contract}>
            <Login />
          </WithBanner>
        }
      />
      <Route
        path="signup"
        element={
          <WithBanner contract={contract}>
            <Signup />
          </WithBanner>
        }
      />
      <Route path="admin" element={guardEbdSubroute(<Admin />, true)} />
      <Route path="professor" element={guardEbdSubroute(<Professor />, true)} />
      <Route path="*" element={renderEntry()} />
    </Routes>
  );
};
