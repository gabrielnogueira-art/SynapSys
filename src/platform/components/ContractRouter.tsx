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
import { useViewerSession } from "@/platform/session";

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
  const access = useContractAccess(contractId);
  const role = useUserRole();
  const location = useLocation();
  const session = useViewerSession();
  const contract = contracts.find((c) => c.id === contractId);

  if (loading || access.loading) return <div className="p-8 text-muted-foreground">Carregando contrato…</div>;
  if (error) return <div className="p-8" role="alert">{error}</div>;
  const isLogin = /\/(login|signup)\/?$/.test(location.pathname);
  if (!isLogin && !access.signedIn) return <Navigate to={`/c/${contractId}/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!isLogin && !access.allowed) return <div className="p-8 space-y-4"><h1 className="text-xl">Acesso restrito</h1><p>Seu usuário não possui vínculo ativo com este contrato.</p><Link to="/login">Voltar ao login</Link></div>;
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

  // Isolamento de contrato na interface: usuário de um contrato não acessa outro contrato
  if (contract.status === "suspenso" && role.role !== "master" && !isLogin) {
    const ownContract =
      session.mode === "client"
        ? contracts.find((c) => c.id === session.contractId)
        : undefined;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Acesso Restrito
            </CardTitle>
            <CardDescription>
              Seu usuário tem permissão exclusiva para o contrato{" "}
              <strong>{ownContract ? `${ownContract.code} (${ownContract.clientName})` : "vinculado"}</strong>.
              Não é permitido acessar dados de outros contratos ({contract.code}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={session.mode === "client" ? `/c/${session.contractId}` : "/"}>
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" /> Ir para o Meu Contrato
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const EntryComponent = GenericContractEntry;

  return (
    <Routes>
      <Route path="users" element={access.manager ? <WithBanner contract={contract}><div className="p-4"><PlatformUsersTab contracts={[contract]} users={store.users.filter((u) => u.contractId === contract.id)} isMaster={role.role === "master"} onAddUser={store.addUser} onUpdateStatus={store.updateUserStatus} onDeleteUser={store.deleteUser} /></div></WithBanner> : <Navigate to={contract.entryPath} replace />} />
      <Route path="settings" element={access.manager ? <ContractModulesDialog contract={contract} brandingOnly={role.role !== "master"} onClose={() => window.location.assign(contract.entryPath)} onSave={async (id, patch) => { if (role.role === "master") await store.updateContract(id, patch); else await store.updateBranding(id, patch.branding); }} /> : <Navigate to={contract.entryPath} replace />} />
      <Route index element={<EntryComponent contract={contract} />} />
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
      <Route path="*" element={<EntryComponent contract={contract} />} />
    </Routes>
  );
};
