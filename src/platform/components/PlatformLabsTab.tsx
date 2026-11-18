import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  CheckCircle2,
  Eraser,
  FlaskConical,
  HandHeart,
  Rocket,
  RotateCcw,
  ShieldCheck,
  UserCog,
  UtensilsCrossed,
} from "lucide-react";
import type {
  LabCommercialModel,
  LabLifecycleStage,
  LabModuleId,
} from "@/platform/types";
import type {
  LabPromotionsMap,
  LabRoleMode,
  LabsSandboxState,
} from "@/platform/labs/labsTypes";
import { CantinaWorkspace } from "@/systems/church/modules/CantinaWorkspace";
import { LivrariaWorkspace } from "@/systems/church/modules/LivrariaWorkspace";
import { SocialWorkspace } from "@/systems/church/modules/SocialWorkspace";
import { formatBRL } from "@/platform/saasDefaults";
import { useToast } from "@/hooks/use-toast";

interface PlatformLabsTabProps {
  sandbox: LabsSandboxState;
  promotions: LabPromotionsMap;
  onSaveSandbox: (next: LabsSandboxState) => Promise<void>;
  onResetSandbox: (mode: "seed" | "clear_transactions") => Promise<void>;
  onSavePromotions: (next: LabPromotionsMap) => Promise<void>;
}

const LAB_MODULES: Array<{
  id: LabModuleId;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}> = [
  {
    id: "igreja_cantina",
    title: "Cantina & Eventos",
    subtitle: "Produção inicial, PDV balcão e fechamento automático com sobras/quebras",
    icon: <UtensilsCrossed className="h-5 w-5" />,
  },
  {
    id: "igreja_livraria",
    title: "Livraria & Materiais EBD",
    subtitle: "Revistas por trimestre, estoque mínimo (< 5), camisetas e lucro líquido",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    id: "igreja_social",
    title: "Ação Social & Cestas",
    subtitle: "Campanhas, montagem com baixa automática de insumos e trava mensal",
    icon: <HandHeart className="h-5 w-5" />,
  },
];

const STAGE_META: Record<
  LabLifecycleStage,
  { label: string; variant: "outline" | "secondary" | "default" }
> = {
  em_incubacao: { label: "Em Incubação", variant: "outline" },
  em_aprovacao: { label: "Em Aprovação", variant: "secondary" },
  promovido: { label: "Promovido ao Catálogo", variant: "default" },
};

const ROLE_LABELS: Record<LabRoleMode, string> = {
  admin: "Visão Administrador",
  operador: "Visão Operador de Caixa / Balcão",
  voluntario: "Visão Voluntário",
};

