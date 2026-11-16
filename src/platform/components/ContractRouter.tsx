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
import { PlatformContract } from "@/platform/types";
import { useContractAccess } from "@/platform/useContractAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { PlatformUsersTab } from "./PlatformUsersTab";
import { ContractModulesDialog } from "./ContractModulesDialog";
import { canAccessContract, useViewerSession } from "@/platform/session";
import { shouldRequireEntryLogin } from "@/platform/contractLinks";

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
 * Bloqueia acesso cruzado quando o usuário logado pertence a outro contrato.
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
            <Link to={session.mode === "client" ? `/c/${session.contractId}` : "/"}>
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />{" "}
                {session.mode === "client" ? "Voltar ao Meu Sistema" : "Voltar à Plataforma"}
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

  const EntryComponent = CONTRACT_COMPONENTS[contract.id] ?? GenericContractEntry;
  const entry = access.loading || role.loading ? (
    <div className="p-8 text-muted-foreground">Verificando acesso…</div>
  ) : shouldRequireEntryLogin(contract.requireLoginOnEntry, access.signedIn) ? (
    <Navigate to={`${contract.entryPath}/login`} replace />
  ) : <EntryComponent contract={contract} />;

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
                  isMaster={role.role === "master"}
                  onAddUser={store.addUser}
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
      <Route index element={entry} />
      <Route
        path="form"
        element={
          <WithBanner contract={contract}>
            <EBDRegistrationForm />
          </WithBanner>
        }
      />
      <Route
        path="coristas"
        element={
          <WithBanner contract={contract}>
            <ChoirView />
          </WithBanner>
        }
      />
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
      <Route
        path="admin"
        element={
          <WithBanner contract={contract}>
            <Admin />
          </WithBanner>
        }
      />
      <Route
        path="professor"
        element={
          <WithBanner contract={contract}>
            <Professor />
          </WithBanner>
        }
      />
      <Route path="*" element={entry} />
    </Routes>
  );
};
