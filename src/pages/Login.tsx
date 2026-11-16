import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserCog, ArrowLeft, LogOut } from "lucide-react";
import { useContractBasePath } from "@/platform/useContractBasePath";
import { switchToOwnerMode } from "@/platform/session";
import { useBranding } from "@/hooks/useBranding";
import { PlatformBrand } from "@/platform/components/PlatformBrand";
import { usePlatformStore } from "@/platform/store";

const db = supabase as any;

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
  const store = usePlatformStore();
  const { isInsideContract, resolve, basePath } = useContractBasePath();
  const { ministry } = useBranding();

  const contractSlugOrId = basePath.replace(/^\/c\//, "");
  const currentContract = isInsideContract
    ? store.contracts.find((c) => c.id === contractSlugOrId || c.slug === contractSlugOrId)
    : undefined;

  // Same-origin relative paths only, to avoid open-redirect abuse.
  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const isPlatformLogin = !isInsideContract && nextPath === "/plataforma";

  const routeByRole = async (userId: string) => {
    const { data: roles } = await supabase
      .from("user_roles" as any)
      .select("role, ministry_id, headquarters_id, regional_id, congregation_id")
      .eq("user_id", userId);

    const roleList = ((roles as unknown) as Array<{
      role: string;
      ministry_id?: string | null;
      headquarters_id?: string | null;
      regional_id?: string | null;
      congregation_id?: string | null;
    }>) || [];
    const has = (r: string) => roleList.some((x) => x.role === r);

    if (has("master")) {
      switchToOwnerMode();
      navigate(
        nextPath || (isInsideContract ? resolve("/") : "/plataforma"),
        { replace: true }
      );
      return;
    }

    if (isInsideContract) {
      const targetContractId = currentContract?.id ?? contractSlugOrId;
      const { data: memberships } = await supabase
        .from("platform_memberships")
        .select("contract_id")
        .eq("user_id", userId)
        .eq("status", "ativo");

      const hasMembership = (memberships ?? []).some((m) => m.contract_id === targetContractId);

      // Compatibilidade com usuários criados diretamente pela hierarquia EBD do mesmo ministério
      let hasMinistryRole = false;
      if (!hasMembership && currentContract?.supabaseMinistryId && roleList.length > 0) {
        if (roleList.some((r) => r.ministry_id === currentContract.supabaseMinistryId)) {
          hasMinistryRole = true;
        } else {
          const hqId = roleList.find((r) => r.headquarters_id)?.headquarters_id;
          let resolvedHq = hqId;
          if (!resolvedHq) {
            const regId = roleList.find((r) => r.regional_id)?.regional_id;
            if (regId) {
              const { data: reg } = await db.from("regionals").select("headquarters_id").eq("id", regId).maybeSingle();
              resolvedHq = reg?.headquarters_id ?? null;
            }
          }
          if (!resolvedHq) {
            const congId = roleList.find((r) => r.congregation_id)?.congregation_id;
            if (congId) {
              const { data: cong } = await db.from("congregations").select("headquarters_id").eq("id", congId).maybeSingle();
              resolvedHq = cong?.headquarters_id ?? null;
            }
          }
          if (resolvedHq) {
            const { data: hq } = await db.from("headquarters").select("ministry_id").eq("id", resolvedHq).maybeSingle();
            if (hq?.ministry_id === currentContract.supabaseMinistryId) {
              hasMinistryRole = true;
            }
          }
        }
      }

      if (hasMembership || hasMinistryRole) {
        if (nextPath && nextPath !== "/plataforma") {
          if (has("professor_classe") && nextPath.endsWith("/admin")) {
            navigate(resolve("/professor"), { replace: true });
          } else {
            navigate(nextPath, { replace: true });
          }
          return;
        }
        // Entra direto no portal do contrato filtrado pelas áreas permitidas desta conta
        navigate(resolve("/"), { replace: true });
        return;
      }

      const other = memberships?.[0];
      if (other) {
        const otherContract = store.contracts.find((c) => c.id === other.contract_id);
        toast({
          title: "Conta vinculada a outro contrato",
          description: "Direcionando você para o sistema do seu contrato.",
        });
        navigate(otherContract?.entryPath ?? `/c/${other.contract_id}`, { replace: true });
        return;
      }

      await supabase.auth.signOut();
      toast({
        variant: "destructive",
        title: "Sem acesso a este contrato",
        description: "Sua conta não está ativa neste ambiente.",
      });
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
      const ownContract = store.contracts.find((c) => c.id === own.contract_id);
      if (isPlatformLogin) {
        toast({
          title: "Conta de contrato identificada",
          description: "Este login não possui perfil Master; direcionando para o seu contrato.",
        });
      }
      navigate(ownContract?.entryPath ?? `/c/${own.contract_id}`, { replace: true });
      return;
    }

    await supabase.auth.signOut();
    toast({ variant: "destructive", title: "Nenhum contrato ativo vinculado" });
  };

  useEffect(() => {
    if (isInsideContract && store.loading) return;
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
  }, [navigate, isPlatformLogin, isInsideContract, store.loading, currentContract?.id]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("E-mail ou senha incorretos. Por favor, tente novamente.");
        }
        throw error;
      }

      if (!data.session) {
        throw new Error("Não foi possível estabelecer uma sessão. Tente novamente.");
      }

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
        description: "Identificando suas áreas de acesso...",
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

  const contractLogo = currentContract?.branding?.logoUrl || ministry?.logo_url;
  const contractTitle =
    currentContract?.clientName || ministry?.display_name || ministry?.name;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isPlatformLogin ? "bg-background" : "bg-gradient-secondary"}`}>
      <div className="w-full max-w-md">
        {!(isInsideContract && currentContract?.requireLoginOnEntry) && (
          <Button
            variant="ghost"
            onClick={() => navigate(isPlatformLogin ? "/ebd" : resolve("/"))}
            className="flex items-center gap-2 text-muted-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {isPlatformLogin ? "Ir para Portal Público da EBD" : "Voltar à Página Inicial"}
          </Button>
        )}
        <Card className={isPlatformLogin ? "platform-login-panel" : "shadow-2xl border-primary/20"}>
          <CardHeader className="text-center">
            {isInsideContract && contractLogo && (
              <img
                src={contractLogo}
                alt={contractTitle || "Logo"}
                className="h-16 max-w-full object-contain mx-auto mb-3"
              />
            )}
            {isPlatformLogin ? (
              <PlatformBrand prominent className="justify-center mb-8" />
            ) : (
              <UserCog className="mx-auto h-12 w-12 text-primary mb-4" />
            )}
            <CardTitle className="text-2xl font-bold">
              {isPlatformLogin
                ? "Acesso à plataforma"
                : isInsideContract && contractTitle
                ? contractTitle
                : "Acesso Administrativo"}
            </CardTitle>
            <CardDescription>
              {isPlatformLogin
                ? "Gestão de contratos • Conta Master"
                : isInsideContract
                ? "Entre com seu e-mail e senha para abrir suas áreas liberadas."
                : "Digite suas credenciais para aceder ao painel de controlo."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {nonMasterSession && (
              <div className="rounded-lg border border-border bg-muted p-3 text-xs text-foreground space-y-2">
                <p>
                  Sessão atual conectada como <strong>{nonMasterSession.email}</strong> (conta de contrato/cliente).
                  Para abrir a Gestão de Contratos, entre com a conta <strong>Master</strong> abaixo ou saia desta sessão.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-card"
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
                  aria-label="E-mail"
                  autoComplete="email"
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
                  aria-label="Senha"
                  autoComplete="current-password"
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
