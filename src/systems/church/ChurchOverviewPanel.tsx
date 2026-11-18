import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  HandHeart,
  Landmark,
  Sparkles,
  UserCheck,
  UtensilsCrossed,
} from "lucide-react";
import { ChurchModuleId, PlatformContract } from "@/platform/types";
import { getModuleById } from "@/platform/catalog";

interface ChurchOverviewPanelProps {
  contract: PlatformContract;
  enabledModules: ChurchModuleId[];
  onOpenArea: (area: ChurchModuleId) => void;
}

const AREA_META: Record<
  ChurchModuleId,
  {
    icon: React.ReactNode;
    accent: string;
    summary: string;
    highlights: string[];
  }
> = {
  igreja_ebd: {
    icon: <BookOpen className="h-6 w-6 text-blue-600" />,
    accent: "border-blue-200 bg-blue-50/40",
    summary: "Chamada dominical, classes, alunos, professores, hinos e relatórios.",
    highlights: ["Formulário de Aula", "Painel Administrativo", "Área do Professor"],
  },
  igreja_tesouraria: {
    icon: <Landmark className="h-6 w-6 text-emerald-600" />,
    accent: "border-emerald-200 bg-emerald-50/40",
    summary: "Dízimos, ofertas, entradas e saídas por congregação e balancete.",
    highlights: ["Lançamentos", "Entradas & Dízimos", "Controle de Caixa"],
  },
  igreja_secretaria: {
    icon: <Building2 className="h-6 w-6 text-amber-600" />,
    accent: "border-amber-200 bg-amber-50/40",
    summary: "Cadastro de igrejas/congregações, rol de membros, cartas e agenda pastoral.",
    highlights: ["Cadastro de Igrejas", "Rol de Membros", "Documentos & Agenda"],
  },
  igreja_cantina: {
    icon: <UtensilsCrossed className="h-6 w-6 text-rose-600" />,
    accent: "border-rose-200 bg-rose-50/40",
    summary: "Produção inicial do culto/evento, PDV balcão rápido e fechamento com sobras.",
    highlights: ["Produção do Dia", "PDV PIX/Dinheiro/Cartão", "Fechamento Automático"],
  },
  igreja_livraria: {
    icon: <BookOpen className="h-6 w-6 text-indigo-600" />,
    accent: "border-indigo-200 bg-indigo-50/40",
    summary: "Revistas EBD por trimestre/faixa, bíblias/livros e camisetas de congressos.",
    highlights: ["Revistas EBD", "Alertas de Estoque Mínimo", "Lucro Líquido"],
  },
  igreja_social: {
    icon: <HandHeart className="h-6 w-6 text-teal-600" />,
    accent: "border-teal-200 bg-teal-50/40",
    summary: "Arrecadações por campanha, montagem de cestas e entregas sem duplicidade mensal.",
    highlights: ["Despensa & Primícias", "Montagem de Cestas", "Famílias Assistidas"],
  },
  igreja_membro: {
    icon: <UserCheck className="h-6 w-6 text-cyan-600" />,
    accent: "border-cyan-200 bg-cyan-50/40",
    summary: "Portal self-service do membro: ficha, classe da EBD, linha do tempo de dízimos e recibo digital.",
    highlights: ["Carteirinha + EBD", "Leitor de PIX", "Recibo Sob Demanda"],
  },
};

/**
 * Tela Inicial (Painel Geral) do cliente quando a igreja possui áreas contratadas.
 * Mostra apenas os módulos habilitados no contrato deste cliente.
 */
export const ChurchOverviewPanel = ({
  contract,
  enabledModules,
  onOpenArea,
}: ChurchOverviewPanelProps) => {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Boas-vindas */}
      <div className="bg-white rounded-xl border p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Painel Geral da Igreja
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bem-vindo ao ambiente de {contract.clientName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Escolha abaixo a área que deseja gerenciar ou utilize o botão <strong>Áreas</strong> no canto superior direito para alternar rapidamente.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-50 border rounded-lg px-3 py-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span>
            {enabledModules.length} área(s) liberada(s) no seu plano
          </span>
        </div>
      </div>

      {/* Cards de Navegação entre Áreas */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Áreas Disponíveis no Seu Acesso
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {enabledModules.map((modId) => {
            const mod = getModuleById(modId);
            const meta = AREA_META[modId];
            return (
              <Card
                key={modId}
                className={`hover:shadow-md transition-all cursor-pointer border ${meta.accent}`}
                onClick={() => onOpenArea(modId)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="h-11 w-11 rounded-lg bg-white border flex items-center justify-center shadow-sm">
                      {meta.icon}
                    </div>
                    <Badge variant={mod?.maturity === "producao" ? "default" : "secondary"}>
                      {mod?.maturity === "producao" ? "Sistema Ativo" : "Módulo Ativo"}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg pt-2">{mod?.name ?? modId}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    {meta.summary}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    {meta.highlights.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" onClick={() => onOpenArea(modId)}>
                    Acessar {mod?.shortName} <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
