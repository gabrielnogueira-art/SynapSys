import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building2,
  Check,
  Church,
  Copy,
  CreditCard,
  Eye,
  FileEdit,
  FileText,
  FolderGit2,
  Globe,
  LayoutGrid,
  LogIn,
  LogOut,
  MessageSquarePlus,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldAlert,
  Store,
  Trash2,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { hasLegacyPlatformData, usePlatformStore } from "@/platform/store";
import {
  buildAntigravityEditPrompt,
  getModuleById,
  SEGMENT_DEFINITIONS,
} from "@/platform/catalog";
import { ContractStatus, PlatformContract, ProjectSegment } from "@/platform/types";
import { NewContractDialog } from "@/platform/components/NewContractDialog";
import { ContractModulesDialog } from "@/platform/components/ContractModulesDialog";
import { ContractLinkMenu } from "@/platform/components/ContractLinkMenu";
import { ContractLinkDialog } from "@/platform/components/ContractLinkDialog";
import { PlatformOriginDialog } from "@/platform/components/PlatformOriginDialog";
import { contractPublicUrl, usePlatformOrigin } from "@/platform/contractLinks";
import { PlatformUsersTab } from "@/platform/components/PlatformUsersTab";
import { PlatformRequestsTab } from "@/platform/components/PlatformRequestsTab";
import { PlatformCatalogTab } from "@/platform/components/PlatformCatalogTab";
import { PlatformBillingTab } from "@/platform/components/PlatformBillingTab";
import { PlatformPlansAndClausesTab } from "@/platform/components/PlatformPlansAndClausesTab";
import {
  CONTRACT_LEGAL_STATUS_META,
  formatBRL,
  getContractDelinquencySummary,
  roundCurrency,
  todayIsoDate,
} from "@/platform/saasDefaults";
import { useToast } from "@/hooks/use-toast";
import { AccountAccessDialog } from "@/platform/components/AccountAccessDialog";
import { PlatformBrand } from "@/platform/components/PlatformBrand";
import { SupabaseStatusBadge } from "@/components/SupabaseStatusBadge";
import {
  switchToClientSimulation,
  switchToOwnerMode,
  useViewerSession,
} from "@/platform/session";

const STATUS_BADGE: Record<
  ContractStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  ativo: { label: "Ativo • Produção", variant: "default" },
  implantacao: { label: "Em Implantação", variant: "secondary" },
  demonstracao: { label: "Modelo Demo", variant: "outline" },
  suspenso: { label: "Suspenso", variant: "destructive" },
};

const VALID_TABS = new Set([
  "contracts",
  "billing",
  "plans-clauses",
  "users",
  "requests",
  "catalog",
]);

