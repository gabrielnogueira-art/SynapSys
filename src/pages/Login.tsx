import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserCog, ArrowLeft, LayoutGrid, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useContractBasePath } from "@/platform/useContractBasePath";
import { switchToOwnerMode } from "@/platform/session";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [nonMasterSession, setNonMasterSession] = useState<{
    email: string;
    contractId: string | null;
  } | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isInsideContract, resolve } = useContractBasePath();

  // Same-origin relative paths only, to avoid open-redirect abuse.
  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const isPlatformLogin = !isInsideContract && nextPath === "/plataforma";

  const routeByRole = async (userId: string) => {
    const { data: roles } = await supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", userId);

    const roleList = ((roles as unknown) as Array<{ role: string }>) || [];
    const has = (r: string) => roleList.some((x) => x.role === r);

    if (has("master")) {
      switchToOwnerMode();
      navigate(nextPath || resolve("/admin?scope=master"), { replace: true });
      return;
    }

    if (nextPath && nextPath !== "/plataforma") {
      navigate(nextPath, { replace: true });
      return;
    }

    if (has("igreja_mae")) {
      navigate(resolve("/admin?scope=ministry"));
      return;
    }
    if (has("igreja_sede")) {
      navigate(resolve("/admin?scope=headquarters"));
      return;
    }
    if (has("admin_regional")) {
      navigate(resolve("/admin?scope=regional"));
      return;
    }
    if (has("secretario_ebd")) {
      navigate(resolve("/admin?scope=congregation"));
      return;
    }
    if (has("professor_classe")) {
      navigate(resolve("/professor"));
      return;
    }

    const { data: memberships } = await supabase
      .from("platform_memberships")
      .select("contract_id")
      .eq("user_id", userId)
      .eq("status", "ativo");
    const own = memberships?.[0];
    if (own) {
      if (isPlatformLogin) {
        toast({
          title: "Conta de contrato identificada",
          description: "Este login não possui perfil Master; direcionando para o seu contrato.",
        });
      }
      navigate(`/c/${own.contract_id}`, { replace: true });
      return;
    }

    await supabase.auth.signOut();
    toast({ variant: "destructive", title: "Nenhum contrato ativo vinculado" });
  };

  useEffect(() => {
    // Verifica se já existe uma sessão ativa ao carregar a página
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setNonMasterSession(null);
        return;
      }

      if (isPlatformLogin) {
        const { data: roles } = await supabase
          .from("user_roles" as any)
          .select("role")
          .eq("user_id", session.user.id);
        const roleList = ((roles as unknown) as Array<{ role: string }>) || [];
        if (roleList.some((x) => x.role === "master")) {
          switchToOwnerMode();
          navigate("/plataforma", { replace: true });
          return;
        }
        const { data: memberships } = await supabase
          .from("platform_memberships")
          .select("contract_id")
          .eq("user_id", session.user.id)
          .eq("status", "ativo");
        setNonMasterSession({
          email: session.user.email ?? "conta conectada",
          contractId: memberships?.[0]?.contract_id ?? null,
        });
        return;
      }

      routeByRole(session.user.id);
    };
    checkSession();
  }, [navigate, isPlatformLogin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Utiliza a autenticação real do Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        // Fornece uma mensagem de erro mais clara para o utilizador
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Senha incorreta. Por favor, tente novamente.");
        }
        throw error;
      }

      // Verificação crucial para garantir que a sessão foi estabelecida antes de navegar
      if (!data.session) {
        throw new Error("Não foi possível estabelecer uma sessão. Tente novamente.");
      }

      // Bloqueia se a conta ainda esta pendente de aprovacao
      const { data: pending } = await supabase
        .from("pending_users" as any)
        .select("status")
        .eq("user_id", data.session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const pStatus = ((pending as any) ?? [])[0]?.status;
      if (pStatus === "pending") {
        await supabase.auth.signOut();
        throw new Error("Sua conta está aguardando aprovação de um administrador.");
      }
      if (pStatus === "rejected") {
        await supabase.auth.signOut();
        throw new Error("Sua solicitação de acesso foi recusada.");
      }

      toast({
        title: "Login bem-sucedido!",
        description: "A redirecionar...",
      });

      await routeByRole(data.session.user.id);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro de Login",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 via-background to-blue-500/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button 
          variant="ghost" 
          onClick={() => navigate(isPlatformLogin ? '/ebd' : resolve('/'))}
          className="flex items-center gap-2 text-muted-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {isPlatformLogin ? "Ir para Portal Público da EBD" : "Voltar à Página Inicial"}
        </Button>
        <Card className="shadow-2xl border-primary/20">
          <CardHeader className="text-center">
            {isPlatformLogin ? (
              <LayoutGrid className="mx-auto h-12 w-12 text-primary mb-4" />
            ) : (
              <UserCog className="mx-auto h-12 w-12 text-primary mb-4" />
            )}
            <CardTitle className="text-2xl font-bold">
              {isPlatformLogin ? "Plataforma • Gestão de Contratos" : "Acesso Administrativo"}
            </CardTitle>
            <CardDescription>
              {isPlatformLogin
                ? "Entre com sua conta Master (empreendedor) para gerenciar todos os contratos e sistemas."
                : "Digite suas credenciais para aceder ao painel de controlo."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {nonMasterSession && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 space-y-2">
                <p>
                  Sessão atual conectada como <strong>{nonMasterSession.email}</strong> (conta de contrato/cliente).
                  Para abrir a Gestão de Contratos, entre com a conta <strong>Master</strong> abaixo ou saia desta sessão.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-white"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setNonMasterSession(null);
                    }}
                  >
                    <LogOut className="h-3 w-3 mr-1" /> Encerrar sessão atual
                  </Button>
                  {nonMasterSession.contractId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs"
                      onClick={() => navigate(`/c/${nonMasterSession.contractId}`)}
                    >
                      Ir para meu contrato
                    </Button>
                  )}
                </div>
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Input
                  id="password"
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-12 text-lg">
                {isLoading ? "A entrar..." : "Entrar"}
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Não tem conta?{" "}
              <Link to={resolve("/signup")} className="text-primary underline">Solicitar acesso</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;

