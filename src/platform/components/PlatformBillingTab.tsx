import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Landmark,
  Link2,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  ContractInvoice,
  InvoicePaymentMethod,
  PlatformBillingConfig,
  PlatformContract,
} from "@/platform/types";
import {
  buildDueDateForCompetence,
  computeInvoiceState,
  currentCompetence,
  EffectiveInvoiceStatus,
  formatBRL,
  formatCompetenceLabel,
  getContractDelinquencySummary,
  INVOICE_PROVIDER_LABELS,
  PREFERRED_PROVIDER_LABELS,
  roundCurrency,
  todayIsoDate,
} from "@/platform/saasDefaults";
import { useToast } from "@/hooks/use-toast";

interface PlatformBillingTabProps {
  contracts: PlatformContract[];
  billingConfig: PlatformBillingConfig;
  selectedContractFilter: string;
  onChangeContractFilter: (val: string) => void;
  onAddInvoice: (
    contractId: string,
    input: Omit<ContractInvoice, "id" | "createdAt">
  ) => Promise<ContractInvoice>;
  onUpdateInvoice: (
    contractId: string,
    invoiceId: string,
    patch: Partial<ContractInvoice>,
    activitySummary?: string
  ) => Promise<void>;
  onDeleteInvoice: (contractId: string, invoiceId: string) => Promise<void>;
  onGenerateCompetenceInvoices: (
    competence: string,
    provider: InvoicePaymentMethod
  ) => Promise<{ createdCount: number; skippedCount: number }>;
  onUpdateContract: (
    contractId: string,
    patch: Partial<PlatformContract>
  ) => Promise<void>;
  onSaveBillingConfig: (config: PlatformBillingConfig) => Promise<void>;
}

const INVOICE_STATUS_UI: Record<
  EffectiveInvoiceStatus,
  { label: string; className: string }