export const PlatformDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const store = usePlatformStore();
  const session = useViewerSession();
  const role = useUserRole();
  const originInfo = usePlatformOrigin();

  const [accountOpen, setAccountOpen] = useState(false);
  const [originDialogOpen, setOriginDialogOpen] = useState(false);
  const rawTab = searchParams.get("tab") ?? "";
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : "contracts";
  const setActiveTab = (nextTab: string) => {
    const next = VALID_TABS.has(nextTab) ? nextTab : "contracts";
    setSearchParams(next === "contracts" ? {} : { tab: next }, { replace: true });
  };
  const [selectedBillingContract, setSelectedBillingContract] = useState<string>("all");
  const [selectedLegalContractId, setSelectedLegalContractId] = useState<string>("");
  const [plansSubSection, setPlansSubSection] = useState<"plans" | "clauses">("plans");
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<"all" | ProjectSegment>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ContractStatus>("all");

  const [newContractOpen, setNewContractOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<PlatformContract | null>(null);
  const [editingLinkContract, setEditingLinkContract] = useState<PlatformContract | null>(null);
  const [preselectedReqContract, setPreselectedReqContract] = useState<string | undefined>();
  const [copiedContractId, setCopiedContractId] = useState<string | null>(null);
  const [authState, setAuthState] = useState<{
    loading: boolean;
    email: string | null;
    ownContractId: string | null;
  }>({ loading: true, email: null, ownContractId: null });

  useEffect(() => {
    let active = true;
    const syncAuth = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      let ownContractId: string | null = null;
      if (user) {
        const { data: memberships } = await supabase
          .from("platform_memberships")
          .select("contract_id")
          .eq("user_id", user.id)
          .eq("status", "ativo")
          .limit(1);
        ownContractId = memberships?.[0]?.contract_id ?? null;
      }
      if (active) {
        setAuthState({ loading: false, email: user?.email ?? null, ownContractId });
      }
    };
    syncAuth();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setTimeout(syncAuth, 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Ao acessar diretamente a raiz da Plataforma (acesso livre ou sessão Master),
  // encerra eventual modo simulação para nunca prender o empreendedor dentro de um contrato cliente (ex.: EBD).
  useEffect(() => {
    if (!role.loading && (!role.role || role.role === "master") && session.mode === "client") {
      switchToOwnerMode();
    }
  }, [role.loading, role.role, session.mode]);

  const nextCodePreview = useMemo(() => {
    const nextNum =
      store.contracts.reduce((max, c) => {
        const m = c.code.match(/(\d+)/);
        return Math.max(max, m ? parseInt(m[1], 10) : 0);
      }, 0) + 1;
    return `CTR-${String(nextNum).padStart(3, "0")}`;
  }, [store.contracts]);

  const filteredContracts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return store.contracts.filter((c) => {
      if (segmentFilter !== "all" && c.segment !== segmentFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q) ||
        (c.city?.toLowerCase().includes(q) ?? false) ||
        (c.responsibleName?.toLowerCase().includes(q) ?? false) ||
        (c.documentNumber?.toLowerCase().includes(q) ?? false) ||
        c.codeFolder.toLowerCase().includes(q)
      );
    });
  }, [store.contracts, search, segmentFilter, statusFilter]);

  const metrics = useMemo(() => {
    const today = todayIsoDate();
    const activeContracts = store.contracts.filter((c) => c.status === "ativo");
    const activeCount = activeContracts.length;
    const churchCount = store.contracts.filter((c) => c.segment === "igreja").length;
    const commerceCount = store.contracts.filter((c) => c.segment === "comercio").length;
    const openRequests = store.changeRequests.filter((r) => r.status !== "concluido").length;
    const mrrActive = roundCurrency(
      activeContracts.reduce((sum, c) => sum + (Number(c.monthlyValue) || 0), 0)
    );
    const totalUnits = store.contracts.reduce((sum, c) => sum + (c.unitsCount ?? 1), 0);

    let overdueAmount = 0;
    let overdueInvoicesCount = 0;
    let dueSoonCount = 0;
    let delinquentContractsCount = 0;
    for (const c of store.contracts) {
      const del = getContractDelinquencySummary(
        c,
        today,
        store.billingConfig.gracePeriodDays
      );
      if (del.overdueCount > 0) {
        delinquentContractsCount += 1;
        overdueInvoicesCount += del.overdueCount;
        overdueAmount = roundCurrency(overdueAmount + del.overdueAmount);
      }
      dueSoonCount += del.dueSoonCount;
    }

    return {
      activeCount,
      churchCount,
      commerceCount,
      openRequests,
      mrrActive,
      totalUnits,
      overdueAmount,
      overdueInvoicesCount,
      dueSoonCount,
      delinquentContractsCount,
    };
  }, [store.contracts, store.changeRequests, store.billingConfig.gracePeriodDays]);

  const handleCopyContractPrompt = async (contract: PlatformContract) => {
    const prompt = buildAntigravityEditPrompt(contract);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedContractId(contract.id);
      toast({
        title: `Referência de ${contract.code} copiada!`,
        description: `Cole aqui no chat ao solicitar alterações neste cliente.`,
      });
      setTimeout(() => setCopiedContractId(null), 2000);
    } catch {
      toast({ title: "Pasta do contrato", description: `GitHub/${contract.codeFolder}` });
    }
  };

  const handleOpenRequestFor = (contractId: string) => {
    setPreselectedReqContract(contractId);
    setActiveTab("requests");
  };

  const handleOpenBillingFor = (contractId: string) => {
    setSelectedBillingContract(contractId);
    setActiveTab("billing");
  };

  const handleOpenDraftFor = (contractId: string) => {
    setSelectedLegalContractId(contractId);
    setPlansSubSection("clauses");
    setActiveTab("plans-clauses");
  };

  if (role.loading || store.loading) {
    return <div className="p-8 text-muted-foreground">Carregando plataforma…</div>;
  }

  if (store.error) return <div className="p-8 space-y-4"><p role="alert">{store.error}</p><Button onClick={() => store.reload()}>Tentar novamente</Button></div>;

  if (!authState.loading && role.role !== "master") return <Navigate to="/login?next=/plataforma" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Bar da Plataforma */}
      <header className="sticky top-0 z-20 platform-topbar border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PlatformBrand />
            {role.role === "master" && <Badge variant="outline" className="text-[11px] border-primary/30 text-primary">Master</Badge>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/"><Button variant="ghost" size="sm"><Globe className="h-4 w-4 mr-1.5" /> Ver Site</Button></Link>
            {role.role === "master" && <Button variant="outline" size="sm" onClick={() => setAccountOpen(true)}><Settings2 className="h-4 w-4 mr-1.5" /> Meu acesso</Button>}
            {role.role === "master" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  switchToOwnerMode();
                  await supabase.auth.signOut();
                }}
                title="Encerrar sessão Master"
              >
                <LogOut className="h-4 w-4 mr-1.5" /> Sair
              </Button>
            ) : (
              <Link to="/login?next=/plataforma">
                <Button variant="outline" size="sm" title="Autenticar conta Master do Supabase para gerenciar logins reais">
                  <LogIn className="h-4 w-4 mr-1.5" /> Entrar como Master
                </Button>
              </Link>
            )}
            {role.role === "master" && hasLegacyPlatformData() && <Button size="sm" variant="outline" onClick={async () => {
              try {
                const count = await store.importLegacyBrowserData();
                toast({ title: `${count} contrato(s) importado(s)`, description: "Contas antigas de demonstração não foram transformadas em logins." });
              } catch (e: unknown) { toast({ variant: "destructive", title: "Falha ao importar", description: e instanceof Error ? e.message : String(e) }); }
            }}>Importar dados deste navegador</Button>}
            <Button size="sm" onClick={() => setNewContractOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Novo Contrato
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
          <div><p className="text-xs text-primary mb-2">PLATAFORMA DE GESTÃO</p><h1 className="text-2xl sm:text-3xl font-semibold">Visão geral</h1></div>
          <p className="text-sm text-muted-foreground">{authState.email || "Gestão central"}</p>
        </div>
        {/* KPIs SaaS Health */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="platform-metric">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Contratos na Plataforma</span>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-2xl">{store.contracts.length}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {metrics.activeCount} ativo(s) • {metrics.churchCount} Igreja • {metrics.commerceCount} Comércio
              </p>
            </CardHeader>
          </Card>

          <Card className="platform-metric">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>MRR (Recorrência Ativa)</span>
                <Banknote className="h-4 w-4 text-primary" />
              </CardDescription>
              <CardTitle className="text-2xl text-primary">
                {formatBRL(metrics.mrrActive)}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {metrics.totalUnits} igreja(s)/unidade(s) em carteira
              </p>
            </CardHeader>
          </Card>

          <Card
            className="platform-metric cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setActiveTab("billing")}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Adimplência & Cobranças</span>
                <CreditCard
                  className={`h-4 w-4 ${
                    metrics.overdueInvoicesCount > 0 ? "text-destructive" : "text-emerald-400"
                  }`}
                />
              </CardDescription>
              <CardTitle
                className={`text-2xl ${
                  metrics.overdueInvoicesCount > 0 ? "text-destructive" : "text-emerald-400"
                }`}
              >
                {metrics.overdueInvoicesCount > 0
                  ? formatBRL(metrics.overdueAmount)
                  : "Em dia"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {metrics.overdueInvoicesCount > 0
                  ? `${metrics.overdueInvoicesCount} vencida(s) (${metrics.delinquentContractsCount} contrato(s)) • `
                  : ""}
                {metrics.dueSoonCount} vence(m) em até 5 dias
              </p>
            </CardHeader>
          </Card>

          <Card className="platform-metric">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Usuários & Adequações</span>
                <Users className="h-4 w-4 text-accent" />
              </CardDescription>
              <CardTitle className="text-2xl">{store.users.length}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {metrics.openRequests} adequação(ões) • {store.pendingRequests.length} acesso(s) pendente(s)
              </p>
            </CardHeader>
          </Card>
        </div>

        {(metrics.overdueInvoicesCount > 0 ||
          metrics.dueSoonCount > 0 ||
          store.pendingRequests.length > 0) && (
          <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="font-medium">Alertas do mês:</span>
              {metrics.overdueInvoicesCount > 0 && (
                <Badge variant="destructive" className="text-[11px]">
                  {metrics.overdueInvoicesCount} cobrança(s) em atraso ({formatBRL(metrics.overdueAmount)})
                </Badge>
              )}
              {metrics.dueSoonCount > 0 && (
                <Badge variant="outline" className="text-[11px] border-amber-500/40 text-amber-300">
                  {metrics.dueSoonCount} vence(m) nos próximos 5 dias
                </Badge>
              )}
              {store.pendingRequests.length > 0 && (
                <Badge variant="secondary" className="text-[11px]">
                  {store.pendingRequests.length} solicitação(ões) de acesso aguardando
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {(metrics.overdueInvoicesCount > 0 || metrics.dueSoonCount > 0) && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setActiveTab("billing")}>
                  Abrir Financeiro
                </Button>
              )}
              {store.pendingRequests.length > 0 && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setActiveTab("users")}>
                  Ver Acessos
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Navegação principal */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto">
            <TabsTrigger value="contracts" className="py-3 whitespace-normal text-center text-xs">
              Contratos ({store.contracts.length})
            </TabsTrigger>
            <TabsTrigger value="billing" className="py-3 whitespace-normal text-center text-xs">
              Financeiro & Cobranças
              {metrics.overdueInvoicesCount > 0 ? ` (${metrics.overdueInvoicesCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="plans-clauses" className="py-3 whitespace-normal text-center text-xs">
              Cláusulas & Planos
            </TabsTrigger>
            <TabsTrigger value="users" className="py-3 whitespace-normal text-center text-xs">
              Usuários & Acessos ({store.users.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="py-3 whitespace-normal text-center text-xs">
              Adequações ({metrics.openRequests})
            </TabsTrigger>
            <TabsTrigger value="catalog" className="py-3 whitespace-normal text-center text-xs">
              Catálogo
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CONTRATOS */}
          <TabsContent value="contracts" className="space-y-4">
            <div className="border-b border-border pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por código (CTR-001), cliente, cidade ou pasta..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={segmentFilter}
                    onValueChange={(v) => setSegmentFilter(v as "all" | ProjectSegment)}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os segmentos</SelectItem>
                      <SelectItem value="igreja">Igreja & Ministério</SelectItem>
                      <SelectItem value="comercio">Comércio & Empresas</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as "all" | ContractStatus)}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="implantacao">Em implantação</SelectItem>
                      <SelectItem value="demonstracao">Modelo Demo</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">Link base dos clientes:</span>
                <code className="text-xs font-mono text-foreground break-all">{originInfo.origin}</code>
                <Badge variant={originInfo.mode === "manual" ? "secondary" : "outline"} className="text-[11px]">
                  {originInfo.mode === "manual" ? "Manual" : "Automático"}
                </Badge>
                {originInfo.mode === "auto" && originInfo.isEphemeralBrowser && originInfo.browserOrigin && (
                  <span className="text-[11px] text-muted-foreground">
                    (preview/local em {originInfo.browserOrigin} — usando padrão público)
                  </span>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs shrink-0"
                onClick={() => setOriginDialogOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Alterar link base
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredContracts.map((contract) => {
                const seg = SEGMENT_DEFINITIONS[contract.segment];
                const statusInfo = STATUS_BADGE[contract.status];
                const usersCount = store.users.filter(
                  (u) => u.contractId === contract.id
                ).length;
                const delinquency = getContractDelinquencySummary(
                  contract,
                  todayIsoDate(),
                  store.billingConfig.gracePeriodDays
                );
                const legalMeta = contract.contractLegalStatus
                  ? CONTRACT_LEGAL_STATUS_META[contract.contractLegalStatus]
                  : null;

                return (
                  <Card
                    key={contract.id}
                    className={`flex flex-col justify-between transition-shadow hover:shadow-md ${
                      contract.id === "ctr-001-ebd-exemplo"
                        ? "border-primary/40 ring-1 ring-primary/15"
                        : ""
                    }`}
                  >
                    <CardHeader className="pb-3 space-y-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="font-mono bg-secondary text-secondary-foreground hover:bg-secondary">
                            {contract.code}
                          </Badge>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          <Badge className={contract.segment === "igreja" ? "bg-primary/10 text-primary border-primary/30" : "bg-accent/10 text-accent border-accent/30"} variant="outline">
                            {contract.segment === "igreja" ? (
                              <Church className="h-3 w-3 mr-1" />
                            ) : (
                              <Store className="h-3 w-3 mr-1" />
                            )}
                            {seg.name}
                          </Badge>
                          {delinquency.status === "inadimplente" && (
                            <Badge variant="destructive" className="text-[11px]">
                              Em atraso ({delinquency.maxDaysOverdue}d)
                            </Badge>
                          )}
                          {delinquency.status === "a_vencer" && (
                            <Badge variant="outline" className="text-[11px] border-amber-500/40 text-amber-400">
                              A vencer
                            </Badge>
                          )}
                          {delinquency.status === "adimplente" && (
                            <Badge variant="outline" className="text-[11px] border-emerald-500/40 text-emerald-400">
                              Em dia
                            </Badge>
                          )}
                          {legalMeta && (
                            <Badge variant={legalMeta.badgeVariant} className="text-[10px]">
                              {legalMeta.label}
                            </Badge>
                          )}
                        </div>

                        {!contract.isReferenceExample && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Remover contrato"
                            onClick={async () => {
                              if (
                                confirm(
                                  `Remover o contrato ${contract.code} (${contract.clientName})?`
                                )
                              ) {
                                try { await store.deleteContract(contract.id); } catch (e: unknown) { toast({ variant: "destructive", title: "Não foi possível excluir", description: e instanceof Error ? e.message : String(e) }); }
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div>
                        <CardTitle className="text-lg leading-snug">
                          {contract.clientName}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {[
                            contract.city,
                            contract.responsibleName &&
                              `Resp.: ${contract.responsibleName}`,
                            `${usersCount} usuário(s)`,
                            typeof contract.monthlyValue === "number"
                              ? `${formatBRL(contract.monthlyValue)}/mês`
                              : null,
                            `${contract.unitsCount ?? 1} ${
                              contract.segment === "igreja" ? "igreja(s)" : "unid."
                            }`,
                            contract.documentNumber || null,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </CardDescription>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Módulos Ativos */}
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-muted-foreground">
                          Módulos habilitados neste contrato:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {contract.activeModules.map((modId) => {
                            const mod = getModuleById(modId);
                            return (
                              <Badge key={modId} variant="secondary" className="text-xs">
                                {mod?.shortName ?? modId}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pasta isolada */}
                      <div className="rounded-md bg-muted border border-border px-3 py-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderGit2 className="h-4 w-4 text-primary shrink-0" />
                          <code className="text-xs text-muted-foreground truncate">
                            GitHub/{contract.codeFolder}/
                          </code>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs shrink-0"
                          onClick={() => handleCopyContractPrompt(contract)}
                        >
                          {copiedContractId === contract.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 mr-1 text-success" /> Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 mr-1" /> Copiar Ref.
                            </>
                          )}
                        </Button>
                      </div>

                      {contract.notes && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {contract.notes}
                        </p>
                      )}

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs text-muted-foreground break-all">
                            {contractPublicUrl(contract, false, originInfo.origin)}
                          </p>
                          <Badge variant={contract.requireLoginOnEntry ? "secondary" : "outline"} className="text-[10px]">
                            {contract.requireLoginOnEntry ? "Login na entrada" : "Acesso direto"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <ContractLinkMenu contract={contract} />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingLinkContract(contract)}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            Editar link
                          </Button>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          className="flex-1 min-w-[160px]"
                          onClick={() => navigate(contract.entryPath)}
                        >
                          Abrir sistema
                          <ArrowRight className="h-4 w-4 ml-1.5" />
                        </Button>

                        <Button
                          variant="secondary"
                          onClick={() => {
                            switchToClientSimulation({
                              id: `sim-${contract.id}`,
                              name: contract.responsibleName || contract.clientName,
                              email: contract.responsibleEmail || `acesso@${contract.id}.local`,
                              contractId: contract.id,
                              roleLabel:
                                contract.segment === "igreja"
                                  ? "Gestor da Igreja"
                                  : "Gestor Comercial",
                              accessLevel: "gestor_contrato",
                              authSource: contract.authSource,
                              status: "ativo",
                              createdAt: contract.createdAt,
                            });
                            navigate(contract.entryPath);
                          }}
                          title="Simular a visão restrita que o cliente final enxerga"
                        >
                          <Eye className="h-4 w-4 mr-1.5" /> Ver como Cliente
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => navigate(`${contract.entryPath}/users`)}
                          title="Gerenciar logins e solicitações deste contrato"
                        >
                          <Users className="h-4 w-4 mr-1.5" /> Logins
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => handleOpenBillingFor(contract.id)}
                          title="Ver cobranças e adimplência deste contrato"
                        >
                          <CreditCard className="h-4 w-4 mr-1.5" /> Cobranças
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => handleOpenDraftFor(contract.id)}
                          title="Gerar minuta contratual, cláusulas e PDF"
                        >
                          <FileText className="h-4 w-4 mr-1.5" /> Minuta
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => setEditingContract(contract)}
                          title="Configurar módulos e dados do contrato"
                        >
                          <Settings2 className="h-4 w-4 mr-1.5" /> Módulos
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => handleOpenRequestFor(contract.id)}
                          title="Registrar solicitação do cliente"
                        >
                          <MessageSquarePlus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 2: GESTÃO FINANCEIRA & COBRANÇAS */}
          <TabsContent value="billing">
            <PlatformBillingTab
              contracts={store.contracts}
              billingConfig={store.billingConfig}
              selectedContractFilter={selectedBillingContract}
              onChangeContractFilter={setSelectedBillingContract}
              onAddInvoice={store.addContractInvoice}
              onUpdateInvoice={store.updateContractInvoice}
              onDeleteInvoice={store.deleteContractInvoice}
              onGenerateCompetenceInvoices={store.generateCompetenceInvoices}
              onUpdateContract={store.updateContract}
              onSaveBillingConfig={store.saveBillingConfig}
            />
          </TabsContent>

          {/* TAB 3: CLÁUSULAS & TABELA DE PLANOS */}
          <TabsContent value="plans-clauses">
            <PlatformPlansAndClausesTab
              contracts={store.contracts}
              pricingTiers={store.pricingTiers}
              clauseTemplates={store.clauseTemplates}
              billingConfig={store.billingConfig}
              selectedContractId={selectedLegalContractId || store.contracts[0]?.id || ""}
              onSelectContractId={setSelectedLegalContractId}
              activeSubSection={plansSubSection}
              onChangeSubSection={setPlansSubSection}
              onSavePricingTiers={store.savePricingTiers}
              onSaveClauseTemplates={store.saveClauseTemplates}
              onSaveBillingConfig={store.saveBillingConfig}
              onUpdateContract={store.updateContract}
            />
          </TabsContent>

          {/* TAB 4: USUÁRIOS */}
          <TabsContent value="users">
            <PlatformUsersTab
              contracts={store.contracts}
              users={store.users}
              pendingRequests={store.pendingRequests}
              onAddUser={store.addUser}
              onUpdateAccess={store.updateUserAccess}
              onApprovePending={store.approvePendingUser}
              onRejectPending={store.rejectPendingUser}
              onUpdateStatus={store.updateUserStatus}
              onDeleteUser={store.deleteUser}
            />
          </TabsContent>

          {/* TAB 5: SOLICITAÇÕES DE AJUSTE */}
          <TabsContent value="requests">
            <PlatformRequestsTab
              contracts={store.contracts}
              requests={store.changeRequests}
              preselectedContractId={preselectedReqContract}
              onAddRequest={store.addChangeRequest}
              onUpdateStatus={store.updateChangeRequestStatus}
              onDeleteRequest={store.deleteChangeRequest}
            />
          </TabsContent>

          {/* TAB 6: CATÁLOGO & ARQUITETURA */}
          <TabsContent value="catalog">
            <PlatformCatalogTab contracts={store.contracts} />
          </TabsContent>
        </Tabs>
      </main>

      <NewContractDialog
        open={newContractOpen}
        onOpenChange={setNewContractOpen}
        nextCodePreview={nextCodePreview}
        pricingTiers={store.pricingTiers}
        onCreate={async (input) => {
          const created = await store.addContract(input);
          toast({
            title: `Contrato ${created.code} criado!`,
            description: `Pasta reservada: GitHub/${created.codeFolder}/`,
          });
          return created;
        }}
      />

      <ContractModulesDialog
        contract={editingContract}
        pricingTiers={store.pricingTiers}
        onClose={() => setEditingContract(null)}
        onSave={async (id, patch) => {
          await store.updateContract(id, patch);
          toast({ title: "Contrato atualizado com sucesso" });
        }}
      />

      <ContractLinkDialog
        contract={editingLinkContract}
        onClose={() => setEditingLinkContract(null)}
        onSave={async (id, patch) => {
          await store.updateContract(id, patch);
        }}
      />

      <AccountAccessDialog open={accountOpen} onOpenChange={setAccountOpen} email={authState.email ?? ""} />
      <PlatformOriginDialog
        open={originDialogOpen}
        onOpenChange={setOriginDialogOpen}
        sampleEntryPath={store.contracts[0]?.entryPath}
        onSave={store.updatePlatformOrigin}
      />
      <SupabaseStatusBadge />
    </div>
  );
};
