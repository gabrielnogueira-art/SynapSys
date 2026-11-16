import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronUp,
  Church,
  Copy,
  Database,
  FileCheck2,
  Hash,
  Landmark,
  Layers,
  Lock,
  LogIn,
  Mail,
  Menu,
  Package,
  Printer,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlatformBrand } from "@/platform/components/PlatformBrand";
import { MODULE_CATALOG } from "@/platform/catalog";
import { ModuleId, ProjectSegment } from "@/platform/types";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

type NavSectionId = "home" | "quem-somos" | "produtos" | "contatos";

const NAV_ITEMS: Array<{ id: NavSectionId; label: string }> = [
  { id: "home", label: "Home" },
  { id: "quem-somos", label: "Quem Somos" },
  { id: "produtos", label: "Produtos" },
  { id: "contatos", label: "Contatos" },
];

const WORKFLOW_STEPS = [
  {
    number: "01",
    title: "Link Exclusivo & Login Inteligente",
    subtitle: "Cada instituição tem sua própria porta de entrada.",
    description:
      "Entregue um endereço personalizado para cada cliente (ex.: /c/ad-madureira). Ao autenticar pelo link direto ou pelo site SynapSys, o sistema identifica o usuário e carrega somente o contrato e as áreas liberadas.",
    tag: "Acesso Unificado",
  },
  {
    number: "02",
    title: "Permissões Granulares por Área",
    subtitle: "Um único login, cada equipe vê apenas o que precisa.",
    description:
      "Defina por usuário quais módulos ficam visíveis (EBD, Tesouraria, Secretaria, Estoque, PDV) e o nível interno em cada área — sem segundo login para abrir o painel administrativo.",
    tag: "Controle de Acesso",
  },
  {
    number: "03",
    title: "Secretaria com Matrícula Permanente",
    subtitle: "Histórico preservado mesmo em bases com +16.000 cadastros.",
    description:
      "Matrículas sequenciais que nunca resetam, ficha completa com vínculo conjugal, controle de congregações e listas de seleção editáveis salvas direto no banco de dados.",
    tag: "Secretaria Eclesiástica",
  },
  {
    number: "04",
    title: "Tesouraria, Recibo Térmico & Conferência",
    subtitle: "Lançamento simplificado com cupom estreito 58mm/80mm.",
    description:
      "Predefinições automáticas para dízimos e ofertas, mês de referência ajustável, impressão imediata em bobina estreita e conferência detalhada por operador responsável (manhã/noite).",
    tag: "Tesouraria & Caixa",
  },
];

const PRODUCT_HIGHLIGHTS: Record<ModuleId, string[]> = {
  igreja_ebd: [
    "Hierarquia Ministério → Sede → Regional → Congregação",
    "Chamada, alunos, professores e confronto de ofertas",
    "Painel administrativo integrado sem segundo login",
  ],
  igreja_tesouraria: [
    "Lançamento simplificado com predefinições de dízimos",
    "Recibo térmico 58mm/80mm e download automático",
    "Conferência por responsável, turno, conta e data",
  ],
  igreja_secretaria: [
    "Matrícula sequencial permanente que nunca é resetada",
    "Ficha completa com cônjuge e listas editáveis no banco",
    "Emissão de cartas/documentos e agenda ministerial",
  ],
  comercio_tesouraria: [
    "Fluxo de caixa diário e conciliação bancária",
    "Contas a pagar e receber por centro de custo",
    "Visão gerencial isolada por contrato",
  ],
  comercio_secretaria: [
    "Gestão de documentos e cadastros corporativos",
    "Protocolos internos e registros administrativos",
    "Permissões por colaborador e área",
  ],
  comercio_estoque: [
    "Controle de SKUs, entradas e saídas",
    "Alertas automáticos de estoque mínimo",
    "Inventário atualizado em tempo real",
  ],
  comercio_rh: [
    "Cadastro de equipe, cargos e departamentos",
    "Organização de escalas e vínculos internos",
    "Dados isolados por empresa contratante",
  ],
  comercio_pdv: [
    "Registro ágil de vendas e pedidos diários",
    "Acompanhamento de faturamento em tempo real",
    "Integração modular com estoque e financeiro",
  ],
};