export const PlatformLabsTab = ({
  sandbox,
  promotions,
  onSaveSandbox,
  onResetSandbox,
  onSavePromotions,
}: PlatformLabsTabProps) => {
  const { toast } = useToast();
  const [busyReset, setBusyReset] = useState(false);
  const [busyPromo, setBusyPromo] = useState(false);

  const activeId = sandbox.activeModule;
  const activePromo = promotions[activeId];
  const [priceDraft, setPriceDraft] = useState<string>(
    String(activePromo.addonMonthlyPrice.toFixed(2))
  );

  const handleSelectModule = (modId: LabModuleId) => {
    setPriceDraft(String(promotions[modId].addonMonthlyPrice.toFixed(2)));
    void onSaveSandbox({ ...sandbox, activeModule: modId });
  };

  const handleRoleChange = (roleMode: LabRoleMode) => {
    void onSaveSandbox({ ...sandbox, roleMode });
    toast({ title: `Simulando: ${ROLE_LABELS[roleMode]}` });
  };

  const handleReset = async (mode: "seed" | "clear_transactions") => {
    setBusyReset(true);
    try {
      await onResetSandbox(mode);
      toast({
        title:
          mode === "seed"
            ? "Dados de exemplo restaurados no Labs!"
            : "Vendas e lançamentos zerados (cadastros mantidos).",
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Falha ao resetar Sandbox",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setBusyReset(false);
    }
  };

  const handleUpdatePromotion = async (
    patch: Partial<(typeof promotions)[LabModuleId]>
  ) => {
    setBusyPromo(true);
    try {
      const nextPromo = {
        ...activePromo,
        ...patch,
      };
      const nextMap: LabPromotionsMap = {
        ...promotions,
        [activeId]: nextPromo,
      };
      await onSavePromotions(nextMap);
      toast({
        title: nextPromo.promotedToCatalog
          ? "Módulo promovido ao Catálogo Oficial!"
          : "Status do módulo atualizado no Labs!",
        description: nextPromo.promotedToCatalog
          ? "Agora ele já pode ser habilitado em Módulos de qualquer contrato de igreja."
          : undefined,
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar promoção",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setBusyPromo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Isolamento do Labs */}
      <Card className="border-primary/40 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">
                  SynapSys Labs — Ambiente Isolado de P&amp;D (Igrejas)
                </CardTitle>
                <Badge variant="default">Exclusivo Master</Badge>
              </div>
              <CardDescription>
                Desenvolva, simule papéis e teste fluxos completos sem afetar nenhum contrato real. Os dados do Labs ficam isolados e invisíveis para todas as igrejas em produção até você promover para o catálogo oficial.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busyReset}
                onClick={() => handleReset("clear_transactions")}
                title="Limpa vendas, despesas e entregas mantendo itens e famílias"
              >
                <Eraser className="h-3.5 w-3.5 mr-1.5" /> Zerar Movimentos
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busyReset}
                onClick={() => handleReset("seed")}
                title="Recarrega dados fictícios realistas para testar todos os cálculos"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Resetar Dados de Teste
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {LAB_MODULES.map((m) => {
            const promo = promotions[m.id];
            const stageMeta = STAGE_META[promo.stage];
            const selected = activeId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectModule(m.id)}
                className={`rounded-xl border p-3.5 text-left transition-all flex flex-col justify-between gap-2 ${
                  selected
                    ? "border-primary bg-card ring-1 ring-primary shadow-md"
                    : "border-border bg-card/60 hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                    {m.icon}
                  </div>
                  <Badge variant={stageMeta.variant} className="text-[10px]">
                    {stageMeta.label}
                  </Badge>
                </div>
                <div>
                  <div className="font-semibold text-sm">{m.title}</div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {m.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Barra de Simulação de Papéis + Ciclo de Vida / Promoção */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCog className="h-4 w-4 text-primary" />
              Simulador de Papéis no Lab
            </CardTitle>
            <CardDescription className="text-xs">
              Alterne o perfil abaixo para testar o que cada usuário enxerga e pode alterar na tela.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {(["admin", "operador", "voluntario"] as const).map((r) => (
                <Button
                  key={r}
                  type="button"
                  size="sm"
                  variant={sandbox.roleMode === r ? "default" : "outline"}
                  onClick={() => handleRoleChange(r)}
                >
                  {ROLE_LABELS[r]}
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              Banco isolado em <code>system_settings (platform_labs_sandbox_v1)</code>.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Rocket className="h-4 w-4 text-primary" />
                Ciclo de Vida &amp; Promoção p/ Catálogo Oficial
              </CardTitle>
              <Badge variant={activePromo.promotedToCatalog ? "default" : "outline"}>
                {activePromo.promotedToCatalog
                  ? `Liberado p/ Contratos (${
                      activePromo.commercialModel === "pacote_padrao"
                        ? "Pacote Padrão"
                        : `Add-on ${formatBRL(activePromo.addonMonthlyPrice)}/mês`
                    })`
                  : "Oculto dos Clientes (Somente Labs)"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-xs">
            <div className="sm:col-span-4 space-y-1">
              <Label className="text-xs">Modelo Comercial</Label>
              <Select
                value={activePromo.commercialModel}
                onValueChange={(v) =>
                  void handleUpdatePromotion({
                    commercialModel: v as LabCommercialModel,
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pacote_padrao">Incluso no Pacote Padrão</SelectItem>
                  <SelectItem value="addon">Add-on Pago à Parte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3 space-y-1">
              <Label className="text-xs">Preço Add-on (R$/mês)</Label>
              <Input
                type="number"
                step="0.01"
                className="h-9"
                disabled={activePromo.commercialModel !== "addon"}
                value={priceDraft}
                onChange={(e) => setPriceDraft(e.target.value)}
                onBlur={() => {
                  const parsed = parseFloat(priceDraft);
                  if (Number.isFinite(parsed) && parsed !== activePromo.addonMonthlyPrice) {
                    void handleUpdatePromotion({ addonMonthlyPrice: parsed });
                  }
                }}
              />
            </div>

            <div className="sm:col-span-5 flex flex-wrap gap-2">
              {!activePromo.promotedToCatalog ? (
                <Button
                  type="button"
                  className="w-full"
                  disabled={busyPromo}
                  onClick={() =>
                    void handleUpdatePromotion({
                      stage: "promovido",
                      promotedToCatalog: true,
                      addonMonthlyPrice:
                        parseFloat(priceDraft) || activePromo.addonMonthlyPrice,
                      promotedAt: new Date().toISOString().slice(0, 10),
                    })
                  }
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Promover para Catálogo Oficial
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={busyPromo}
                  onClick={() =>
                    void handleUpdatePromotion({
                      stage: "em_aprovacao",
                      promotedToCatalog: false,
                    })
                  }
                >
                  Recolher do Catálogo (Voltar p/ Labs)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Área Funcional ao Vivo do Módulo Incubado */}
      {activeId === "igreja_cantina" && (
        <CantinaWorkspace
          data={sandbox.cantina}
          roleMode={sandbox.roleMode}
          isSandbox
          onChange={(cantina) => void onSaveSandbox({ ...sandbox, cantina })}
        />
      )}

      {activeId === "igreja_livraria" && (
        <LivrariaWorkspace
          data={sandbox.livraria}
          roleMode={sandbox.roleMode}
          isSandbox
          onChange={(livraria) => void onSaveSandbox({ ...sandbox, livraria })}
        />
      )}

      {activeId === "igreja_social" && (
        <SocialWorkspace
          data={sandbox.social}
          roleMode={sandbox.roleMode}
          isSandbox
          onChange={(social) => void onSaveSandbox({ ...sandbox, social })}
        />
      )}
    </div>
  );
};