> = {
  pago: {
    label: "Pago",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
  },
  em_atraso: {
    label: "Em atraso",
    className: "bg-destructive/15 text-destructive border-destructive/40",
  },
  a_vencer: {
    label: "A vencer",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  },
  em_aberto: {
    label: "Em aberto",
    className: "bg-primary/15 text-primary border-primary/40",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export const PlatformBillingTab = ({
  contracts,
  billingConfig,
  selectedContractFilter,
  onChangeContractFilter,
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onGenerateCompetenceInvoices,
  onUpdateContract,
  onSaveBillingConfig,
}: PlatformBillingTabProps) => {
  const { toast } = useToast();
  const today = todayIsoDate();
  const [competenceFilter, setCompetenceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | EffectiveInvoiceStatus>("all");
  const [batchCompetence, setBatchCompetence] = useState<string>(currentCompetence());
  const [batchProvider, setBatchProvider] = useState<InvoicePaymentMethod>(
    billingConfig.preferredProvider === "asaas"
      ? "asaas"
      : billingConfig.preferredProvider === "cora"
      ? "cora"
      : "nubank_boleto"
  );
  const [batchBusy, setBatchBusy] = useState(false);

  // Dialog: New Invoice
  const [newOpen, setNewOpen] = useState(false);
  const [newContractId, setNewContractId] = useState<string>("");
  const [newCompetence, setNewCompetence] = useState<string>(currentCompetence());
  const [newDueDate, setNewDueDate] = useState<string>(() =>
    buildDueDateForCompetence(currentCompetence(), 10)
  );
  const [newAmount, setNewAmount] = useState<string>("");
  const [newProvider, setNewProvider] = useState<InvoicePaymentMethod>("nubank_boleto");
  const [newPaymentUrl, setNewPaymentUrl] = useState("");
  const [newPaymentCode, setNewPaymentCode] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newSaving, setNewSaving] = useState(false);

  // Dialog: Register Payment
  const [payTarget, setPayTarget] = useState<{
    contract: PlatformContract;
    invoice: ContractInvoice;
  } | null>(null);
  const [paidAt, setPaidAt] = useState(today);
  const [paidAmount, setPaidAmount] = useState("");
  const [paidMethod, setPaidMethod] = useState("PIX");
  const [paySaving, setPaySaving] = useState(false);

  // Dialog: Edit Link / Linha digitável / PIX Copia e Cola
  const [linkTarget, setLinkTarget] = useState<{
    contract: PlatformContract;
    invoice: ContractInvoice;
  } | null>(null);
  const [editPaymentUrl, setEditPaymentUrl] = useState("");
  const [editPaymentCode, setEditPaymentCode] = useState("");
  const [editProvider, setEditProvider] = useState<InvoicePaymentMethod>("nubank_boleto");
  const [editNotes, setEditNotes] = useState("");
  const [linkSaving, setLinkSaving] = useState(false);

  // Billing Config form
  const [cfgDraft, setCfgDraft] = useState<PlatformBillingConfig>(billingConfig);
  const [cfgSaving, setCfgSaving] = useState(false);

  useEffect(() => {
    setCfgDraft(billingConfig);
  }, [billingConfig]);

  const flatInvoices = useMemo(() => {
    const rows: Array<{
      contract: PlatformContract;
      invoice: ContractInvoice;
      computed: ReturnType<typeof computeInvoiceState>;
    }> = [];
    for (const contract of contracts) {
      for (const invoice of contract.invoices ?? []) {
        rows.push({
          contract,
          invoice,
          computed: computeInvoiceState(invoice, today),
        });
      }
    }
    return rows.sort((a, b) => b.invoice.dueDate.localeCompare(a.invoice.dueDate));
  }, [contracts, today]);

  const filteredInvoices = useMemo(() => {
    return flatInvoices.filter(({ contract, invoice, computed }) => {
      if (selectedContractFilter !== "all" && contract.id !== selectedContractFilter) {
        return false;
      }
      if (competenceFilter !== "all" && invoice.competence !== competenceFilter) {
        return false;
      }
      if (statusFilter !== "all" && computed.effectiveStatus !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [flatInvoices, selectedContractFilter, competenceFilter, statusFilter]);

  const competences = useMemo(() => {
    const set = new Set<string>([currentCompetence()]);
    flatInvoices.forEach((r) => {
      if (r.invoice.competence) set.add(r.invoice.competence);
    });
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [flatInvoices]);

  const summaryMetrics = useMemo(() => {
    const activeContracts = contracts.filter((c) => c.status === "ativo");
    const mrrActive = roundCurrency(
      activeContracts.reduce((sum, c) => sum + (Number(c.monthlyValue) || 0), 0)
    );
    let paidTotal = 0;
    let overdueTotal = 0;
    let openTotal = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;

    for (const row of flatInvoices) {
      const { effectiveStatus } = row.computed;
      if (effectiveStatus === "pago") {
        paidTotal = roundCurrency(paidTotal + (row.invoice.paidAmount ?? row.invoice.amount));
      } else if (effectiveStatus === "em_atraso") {
        overdueCount += 1;
        overdueTotal = roundCurrency(overdueTotal + row.invoice.amount);
        openTotal = roundCurrency(openTotal + row.invoice.amount);
      } else if (effectiveStatus === "a_vencer") {
        dueSoonCount += 1;
        openTotal = roundCurrency(openTotal + row.invoice.amount);
      } else if (effectiveStatus === "em_aberto") {
        openTotal = roundCurrency(openTotal + row.invoice.amount);
      }
    }

    const contractHealth = contracts.map((c) => ({
      contract: c,
      delinquency: getContractDelinquencySummary(c, today, billingConfig.gracePeriodDays),
    }));
    const delinquentContracts = contractHealth.filter(
      (h) => h.delinquency.status === "inadimplente"
    );
    const suspensionSuggestions = contractHealth.filter(
      (h) => h.delinquency.shouldSuggestSuspension
    );
    const totalReceivable = roundCurrency(paidTotal + openTotal);
    const delinquencyPct =
      totalReceivable > 0 ? Math.round((overdueTotal / totalReceivable) * 1000) / 10 : 0;

    return {
      mrrActive,
      paidTotal,
      overdueTotal,
      openTotal,
      dueSoonCount,
      overdueCount,
      delinquencyPct,
      delinquentContractsCount: delinquentContracts.length,
      suspensionSuggestions,
      contractHealth,
    };
  }, [contracts, flatInvoices, today, billingConfig.gracePeriodDays]);

  const openNewInvoiceModal = (contractId?: string) => {
    const targetId =
      contractId ||
      (selectedContractFilter !== "all" ? selectedContractFilter : contracts[0]?.id ?? "");
    const target = contracts.find((c) => c.id === targetId);
    const comp = currentCompetence();
    setNewContractId(targetId);
    setNewCompetence(comp);
    setNewDueDate(buildDueDateForCompetence(comp, target?.billingDueDay ?? 10));
    setNewAmount(target?.monthlyValue ? String(target.monthlyValue.toFixed(2)) : "");
    setNewProvider(batchProvider);
    setNewPaymentUrl("");
    setNewPaymentCode("");
    setNewNotes("");
    setNewOpen(true);
  };

  const handleContractSelectInNew = (cid: string) => {
    setNewContractId(cid);
    const target = contracts.find((c) => c.id === cid);
    if (target) {
      setNewDueDate(buildDueDateForCompetence(newCompetence, target.billingDueDay ?? 10));
      if (typeof target.monthlyValue === "number") {
        setNewAmount(target.monthlyValue.toFixed(2));
      }
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContractId || !newAmount) return;
    const parsedAmount = parseFloat(newAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({ variant: "destructive", title: "Informe um valor válido maior que zero" });
      return;
    }
    setNewSaving(true);
    try {
      await onAddInvoice(newContractId, {
        competence: newCompetence,
        dueDate: newDueDate,
        amount: parsedAmount,
        status: "pendente",
        provider: newProvider,
        paymentUrl: newPaymentUrl.trim() || undefined,
        paymentCode: newPaymentCode.trim() || undefined,
        notes: newNotes.trim() || undefined,
      });
      toast({ title: "Cobrança emitida e salva no contrato!" });
      setNewOpen(false);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao emitir cobrança",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setNewSaving(false);
    }
  };

  const handleGenerateBatch = async () => {
    setBatchBusy(true);
    try {
      const res = await onGenerateCompetenceInvoices(batchCompetence, batchProvider);
      toast({
        title: `Lote ${formatCompetenceLabel(batchCompetence)} processado`,
        description: `${res.createdCount} cobrança(s) gerada(s) • ${res.skippedCount} contrato(s) já possuíam fatura nesta competência.`,
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Falha na geração em lote",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setBatchBusy(false);
    }
  };

  const openPayDialog = (contract: PlatformContract, invoice: ContractInvoice) => {
    setPayTarget({ contract, invoice });
    setPaidAt(today);
    setPaidAmount(invoice.amount.toFixed(2));
    setPaidMethod("PIX");
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    setPaySaving(true);
    try {
      const amountNum = parseFloat(paidAmount) || payTarget.invoice.amount;
      await onUpdateInvoice(
        payTarget.contract.id,
        payTarget.invoice.id,
        {
          status: "pago",
          paidAt,
          paidAmount: amountNum,
          paidMethod,
        },
        `Pagamento registrado: ${formatCompetenceLabel(payTarget.invoice.competence)} (${formatBRL(
          amountNum
        )} via ${paidMethod})`
      );
      if (payTarget.contract.status === "suspenso") {
        await onUpdateContract(payTarget.contract.id, {
          status: "ativo",
          contractLegalStatus: "ativo",
        });
        toast({
          title: "Pagamento confirmado e contrato reativado!",
          description: `${payTarget.contract.code} voltou ao status Ativo.`,
        });
      } else {
        toast({ title: "Pagamento registrado com sucesso!" });
      }
      setPayTarget(null);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Não foi possível dar baixa",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setPaySaving(false);
    }
  };

  const openLinkDialog = (contract: PlatformContract, invoice: ContractInvoice) => {
    setLinkTarget({ contract, invoice });
    setEditProvider(invoice.provider);
    setEditPaymentUrl(invoice.paymentUrl ?? "");
    setEditPaymentCode(invoice.paymentCode ?? "");
    setEditNotes(invoice.notes ?? "");
  };

  const handleSaveLinkDialog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTarget) return;
    setLinkSaving(true);
    try {
      await onUpdateInvoice(
        linkTarget.contract.id,
        linkTarget.invoice.id,
        {
          provider: editProvider,
          paymentUrl: editPaymentUrl.trim() || undefined,
          paymentCode: editPaymentCode.trim() || undefined,
          notes: editNotes.trim() || undefined,
        },
        `Dados de boleto/PIX atualizados para ${formatCompetenceLabel(linkTarget.invoice.competence)}`
      );
      toast({ title: "Dados de pagamento atualizados!" });
      setLinkTarget(null);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar boleto/PIX",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setLinkSaving(false);
    }
  };

  const copyReminderText = async (
    contract: PlatformContract,
    invoice: ContractInvoice
  ) => {
    const dueBr = invoice.dueDate.split("-").reverse().join("/");
    const lines = [
      `Olá${contract.responsibleName ? `, ${contract.responsibleName}` : ""}! Tudo bem?`,
      `Segue o demonstrativo da mensalidade SynapSys (${contract.code} - ${contract.clientName}):`,
      `• Referência: ${formatCompetenceLabel(invoice.competence)}`,
      `• Vencimento: ${dueBr}`,
      `• Valor: ${formatBRL(invoice.amount)}`,
      invoice.paymentUrl ? `• Link do boleto/fatura: ${invoice.paymentUrl}` : "",
      invoice.paymentCode ? `• PIX Copia e Cola / Linha digitável: ${invoice.paymentCode}` : "",
      !invoice.paymentCode && billingConfig.pixKey
        ? `• Chave PIX (${billingConfig.beneficiaryName || "SynapSys"}): ${billingConfig.pixKey}`
        : "",
      billingConfig.paymentInstructions ? `\n${billingConfig.paymentInstructions}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(lines);
      toast({ title: "Mensagem de cobrança copiada para WhatsApp/E-mail!" });
    } catch {
      toast({ variant: "destructive", title: "Não foi possível copiar o texto" });
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setCfgSaving(true);
    try {
      await onSaveBillingConfig(cfgDraft);
      toast({ title: "Configurações financeiras salvas no Supabase!" });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar configuração",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setCfgSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="platform-metric">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>MRR (Contratos Ativos)</span>
              <Banknote className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl">{formatBRL(summaryMetrics.mrrActive)}</CardTitle>
            <p className="text-xs text-muted-foreground">
              Recorrência mensal dos contratos em operação
            </p>
          </CardHeader>
        </Card>

        <Card className="platform-metric">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Recebido Confirmado</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </CardDescription>
            <CardTitle className="text-2xl text-emerald-400">
              {formatBRL(summaryMetrics.paidTotal)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Baixas registradas em carteira
            </p>
          </CardHeader>
        </Card>

        <Card className="platform-metric">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Em Aberto / A Vencer</span>
              <CalendarClock className="h-4 w-4 text-amber-400" />
            </CardDescription>
            <CardTitle className="text-2xl">{formatBRL(summaryMetrics.openTotal)}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {summaryMetrics.dueSoonCount} fatura(s) vencem nos próximos 5 dias
            </p>
          </CardHeader>
        </Card>

        <Card className="platform-metric">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Inadimplência</span>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardDescription>
            <CardTitle
              className={`text-2xl ${
                summaryMetrics.overdueTotal > 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {formatBRL(summaryMetrics.overdueTotal)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {summaryMetrics.overdueCount} fatura(s) vencida(s) • {summaryMetrics.delinquencyPct}%
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Régua de Alertas / Carência */}
      {summaryMetrics.suspensionSuggestions.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" />
              Atenção: {summaryMetrics.suspensionSuggestions.length} contrato(s) ultrapassaram{" "}
              {billingConfig.gracePeriodDays} dias de atraso
            </CardTitle>
            <CardDescription>
              Você pode enviar um lembrete ou suspender o acesso temporariamente até a regularização.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {summaryMetrics.suspensionSuggestions.map(({ contract, delinquency }) => (
              <div
                key={contract.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-card p-3 text-xs"
              >
                <div>
                  <span className="font-mono font-semibold mr-2">{contract.code}</span>
                  <strong>{contract.clientName}</strong>
                  <span className="text-muted-foreground ml-2">
                    • {delinquency.overdueCount} vencida(s) ({formatBRL(delinquency.overdueAmount)} • há{" "}
                    {delinquency.maxDaysOverdue} dias)
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    await onUpdateContract(contract.id, {
                      status: "suspenso",
                      contractLegalStatus: "suspenso_atraso",
                    });
                    toast({
                      title: `${contract.code} suspenso por inadimplência`,
                      description: "O acesso dos usuários desse contrato foi bloqueado na entrada.",
                    });
                  }}
                >
                  Suspender acesso agora
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Emissão em lote & ações */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Emissão de Cobranças & Mensalidades
              </CardTitle>
              <CardDescription>
                Gere mensalidades em lote para contratos ativos ou cadastre boletos/PIX avulsos (Asaas, Cora ou Nubank).
              </CardDescription>
            </div>
            <Button onClick={() => openNewInvoiceModal()}>
              <Plus className="h-4 w-4 mr-1.5" /> Nova Cobrança
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3.5 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Competência (Mês)</Label>
              <Input
                type="month"
                value={batchCompetence}
                onChange={(e) => setBatchCompetence(e.target.value)}
                className="w-44 h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Banco / Provedor padrão do lote</Label>
              <Select
                value={batchProvider}
                onValueChange={(v) => setBatchProvider(v as InvoicePaymentMethod)}
              >
                <SelectTrigger className="w-56 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INVOICE_PROVIDER_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={batchBusy}
              onClick={handleGenerateBatch}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${batchBusy ? "animate-spin" : ""}`} />
              Gerar mensalidades de {formatCompetenceLabel(batchCompetence)}
            </Button>
          </div>

          {/* Filtros de Faturas */}
          <div className="flex flex-wrap gap-3 items-center pt-1">
            <Select value={selectedContractFilter} onValueChange={onChangeContractFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os contratos ({contracts.length})</SelectItem>
                {contracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.clientName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={competenceFilter} onValueChange={setCompetenceFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Competência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas competências</SelectItem>
                {competences.map((comp) => (
                  <SelectItem key={comp} value={comp}>
                    {formatCompetenceLabel(comp)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as "all" | EffectiveInvoiceStatus)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas situações</SelectItem>
                <SelectItem value="em_atraso">Em atraso</SelectItem>
                <SelectItem value="a_vencer">A vencer (5 dias)</SelectItem>
                <SelectItem value="em_aberto">Em aberto</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de cobranças */}
          {filteredInvoices.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground space-y-2">
              <p>Nenhuma cobrança encontrada para os filtros selecionados.</p>
              <p className="text-xs">
                Use <strong>Nova Cobrança</strong> ou clique em{" "}
                <strong>Gerar mensalidades</strong> para iniciar o controle financeiro deste mês.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredInvoices.map(({ contract, invoice, computed }) => {
                const statusMeta = INVOICE_STATUS_UI[computed.effectiveStatus];
                const dueBr = invoice.dueDate.split("-").reverse().join("/");
                return (
                  <div
                    key={`${contract.id}-${invoice.id}`}
                    className="rounded-lg border bg-card p-3.5 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-[240px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {contract.code}
                        </Badge>
                        <span className="font-semibold text-sm">{contract.clientName}</span>
                        <Badge className={`border text-[11px] ${statusMeta.className}`} variant="outline">
                          {statusMeta.label}
                          {computed.effectiveStatus === "em_atraso"
                            ? ` (+${computed.daysOverdue}d)`
                            : computed.effectiveStatus === "a_vencer"
                            ? computed.daysUntilDue === 0
                              ? " (vence hoje)"
                              : ` (${computed.daysUntilDue}d)`
                            : ""}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {INVOICE_PROVIDER_LABELS[invoice.provider] ?? invoice.provider}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                        <span>
                          Competência: <strong>{formatCompetenceLabel(invoice.competence)}</strong>
                        </span>
                        <span>
                          Vencimento: <strong>{dueBr}</strong>
                        </span>
                        <span>
                          Valor: <strong className="text-foreground">{formatBRL(invoice.amount)}</strong>
                        </span>
                        {invoice.status === "pago" && invoice.paidAt && (
                          <span className="text-emerald-400">
                            Pago em {invoice.paidAt.split("-").reverse().join("/")} ({invoice.paidMethod || "PIX"})
                          </span>
                        )}
                      </div>
                      {(invoice.paymentCode || invoice.paymentUrl || invoice.notes) && (
                        <div className="text-[11px] text-muted-foreground flex flex-wrap gap-2 pt-0.5">
                          {invoice.paymentCode && (
                            <code className="bg-muted px-1.5 py-0.5 rounded max-w-xs truncate">
                              {invoice.paymentCode}
                            </code>
                          )}
                          {invoice.paymentUrl && (
                            <a
                              href={invoice.paymentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" /> Link da cobrança
                            </a>
                          )}
                          {invoice.notes && <span>Obs.: {invoice.notes}</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {invoice.status !== "pago" && (
                        <Button
                          size="sm"
                          onClick={() => openPayDialog(contract, invoice)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Registrar Pagamento
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openLinkDialog(contract, invoice)}
                        title="Anexar link do boleto ou código PIX Copia e Cola"
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1" /> Boleto/PIX
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyReminderText(contract, invoice)}
                        title="Copiar mensagem de cobrança com vencimento e PIX/boleto"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" /> Cobrança
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="Remover cobrança"
                        onClick={async () => {
                          if (confirm("Remover esta cobrança do histórico do contrato?")) {
                            await onDeleteInvoice(contract.id, invoice.id);
                            toast({ title: "Cobrança removida" });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visão de Adimplência por Contrato */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Adimplência por Contrato
          </CardTitle>
          <CardDescription>
            Acompanhamento consolidado por cliente para controle rápido de bloqueio e reativação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {summaryMetrics.contractHealth.map(({ contract, delinquency }) => (
            <div
              key={contract.id}
              className="rounded-lg border p-3 flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {contract.code}
                  </Badge>
                  <span className="font-medium">{contract.clientName}</span>
                  <Badge variant={contract.status === "suspenso" ? "destructive" : "secondary"}>
                    {contract.status}
                  </Badge>
                  {delinquency.status === "inadimplente" && (
                    <Badge variant="destructive">
                      Inadimplente ({delinquency.overdueCount} • {delinquency.maxDaysOverdue}d)
                    </Badge>
                  )}
                  {delinquency.status === "adimplente" && (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                      Em dia
                    </Badge>
                  )}
                  {delinquency.status === "a_vencer" && (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                      A vencer ({delinquency.dueSoonCount})
                    </Badge>
                  )}
                  {delinquency.status === "sem_cobranca" && (
                    <Badge variant="outline">Sem faturas</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Mensalidade: {formatBRL(contract.monthlyValue ?? 0)} • Venc. dia{" "}
                  {contract.billingDueDay ?? 10} • Unidades: {contract.unitsCount ?? 1} • Em aberto:{" "}
                  {formatBRL(delinquency.openAmount)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openNewInvoiceModal(contract.id)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Emitir fatura
                </Button>
                {contract.status === "suspenso" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await onUpdateContract(contract.id, {
                        status: "ativo",
                        contractLegalStatus: "ativo",
                      });
                      toast({ title: `${contract.code} reativado!` });
                    }}
                  >
                    Reativar
                  </Button>
                ) : (
                  delinquency.status === "inadimplente" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        await onUpdateContract(contract.id, {
                          status: "suspenso",
                          contractLegalStatus: "suspenso_atraso",
                        });
                        toast({ title: `${contract.code} suspenso por inadimplência` });
                      }}
                    >
                      Suspender
                    </Button>
                  )
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Configurações Financeiras & Integrações Asaas / Cora / Nubank */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />
            Régua de Cobrança & Integração Bancária (Asaas / Cora / Nubank)
          </CardTitle>
          <CardDescription>
            Defina sua chave PIX, carência de inadimplência e provedor principal. Na Fase 2, chaves de API do Asaas/Cora serão conectadas com segurança via Supabase Edge Functions (Webhooks automáticos).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Provedor Preferencial</Label>
                <Select
                  value={cfgDraft.preferredProvider}
                  onValueChange={(v) =>
                    setCfgDraft((c) => ({
                      ...c,
                      preferredProvider: v as PlatformBillingConfig["preferredProvider"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PREFERRED_PROVIDER_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Dias de carência para alerta/bloqueio</Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={cfgDraft.gracePeriodDays}
                  onChange={(e) =>
                    setCfgDraft((c) => ({
                      ...c,
                      gracePeriodDays: Math.max(1, Math.floor(Number(e.target.value) || 15)),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Chave PIX Padrão (para lembretes)</Label>
                <Input
                  placeholder="CNPJ, e-mail ou chave aleatória"
                  value={cfgDraft.pixKey ?? ""}
                  onChange={(e) => setCfgDraft((c) => ({ ...c, pixKey: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Nome do Recebedor / Contratada</Label>
                <Input
                  value={cfgDraft.beneficiaryName ?? ""}
                  onChange={(e) =>
                    setCfgDraft((c) => ({ ...c, beneficiaryName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Contato de Suporte Financeiro</Label>
                <Input
                  placeholder="WhatsApp ou e-mail"
                  value={cfgDraft.supportContact ?? ""}
                  onChange={(e) =>
                    setCfgDraft((c) => ({ ...c, supportContact: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1 flex items-end">
                <Button type="submit" disabled={cfgSaving} className="w-full">
                  {cfgSaving ? "Salvando..." : "Salvar Configurações Financeiras"}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Texto padrão incluído no resumo de cobrança</Label>
              <Textarea
                rows={2}
                value={cfgDraft.paymentInstructions ?? ""}
                onChange={(e) =>
                  setCfgDraft((c) => ({ ...c, paymentInstructions: e.target.value }))
                }
              />
            </div>
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs text-muted-foreground flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Dica operacional:</strong> Enquanto não ativa o webhook automático da API do{" "}
                <strong>Asaas</strong> ou <strong>Banco Cora</strong>, emita o boleto de depósito/PIX no{" "}
                <strong>Nubank / Cora / Asaas</strong>, cole o código ou link no botão{" "}
                <strong>Boleto/PIX</strong> da fatura e dê baixa em 1 clique quando compensar.
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Dialog: Nova Cobrança */}
      <Dialog open={newOpen} onOpenChange={(v) => !newSaving && setNewOpen(v)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Emitir Nova Cobrança</DialogTitle>
            <DialogDescription>
              Registre a mensalidade do contrato com boleto/PIX manual ou referência bancária.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateInvoice} className="space-y-3.5">
            <div className="space-y-1">
              <Label>Contrato *</Label>
              <Select value={newContractId} onValueChange={handleContractSelectInNew}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o contrato" />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Competência *</Label>
                <Input
                  type="month"
                  value={newCompetence}
                  onChange={(e) => {
                    const comp = e.target.value;
                    setNewCompetence(comp);
                    const ctr = contracts.find((c) => c.id === newContractId);
                    setNewDueDate(buildDueDateForCompetence(comp, ctr?.billingDueDay ?? 10));
                  }}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Vencimento *</Label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Banco / Meio de Emissão</Label>
              <Select
                value={newProvider}
                onValueChange={(v) => setNewProvider(v as InvoicePaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INVOICE_PROVIDER_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Link do Boleto / Fatura (opcional)</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={newPaymentUrl}
                onChange={(e) => setNewPaymentUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Linha Digitável ou PIX Copia e Cola (opcional)</Label>
              <Textarea
                rows={2}
                placeholder="Cole o código do boleto Nubank/Cora ou PIX Copia e Cola"
                value={newPaymentCode}
                onChange={(e) => setNewPaymentCode(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Observações internas</Label>
              <Input
                placeholder="Ex.: Referente à ampliação para 15 igrejas"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={newSaving}>
                {newSaving ? "Salvando..." : "Emitir Cobrança"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Registrar Pagamento (Baixa Manual) */}
      <Dialog open={Boolean(payTarget)} onOpenChange={(v) => !v && !paySaving && setPayTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              {payTarget
                ? `${payTarget.contract.code} — ${payTarget.contract.clientName} (${formatCompetenceLabel(
                    payTarget.invoice.competence
                  )})`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmPayment} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data do pagamento *</Label>
                <Input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Valor recebido (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Forma recebida</Label>
              <Select value={paidMethod} onValueChange={setPaidMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Boleto Bancário">Boleto Bancário</SelectItem>
                  <SelectItem value="Asaas">Asaas</SelectItem>
                  <SelectItem value="Banco Cora">Banco Cora</SelectItem>
                  <SelectItem value="Nubank Depósito">Nubank Depósito</SelectItem>
                  <SelectItem value="Cartão / Transferência">Cartão / Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayTarget(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={paySaving}>
                {paySaving ? "Confirmando..." : "Confirmar Baixa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Anexar / Editar Link ou Código Boleto/PIX */}
      <Dialog open={Boolean(linkTarget)} onOpenChange={(v) => !v && !linkSaving && setLinkTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Boleto / PIX Copia e Cola</DialogTitle>
            <DialogDescription>
              Anexe o código ou link gerado no Nubank, Cora ou Asaas para acompanhar e enviar ao cliente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveLinkDialog} className="space-y-3.5">
            <div className="space-y-1">
              <Label>Provedor</Label>
              <Select
                value={editProvider}
                onValueChange={(v) => setEditProvider(v as InvoicePaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INVOICE_PROVIDER_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Link do Boleto / Cobrança</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={editPaymentUrl}
                onChange={(e) => setEditPaymentUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Linha Digitável / PIX Copia e Cola</Label>
              <Textarea
                rows={3}
                value={editPaymentCode}
                onChange={(e) => setEditPaymentCode(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLinkTarget(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={linkSaving}>
                {linkSaving ? "Salvando..." : "Salvar Dados"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