function MODULE_ICON(id: ModuleId) {
  switch (id) {
    case "igreja_ebd":
      return <BookOpen className="h-5 w-5" />;
    case "igreja_tesouraria":
    case "comercio_tesouraria":
      return <Landmark className="h-5 w-5" />;
    case "igreja_secretaria":
    case "comercio_secretaria":
      return <Building2 className="h-5 w-5" />;
    case "comercio_estoque":
      return <Package className="h-5 w-5" />;
    case "comercio_rh":
      return <Users className="h-5 w-5" />;
    case "comercio_pdv":
      return <ShoppingCart className="h-5 w-5" />;
  }
}

function AnimatedStat({
  target,
  suffix = "",
  label,
  detail,
  active,
}: {
  target: number;
  suffix?: string;
  label: string;
  detail: string;
  active: boolean;
}) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target]);

  return (
    <div className="rounded-xl border border-border bg-card/80 p-5 transition-all hover:border-primary/50 hover:-translate-y-0.5">
      <div className="text-3xl font-bold text-primary">
        {val}
        {suffix}
      </div>
      <div className="text-sm font-semibold text-foreground mt-1">{label}</div>
      <p className="text-xs text-muted-foreground mt-1">{detail}</p>
    </div>
  );
}

export const SynapSysSite = () => {
  const role = useUserRole();
  const { toast } = useToast();

  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSectionId>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Interactive Hero preview state
  const [heroVertical, setHeroVertical] = useState<ProjectSegment>("igreja");
  const [heroChurchModule, setHeroChurchModule] = useState<
    "igreja_ebd" | "igreja_tesouraria" | "igreja_secretaria"
  >("igreja_tesouraria");

  // Scroll-linked workflow step state
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Quem Somos reveal/count-up state
  const [aboutVisible, setAboutVisible] = useState(false);
  const aboutRef = useRef<HTMLElement | null>(null);

  // Produtos filter & selection state
  const [productFilter, setProductFilter] = useState<"all" | ProjectSegment>("all");
  const [selectedProduct, setSelectedProduct] = useState<ModuleId>("igreja_tesouraria");

  // Contact form state
  const [contactName, setContactName] = useState("");
  const [contactOrg, setContactOrg] = useState("");
  const [contactChannel, setContactChannel] = useState("");
  const [contactSegment, setContactSegment] = useState<ProjectSegment>("igreja");
  const [contactProduct, setContactProduct] = useState<string>("Plataforma Completa");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);

  const heroRef = useRef<HTMLElement | null>(null);

  // Scroll progress & sticky header style
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? Math.min(100, (y / docHeight) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active section spy on scroll
  useEffect(() => {
    const sections = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          setActiveSection(visible.target.id as NavSectionId);
        }
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: [0.1, 0.35, 0.6] }
    );

    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, []);

  // Scroll-linked step activation
  useEffect(() => {
    const nodes = stepRefs.current.filter((n): n is HTMLDivElement => Boolean(n));
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-step-idx"));
            if (!Number.isNaN(idx)) setActiveStep(idx);
          }
        }
      },
      { rootMargin: "-38% 0px -42% 0px", threshold: 0.2 }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  // Trigger Quem Somos animated counters once visible
  useEffect(() => {
    const el = aboutRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setAboutVisible(true);
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: NavSectionId) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect || !heroRef.current) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    heroRef.current.style.setProperty("--mx", `${x}%`);
    heroRef.current.style.setProperty("--my", `${y}%`);
  };

  const filteredProducts = useMemo(() => {
    if (productFilter === "all") return MODULE_CATALOG;
    return MODULE_CATALOG.filter((m) => m.segment === productFilter);
  }, [productFilter]);

  const handleInterestInProduct = (modId: ModuleId) => {
    const mod = MODULE_CATALOG.find((m) => m.id === modId);
    if (!mod) return;
    setSelectedProduct(modId);
    setContactSegment(mod.segment);
    setContactProduct(mod.name);
    scrollToSection("contatos");
  };

  const contactSummaryText = useMemo(
    () =>
      [
        `Solicitação pelo site SynapSys`,
        `Nome: ${contactName || "-"}`,
        `Organização: ${contactOrg || "-"}`,
        `Contato: ${contactChannel || "-"}`,
        `Segmento: ${contactSegment === "igreja" ? "Igreja & Ministério" : "Comércio & Empresas"}`,
        `Interesse: ${contactProduct}`,
        contactMessage ? `Mensagem: ${contactMessage}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    [contactName, contactOrg, contactChannel, contactSegment, contactProduct, contactMessage]
  );

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactChannel.trim()) return;
    setContactSent(true);
    toast({
      title: "Solicitação registrada!",
      description: "Você pode copiar o resumo ou abrir direto no seu aplicativo de e-mail.",
    });
  };

  const activeModuleDef = useMemo(
    () => MODULE_CATALOG.find((m) => m.id === selectedProduct) ?? MODULE_CATALOG[0],
    [selectedProduct]
  );

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-foreground">
      {/* Sticky Adaptive Navbar + Scroll Progress */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
          scrolled
            ? "bg-background/90 backdrop-blur-xl border-b border-border/80 shadow-lg"
            : "bg-background/40 backdrop-blur-md border-b border-transparent"
        }`}
      >
        {/* Dynamic Scroll Progress Line */}
        <div className="h-[3px] w-full bg-border/30 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-primary-glow to-accent transition-transform duration-75 origin-left"
            style={{ transform: `scaleX(${scrollProgress / 100})` }}
          />
        </div>

        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => scrollToSection("home")}
            className="text-left focus:outline-none"
          >
            <PlatformBrand />
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 rounded-full border border-border/70 bg-card/60 px-1.5 py-1 backdrop-blur">
            {NAV_ITEMS.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right CTAs */}
          <div className="hidden md:flex items-center gap-2">
            {role.role === "master" && (
              <Link to="/plataforma">
                <Button variant="ghost" size="sm" className="text-xs">
                  Painel Master
                </Button>
              </Link>
            )}
            <Link to="/login">
              <Button variant="outline" size="sm" className="border-primary/40 hover:border-primary">
                <LogIn className="h-4 w-4 mr-1.5 text-primary" />
                Login
              </Button>
            </Link>
            <Button size="sm" onClick={() => scrollToSection("contatos")}>
              Solicitar Demo
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>

          {/* Mobile Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <Link to="/login">
              <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                <LogIn className="h-3.5 w-3.5 mr-1 text-primary" /> Login
              </Button>
            </Link>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl px-4 py-4 space-y-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                  activeSection === item.id
                    ? "bg-primary/15 text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              {role.role === "master" && (
                <Link to="/plataforma" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Ir para Painel Master
                  </Button>
                </Link>
              )}
              <Button className="w-full" onClick={() => scrollToSection("contatos")}>
                Solicitar Demonstração
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* SECTION 1: HOME (HERO + INTERACTIVE WORKSPACE PREVIEW) */}
      <section
        id="home"
        ref={heroRef}
        onMouseMove={handleHeroMouseMove}
        className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 overflow-hidden synapsys-grid-bg"
      >
        <div className="pointer-events-none absolute inset-0 synapsys-hero-spotlight transition-opacity duration-300" />
        <div className="container relative mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/10 text-primary px-3 py-1 text-xs"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Plataforma Modular de Gestão • Igrejas &amp; Empresas
            </Badge>

            <h1 className="text-3xl sm:text-5xl font-bold leading-tight text-foreground">
              Gestão sob medida com{" "}
              <span className="text-primary">inteligência operacional</span> e
              acesso isolado por contrato.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
              O <strong>SynapSys</strong> reúne Escola Bíblica Dominical, Tesouraria com
              recibo térmico, Secretaria com matrícula permanente e módulos empresariais
              em ambientes exclusivos, seguros e configuráveis sem perder sua identidade.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button size="lg" onClick={() => scrollToSection("produtos")}>
                Explorar Produtos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary/40 hover:border-primary"
                >
                  <LogIn className="h-4 w-4 mr-2 text-primary" />
                  Acessar Minha Plataforma (Login)
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/60 max-w-lg text-xs">
              <div>
                <div className="font-bold text-foreground text-base">Link Próprio</div>
                <span className="text-muted-foreground">Portal dedicado por cliente</span>
              </div>
              <div>
                <div className="font-bold text-foreground text-base">Multi-Níveis</div>
                <span className="text-muted-foreground">Cada equipe vê sua área</span>
              </div>
              <div>
                <div className="font-bold text-foreground text-base">Tempo Real</div>
                <span className="text-muted-foreground">Dados salvos em nuvem</span>
              </div>
            </div>
          </div>

          {/* Interactive Preview Card */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-border bg-card/95 shadow-2xl overflow-hidden backdrop-blur">
              {/* Simulated browser bar */}
              <div className="px-4 py-3 border-b border-border bg-muted/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  <code className="ml-2 text-[11px] font-mono text-muted-foreground truncate">
                    https://synapsys-group.lovable.app/c/
                    {heroVertical === "igreja" ? "sua-igreja" : "sua-empresa"}
                  </code>
                </div>
                <div className="flex rounded-lg bg-background p-0.5 border border-border">
                  <button
                    type="button"
                    onClick={() => setHeroVertical("igreja")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
                      heroVertical === "igreja"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Church className="h-3 w-3" /> Igreja
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroVertical("comercio")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
                      heroVertical === "comercio"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Store className="h-3 w-3" /> Comércio
                  </button>
                </div>
              </div>

              {heroVertical === "igreja" ? (
                <div className="p-5 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "igreja_tesouraria" as const, label: "Tesouraria", icon: Landmark },
                      { id: "igreja_secretaria" as const, label: "Secretaria", icon: Building2 },
                      { id: "igreja_ebd" as const, label: "EBD", icon: BookOpen },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const active = heroChurchModule === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setHeroChurchModule(tab.id)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                            active
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {heroChurchModule === "igreja_tesouraria" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border bg-background/70 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">Lançamento Simplificado</span>
                          <Badge variant="outline" className="text-[10px]">Predefinição ativa</Badge>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between py-1 border-b border-border/50">
                            <span className="text-muted-foreground">Finalidade</span>
                            <span className="font-medium">Dízimo de Membros</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/50">
                            <span className="text-muted-foreground">Referência</span>
                            <span className="font-medium">Novembro/2026</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/50">
                            <span className="text-muted-foreground">Responsável</span>
                            <span className="font-medium text-primary">Operador Manhã</span>
                          </div>
                          <div className="flex justify-between pt-1">
                            <span className="text-muted-foreground">Valor</span>
                            <span className="font-bold text-emerald-400">R$ 480,00</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-dashed border-primary/40 bg-white text-slate-900 p-3.5 font-mono text-[10px] space-y-1">
                        <div className="text-center font-bold">IGREJA EXEMPLO • SEDE</div>
                        <div className="text-center text-[9px] text-slate-600">
                          RECIBO TÉRMICO (58mm / 80mm)
                        </div>
                        <div className="border-t border-dashed border-slate-400 my-1" />
                        <div className="flex justify-between">
                          <span>Recibo:</span>
                          <strong>REC-0412</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Membro:</span>
                          <span>#3686 • João S.</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ref.:</span>
                          <span>11/2026</span>
                        </div>
                        <div className="border border-slate-800 text-center font-bold py-1 my-1">
                          VALOR: R$ 480,00
                        </div>
                        <div className="text-[9px] text-slate-600">
                          Emitido por: tesouraria@igreja.org
                        </div>
                      </div>
                    </div>
                  )}

                  {heroChurchModule === "igreja_secretaria" && (
                    <div className="rounded-xl border border-border bg-background/70 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-primary" />
                          <span className="text-xs font-semibold">
                            Sequência Permanente de Matrículas
                          </span>
                        </div>
                        <Badge className="font-mono text-[10px]">Próxima: #16.402</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-lg bg-card p-2 border border-border">
                          <div className="font-bold text-primary text-base">7.120</div>
                          <div className="text-[10px] text-muted-foreground">Ativos</div>
                        </div>
                        <div className="rounded-lg bg-card p-2 border border-border">
                          <div className="font-bold text-foreground text-base">16.401</div>
                          <div className="text-[10px] text-muted-foreground">Histórico</div>
                        </div>
                        <div className="rounded-lg bg-card p-2 border border-border">
                          <div className="font-bold text-emerald-400 text-base">100%</div>
                          <div className="text-[10px] text-muted-foreground">Listas no BD</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center justify-between border-t border-border/60 pt-2">
                        <span>#3686 • Maria Oliveira • Casada (Cônjuge: #3685)</span>
                        <Badge variant="outline" className="text-[10px]">Ativo</Badge>
                      </div>
                    </div>
                  )}

                  {heroChurchModule === "igreja_ebd" && (
                    <div className="rounded-xl border border-border bg-background/70 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">
                          Portal EBD • Sessão Única (Sem 2º Login)
                        </span>
                        <Badge variant="secondary" className="text-[10px]">Em Produção</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {["Formulário de Aula", "Hinos (Coristas)", "Painel ADM Direto", "Status de Hoje"].map(
                          (card) => (
                            <div
                              key={card}
                              className="rounded-lg border border-border bg-card p-2.5 flex items-center gap-2"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="truncate font-medium">{card}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">
                      Suite Empresarial • Módulos Integrados
                    </span>
                    <Badge variant="outline" className="text-[10px]">Multi-Equipe</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    {[
                      { label: "Financeiro", value: "Fluxo & DRE", icon: Landmark },
                      { label: "Estoque", value: "SKUs & Alertas", icon: Package },
                      { label: "Vendas / PDV", value: "Pedidos Diários", icon: ShoppingCart },
                      { label: "Secretaria", value: "Contratos & Docs", icon: FileCheck2 },
                      { label: "RH & Equipe", value: "Cargos & Escalas", icon: Users },
                      { label: "Permissões", value: "Por Departamento", icon: Lock },
                    ].map((mod) => {
                      const Icon = mod.icon;
                      return (
                        <div
                          key={mod.label}
                          className="rounded-lg border border-border bg-background/70 p-3 space-y-1"
                        >
                          <Icon className="h-4 w-4 text-primary" />
                          <div className="font-semibold">{mod.label}</div>
                          <div className="text-[11px] text-muted-foreground">{mod.value}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE SCROLL-DRIVEN WALKTHROUGH */}
      <section className="py-20 border-t border-border/60 bg-card/30">
        <div className="container mx-auto px-4 sm:px-6 space-y-12">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Experiência Interativa
            </p>
            <h2 className="text-2xl sm:text-4xl font-bold">
              Role e acompanhe como a plataforma se adapta à sua operação
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Scroll-observed step list */}
            <div className="lg:col-span-6 space-y-5">
              {WORKFLOW_STEPS.map((step, idx) => {
                const isActive = activeStep === idx;
                return (
                  <div
                    key={step.number}
                    data-step-idx={idx}
                    ref={(el) => {
                      stepRefs.current[idx] = el;
                    }}
                    onClick={() => setActiveStep(idx)}
                    className={`cursor-pointer rounded-xl border p-5 transition-all duration-300 ${
                      isActive
                        ? "border-primary bg-card shadow-lg ring-1 ring-primary/30 translate-x-1"
                        : "border-border/70 bg-card/40 opacity-75 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        ETAPA {step.number}
                      </span>
                      <Badge variant={isActive ? "default" : "outline"} className="text-[10px]">
                        {step.tag}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                    <p className="text-xs font-medium text-primary/90 mt-0.5">{step.subtitle}</p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Sticky visual stage changing with scroll */}
            <div className="lg:col-span-6 lg:sticky lg:top-28">
              <div className="rounded-2xl border border-primary/30 bg-card p-6 shadow-2xl space-y-5 transition-all duration-300">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <div className="text-[11px] font-mono text-primary">
                      ETAPA {WORKFLOW_STEPS[activeStep].number} DE 04
                    </div>
                    <div className="text-base font-bold">
                      {WORKFLOW_STEPS[activeStep].title}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {WORKFLOW_STEPS.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveStep(idx)}
                        aria-label={`Etapa ${idx + 1}`}
                        className={`h-2 rounded-full transition-all ${
                          activeStep === idx ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {activeStep === 0 && (
                  <div className="space-y-3 text-sm">
                    <div className="rounded-lg border border-border bg-background/70 p-3.5">
                      <div className="text-xs text-muted-foreground">Link do contrato</div>
                      <code className="text-xs font-mono text-primary break-all">
                        https://synapsys-group.lovable.app/c/ad-madureira
                      </code>
                    </div>
                    <div className="rounded-lg border border-border bg-background/70 p-3.5 space-y-2">
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-primary" /> Login único na entrada
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Quem entra pelo link do contrato ou pelo botão Login do site cai diretamente no seu ambiente autenticado.
                      </p>
                    </div>
                  </div>
                )}

                {activeStep === 1 && (
                  <div className="space-y-2.5 text-xs">
                    {[
                      {
                        email: "ebd@igreja.org",
                        areas: "Somente EBD",
                        level: "Admin Geral EBD (acesso direto ao ADM)",
                      },
                      {
                        email: "caixa.manha@igreja.org",
                        areas: "Somente Tesouraria",
                        level: "Lançador Simplificado",
                      },
                      {
                        email: "secretaria@igreja.org",
                        areas: "Secretaria + Documentos",
                        level: "Secretário Geral",
                      },
                    ].map((row) => (
                      <div
                        key={row.email}
                        className="rounded-lg border border-border bg-background/70 p-3 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{row.email}</div>
                          <div className="text-muted-foreground">{row.level}</div>
                        </div>
                        <Badge variant="secondary">{row.areas}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="space-y-3 text-xs">
                    <div className="rounded-lg border border-border bg-background/70 p-3.5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Matrícula #3686 — Registro preservado</span>
                        <Badge>Ativo</Badge>
                      </div>
                      <div className="text-muted-foreground">
                        Cônjuge vinculado: #3685 • Congregação: Igreja Sede • Listas de cargos e situações editáveis diretamente no banco.
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-background/70 p-3.5 flex items-center gap-2 text-muted-foreground">
                      <Database className="h-4 w-4 text-primary shrink-0" />
                      <span>
                        Todas as opções de caixas de seleção são adicionadas, editadas e removidas com persistência no Supabase.
                      </span>
                    </div>
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="space-y-3 text-xs">
                    <div className="rounded-lg border border-border bg-background/70 p-3.5 space-y-2">
                      <div className="font-semibold flex items-center gap-1.5">
                        <Printer className="h-4 w-4 text-primary" /> Impressora Térmica 58mm / 80mm
                      </div>
                      <p className="text-muted-foreground">
                        Ao salvar o dízimo, abre o recibo formatado com data/hora, mês de referência, membro/obreiro e responsável emissor.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border bg-background/70 p-3">
                        <div className="text-[11px] text-muted-foreground">Culto Manhã</div>
                        <div className="font-bold text-emerald-400 text-sm">R$ 3.450,00</div>
                      </div>
                      <div className="rounded-lg border border-border bg-background/70 p-3">
                        <div className="text-[11px] text-muted-foreground">Culto Noite</div>
                        <div className="font-bold text-emerald-400 text-sm">R$ 2.180,00</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-border flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Pronto para testar no seu ambiente
                  </span>
                  <Button size="sm" variant="outline" onClick={() => scrollToSection("contatos")}>
                    Agendar apresentação
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: QUEM SOMOS */}
      <section
        id="quem-somos"
        ref={aboutRef}
        className="py-20 border-t border-border/60"
      >
        <div className="container mx-auto px-4 sm:px-6 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Quem Somos
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold">
                Engenharia de software para quem precisa de controle real, não de planilhas soltas
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                A <strong>SynapSys — Sistemas &amp; Inteligência</strong> desenvolve soluções modulares de gestão em nuvem para{" "}
                <strong>Igrejas &amp; Ministérios</strong> e <strong>Comércio &amp; Empresas</strong>.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Nossa arquitetura foi projetada para crescer com cada cliente: cada contrato possui identidade, link dedicado, controle de acessos por equipe e base de dados isolada no Supabase com segurança em nível de linha (RLS) — permitindo evoluções e customizações exclusivas sem impactar outros clientes.
              </p>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatedStat
                target={100}
                suffix="%"
                label="Isolamento por Contrato"
                detail="Cada organização opera em ambiente próprio com segurança RLS."
                active={aboutVisible}
              />
              <AnimatedStat
                target={8}
                label="Módulos Especializados"
                detail="Soluções eclesiásticas e empresariais ativáveis por contrato."
                active={aboutVisible}
              />
              <AnimatedStat
                target={2}
                label="Verticais Dedicadas"
                detail="Regras separadas para Igrejas/Ministérios e Comércio."
                active={aboutVisible}
              />
              <AnimatedStat
                target={80}
                suffix="mm"
                label="Cupom Térmico Nativo"
                detail="Recibos prontos para bobinas estreitas de 58mm e 80mm."
                active={aboutVisible}
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: PRODUTOS */}
      <section
        id="produtos"
        className="py-20 border-t border-border/60 bg-card/30"
      >
        <div className="container mx-auto px-4 sm:px-6 space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Produtos &amp; Módulos
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold">
                Escolha exatamente os módulos que sua organização precisa
              </h2>
              <p className="text-sm text-muted-foreground">
                Ative um módulo individual ou a suíte completa sob o mesmo link personalizado.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: "all" as const, label: "Todos (8)", icon: Layers },
                { id: "igreja" as const, label: "Igreja & Ministério (3)", icon: Church },
                { id: "comercio" as const, label: "Comércio & Empresas (5)", icon: Store },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = productFilter === tab.id;
                return (
                  <Button
                    key={tab.id}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => setProductFilter(tab.id)}
                  >
                    <Icon className="h-4 w-4 mr-1.5" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((mod) => {
              const selected = selectedProduct === mod.id;
              const highlights = PRODUCT_HIGHLIGHTS[mod.id] ?? [];
              return (
                <Card
                  key={mod.id}
                  onClick={() => setSelectedProduct(mod.id)}
                  className={`cursor-pointer flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 ${
                    selected
                      ? "border-primary ring-1 ring-primary/40 shadow-lg"
                      : "hover:border-primary/40"
                  }`}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center border border-primary/25">
                        {MODULE_ICON(mod.id)}
                      </div>
                      <Badge variant={mod.segment === "igreja" ? "default" : "secondary"}>
                        {mod.segment === "igreja" ? "Igreja" : "Comércio"}
                      </Badge>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{mod.name}</CardTitle>
                      <CardDescription className="text-xs mt-1 leading-relaxed">
                        {mod.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      type="button"
                      variant={selected ? "default" : "outline"}
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInterestInProduct(mod.id);
                      }}
                    >
                      Solicitar este módulo
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Selected Product Detail Strip */}
          <div className="rounded-xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs text-primary font-semibold uppercase">
                Módulo em destaque: {activeModuleDef.shortName}
              </div>
              <div className="font-semibold text-foreground">{activeModuleDef.name}</div>
              <p className="text-xs text-muted-foreground">{activeModuleDef.description}</p>
            </div>
            <Button onClick={() => handleInterestInProduct(activeModuleDef.id)}>
              Quero conhecer na prática
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* SECTION 4: CONTATOS & ACESSO DO CLIENTE */}
      <section id="contatos" className="py-20 border-t border-border/60">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Contatos &amp; Acesso
                </p>
                <h2 className="text-2xl sm:text-4xl font-bold">
                  Fale com a equipe SynapSys ou acesse sua plataforma
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Precisa implantar um novo contrato, adaptar módulos para a sua igreja/empresa ou tirar dúvidas? Envie sua solicitação ao lado.
                </p>
              </div>

              {/* Direct Login Box for Existing Clients */}
              <Card className="border-primary/40 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <LogIn className="h-5 w-5 text-primary" />
                    Já tem uma plataforma no SynapSys?
                  </CardTitle>
                  <CardDescription>
                    Esqueceu o link direto do seu contrato? Entre pelo login central usando seu e-mail e senha para ser redirecionado automaticamente ao seu sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/login">
                    <Button className="w-full">
                      Ir para Página de Login
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <div className="space-y-3 text-sm">
                <div className="rounded-lg border border-border bg-card p-3.5 flex items-center gap-3">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground">E-mail Comercial</div>
                    <div className="font-medium">contato@synapsys.app</div>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3.5 flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground">Implantação Sob Medida</div>
                    <div className="font-medium">
                      Migração de matrículas, identidade visual e treinamento
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Solicitar Demonstração ou Orçamento</CardTitle>
                  <CardDescription>
                    Preencha os dados abaixo para prepararmos um ambiente de teste para sua equipe.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {contactSent ? (
                    <div className="space-y-4 py-4">
                      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-2">
                        <div className="font-semibold text-emerald-400 flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5" /> Resumo pronto para envio!
                        </div>
                        <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                          {contactSummaryText}
                        </pre>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(contactSummaryText);
                              toast({ title: "Resumo copiado para a área de transferência" });
                            } catch {
                              toast({ variant: "destructive", title: "Não foi possível copiar" });
                            }
                          }}
                        >
                          <Copy className="h-4 w-4 mr-1.5" /> Copiar resumo
                        </Button>
                        <a
                          href={`mailto:contato@synapsys.app?subject=${encodeURIComponent(
                            `Contato SynapSys - ${contactOrg || contactName}`
                          )}&body=${encodeURIComponent(contactSummaryText)}`}
                        >
                          <Button type="button">
                            <Mail className="h-4 w-4 mr-1.5" /> Abrir no E-mail
                          </Button>
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setContactSent(false)}
                        >
                          Enviar outra mensagem
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="ct-name">Seu nome *</Label>
                          <Input
                            id="ct-name"
                            placeholder="Nome completo"
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="ct-org">Igreja ou Empresa</Label>
                          <Input
                            id="ct-org"
                            placeholder="Ex.: AD Ministério Central / Loja Silva"
                            value={contactOrg}
                            onChange={(e) => setContactOrg(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="ct-channel">E-mail ou WhatsApp *</Label>
                          <Input
                            id="ct-channel"
                            placeholder="(21) 99999-9999 ou seu@email.com"
                            value={contactChannel}
                            onChange={(e) => setContactChannel(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Segmento</Label>
                          <Select
                            value={contactSegment}
                            onValueChange={(v: ProjectSegment) => setContactSegment(v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="igreja">Igreja &amp; Ministério</SelectItem>
                              <SelectItem value="comercio">Comércio &amp; Empresas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label>Produto / Módulo de Interesse</Label>
                        <Select value={contactProduct} onValueChange={setContactProduct}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Plataforma Completa">
                              Plataforma Completa (Multi-Módulos)
                            </SelectItem>
                            {MODULE_CATALOG.map((m) => (
                              <SelectItem key={m.id} value={m.name}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="ct-msg">Conte sobre sua necessidade</Label>
                        <Textarea
                          id="ct-msg"
                          rows={3}
                          placeholder="Ex.: Precisamos de EBD, Secretaria com histórico de matrículas e Tesouraria..."
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                        />
                      </div>

                      <Button type="submit" className="w-full">
                        Enviar Solicitação
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card/60 py-10">
        <div className="container mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-6">
          <PlatformBrand />
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </button>
            ))}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Login do Cliente
            </Link>
            <Link to="/plataforma" className="hover:text-foreground transition-colors">
              Gestão Master
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SynapSys — Sistemas &amp; Inteligência.
          </p>
        </div>
      </footer>

      {scrolled && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => scrollToSection("home")}
          title="Voltar ao topo"
          className="fixed bottom-5 right-5 z-40 rounded-full shadow-lg bg-card/90 backdrop-blur border-primary/40 hover:border-primary"
        >
          <ChevronUp className="h-4 w-4 text-primary" />
        </Button>
      )}
    </div>
  );
};
