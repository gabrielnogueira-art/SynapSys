import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDown,
  ArrowUp,
  Calculator,
  Check,
  Church,
  Copy,
  FileSignature,
  FileText,
  History,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Scale,
  Store,
  Trash2,
} from "lucide-react";
import {
  ContractClauseTemplate,
  ContractLegalStatus,
  PlatformBillingConfig,
  PlatformContract,
  PricingTier,
  ProjectSegment,
} from "@/platform/types";
import {
  buildPrintableContractHtml,
  calculateTieredPrice,
  CONTRACT_LEGAL_STATUS_META,
  CONTRACT_TEMPLATE_TAGS,
  DEFAULT_CONTRACT_CLAUSES,
  DEFAULT_PRICING_TIERS,
  formatBRL,
  renderClauseTemplate,
} from "@/platform/saasDefaults";
import { useToast } from "@/hooks/use-toast";

interface PlatformPlansAndClausesTabProps {
  contracts: PlatformContract[];
  pricingTiers: PricingTier[];
  clauseTemplates: ContractClauseTemplate[];
  billingConfig: PlatformBillingConfig;
  selectedContractId: string;
  onSelectContractId: (id: string) => void;
  activeSubSection?: "plans" | "clauses";
  onChangeSubSection?: (next: "plans" | "clauses") => void;
  onSavePricingTiers: (tiers: PricingTier[]) => Promise<void>;
  onSaveClauseTemplates: (clauses: ContractClauseTemplate[]) => Promise<void>;
  onSaveBillingConfig: (config: PlatformBillingConfig) => Promise<void>;
  onUpdateContract: (contractId: string, patch: Partial<PlatformContract>) => Promise<void>;
}

export const PlatformPlansAndClausesTab = ({
  contracts,
  pricingTiers,
  clauseTemplates,
  billingConfig,
  selectedContractId,
  onSelectContractId,
  activeSubSection,
  onChangeSubSection,
  onSavePricingTiers,
  onSaveClauseTemplates,
  onSaveBillingConfig,
  onUpdateContract,
}: PlatformPlansAndClausesTabProps) => {
  const { toast } = useToast();
  const [internalSection, setInternalSection] = useState<"plans" | "clauses">("plans");
  const section = activeSubSection ?? internalSection;
  const setSection = (next: "plans" | "clauses") => {
    setInternalSection(next);
    onChangeSubSection?.(next);
  };

  // Pricing tiers draft & simulator
  const [tiersDraft, setTiersDraft] = useState<PricingTier[]>(pricingTiers);
  const [tiersSaving, setTiersSaving] = useState(false);
  const [simSegment, setSimSegment] = useState<ProjectSegment>("igreja");
  const [simUnits, setSimUnits] = useState<string>("15");

  useEffect(() => {
    setTiersDraft(pricingTiers);
  }, [pricingTiers]);

  const effectiveContract = useMemo(
    () =>
      contracts.find((c) => c.id === selectedContractId) ?? contracts[0] ?? null,
    [contracts, selectedContractId]
  );

  // Legal draft for selected contract
  const [legalDraft, setLegalDraft] = useState<{
    legalName: string;
    documentNumber: string;
    address: string;
    unitsCount: string;
    billingDueDay: string;
    monthlyValue: string;
    contractStartDate: string;
    adjustmentIndex: string;
    contractLegalStatus: ContractLegalStatus;
    useCustomClauses: boolean;
  }>({
    legalName: "",
    documentNumber: "",
    address: "",
    unitsCount: "1",
    billingDueDay: "10",
    monthlyValue: "",
    contractStartDate: "",
    adjustmentIndex: "IPCA",
    contractLegalStatus: "em_elaboracao",
    useCustomClauses: false,
  });
  const [contractSaving, setContractSaving] = useState(false);

  // Contractor (SynapSys) identity draft
  const [contractorDraft, setContractorDraft] = useState({
    beneficiaryName: billingConfig.beneficiaryName ?? "SynapSys — Sistemas & Inteligência",
    contractorDocument: billingConfig.contractorDocument ?? "",
    contractorCity: billingConfig.contractorCity ?? "Rio de Janeiro - RJ",
  });
  const [contractorSaving, setContractorSaving] = useState(false);

  // Clauses draft (global or contract override)
  const [clausesDraft, setClausesDraft] = useState<ContractClauseTemplate[]>(clauseTemplates);
  const [activeClauseId, setActiveClauseId] = useState<string>(
    clauseTemplates[0]?.id ?? DEFAULT_CONTRACT_CLAUSES[0].id
  );
  const [clausesSaving, setClausesSaving] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  useEffect(() => {
    setContractorDraft({
      beneficiaryName: billingConfig.beneficiaryName ?? "SynapSys — Sistemas & Inteligência",
      contractorDocument: billingConfig.contractorDocument ?? "",
      contractorCity: billingConfig.contractorCity ?? "Rio de Janeiro - RJ",
    });
  }, [billingConfig]);

  useEffect(() => {
    if (!effectiveContract) return;
    const hasCustom =
      Array.isArray(effectiveContract.customClauses) &&
      effectiveContract.customClauses.length > 0;
    setLegalDraft({
      legalName: effectiveContract.legalName ?? effectiveContract.clientName,
      documentNumber: effectiveContract.documentNumber ?? "",
      address: effectiveContract.address ?? effectiveContract.city ?? "",
      unitsCount: String(effectiveContract.unitsCount ?? 1),
      billingDueDay: String(effectiveContract.billingDueDay ?? 10),
      monthlyValue:
        typeof effectiveContract.monthlyValue === "number"
          ? String(effectiveContract.monthlyValue)
          : "",
      contractStartDate: effectiveContract.contractStartDate ?? effectiveContract.createdAt,
      adjustmentIndex: effectiveContract.adjustmentIndex ?? "IPCA",
      contractLegalStatus:
        effectiveContract.contractLegalStatus ??
        (effectiveContract.status === "ativo" ? "ativo" : "em_elaboracao"),
      useCustomClauses: hasCustom,
    });
    const list = hasCustom ? effectiveContract.customClauses! : clauseTemplates;
    setClausesDraft(list);
    setActiveClauseId(list[0]?.id ?? "");
  }, [effectiveContract, clauseTemplates]);

  const simCalc = useMemo(() => {
    const qty = Math.max(1, Math.floor(Number(simUnits) || 1));
    return calculateTieredPrice(simSegment, qty, tiersDraft);
  }, [simSegment, simUnits, tiersDraft]);

  const updateTierField = (
    tierId: string,
    patch: Partial<PricingTier>
  ) => {
    setTiersDraft((prev) =>
      prev.map((t) => (t.id === tierId ? { ...t, ...patch } : t))
    );
  };

  const addTier = (segment: ProjectSegment) => {
    const segTiers = tiersDraft.filter((t) => t.segment === segment);
    const maxMin = segTiers.reduce((m, t) => Math.max(m, t.maxUnits ?? t.minUnits), 0);
    const nextMin = maxMin > 0 ? maxMin + 1 : 1;
    const newTier: PricingTier = {
      id: `${segment}-${Date.now()}`,
      segment,
      name: `Nova Faixa (${nextMin}+)`,
      minUnits: nextMin,
      maxUnits: null,
      unitPrice: segment === "igreja" ? 59.9 : 99.9,
      description: "Faixa personalizada por unidade individual.",
    };
    setTiersDraft((prev) => [...prev, newTier]);
  };

  const handleSaveTiers = async () => {
    setTiersSaving(true);
    try {
      await onSavePricingTiers(tiersDraft);
      toast({ title: "Tabela de planos e preços salva no Supabase!" });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar tabela",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setTiersSaving(false);
    }
  };

  const handleCopyProposal = async () => {
    const noun = simSegment === "igreja" ? "igreja(s)" : "unidade(s)";
    const text = [
      `Proposta SynapSys — ${simSegment === "igreja" ? "Igrejas & Ministérios" : "Comércio & Empresas"}`,
      `• Quantidade estimada: ${simCalc.units} ${noun}`,
      `• Faixa enquadrada: ${simCalc.tier.name}`,
      `• Valor unitário por ${simSegment === "igreja" ? "igreja" : "unidade"}: ${formatBRL(simCalc.unitPrice)}/mês`,
      `• Mensalidade total estimada: ${formatBRL(simCalc.totalMonthly)}/mês (${simCalc.ruleLabel})`,
      simCalc.totalSavingsVsBase > 0
        ? `• Economia progressiva por volume: ${formatBRL(simCalc.totalSavingsVsBase)}/mês`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Resumo da proposta copiado!" });
    } catch {
      toast({ variant: "destructive", title: "Não foi possível copiar" });
    }
  };

  // Virtual preview contract reflecting live edits in legalDraft
  const previewContract: PlatformContract | null = useMemo(() => {
    if (!effectiveContract) return null;
    const units = Math.max(1, Math.floor(Number(legalDraft.unitsCount) || 1));
    const parsedMonthly = parseFloat(legalDraft.monthlyValue);
    return {
      ...effectiveContract,
      legalName: legalDraft.legalName.trim() || effectiveContract.clientName,
      documentNumber: legalDraft.documentNumber.trim(),
      address: legalDraft.address.trim(),
      unitsCount: units,
      billingDueDay: Math.max(1, Math.min(28, Math.floor(Number(legalDraft.billingDueDay) || 10))),
      monthlyValue: Number.isFinite(parsedMonthly) ? parsedMonthly : effectiveContract.monthlyValue,
      contractStartDate: legalDraft.contractStartDate,
      adjustmentIndex: legalDraft.adjustmentIndex,
      contractLegalStatus: legalDraft.contractLegalStatus,
    };
  }, [effectiveContract, legalDraft]);

  const handleSaveContractLegal = async () => {
    if (!effectiveContract) return;
    setContractSaving(true);
    try {
      const units = Math.max(1, Math.floor(Number(legalDraft.unitsCount) || 1));
      const calc = calculateTieredPrice(effectiveContract.segment, units, tiersDraft);
      const monthly = parseFloat(legalDraft.monthlyValue);
      await onUpdateContract(effectiveContract.id, {
        legalName: legalDraft.legalName.trim() || undefined,
        documentNumber: legalDraft.documentNumber.trim() || undefined,
        address: legalDraft.address.trim() || undefined,
        unitsCount: units,
        billingDueDay: Math.max(1, Math.min(28, Math.floor(Number(legalDraft.billingDueDay) || 10))),
        monthlyValue: Number.isFinite(monthly) ? monthly : calc.totalMonthly,
        planName: `${calc.tier.name} (${calc.ruleLabel})`,
        contractStartDate: legalDraft.contractStartDate || undefined,
        adjustmentIndex: legalDraft.adjustmentIndex.trim() || "IPCA",
        contractLegalStatus: legalDraft.contractLegalStatus,
      });
      toast({ title: `Ficha contratual de ${effectiveContract.code} salva!` });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar dados contratuais",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setContractSaving(false);
    }
  };

  const handleSaveContractor = async () => {
    setContractorSaving(true);
    try {
      await onSaveBillingConfig({
        ...billingConfig,
        beneficiaryName: contractorDraft.beneficiaryName.trim(),
        contractorDocument: contractorDraft.contractorDocument.trim(),
        contractorCity: contractorDraft.contractorCity.trim(),
      });
      toast({ title: "Dados da Contratada (SynapSys) atualizados!" });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar dados da Contratada",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setContractorSaving(false);
    }
  };

  const handleSaveClauses = async () => {
    setClausesSaving(true);
    try {
      const normalized = clausesDraft.map((c, idx) => ({ ...c, order: idx + 1 }));
      if (legalDraft.useCustomClauses && effectiveContract) {
        await onUpdateContract(effectiveContract.id, {
          customClauses: normalized,
        });
        toast({ title: `Cláusulas exclusivas de ${effectiveContract.code} salvas!` });
      } else {
        await onSaveClauseTemplates(normalized);
        toast({ title: "Modelo global de cláusulas salvo no Supabase!" });
      }
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar cláusulas",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setClausesSaving(false);
    }
  };

  const handleToggleCustomClauses = async (enabled: boolean) => {
    setLegalDraft((prev) => ({ ...prev, useCustomClauses: enabled }));
    if (enabled) {
      setClausesDraft(
        clauseTemplates.map((c) => ({ ...c }))
      );
      return;
    }
    if (effectiveContract && effectiveContract.customClauses?.length) {
      await onUpdateContract(effectiveContract.id, { customClauses: undefined });
      toast({ title: "Contrato voltou a usar o modelo global padrão" });
    }
    setClausesDraft(clauseTemplates);
  };

  const insertTagIntoClause = (tag: string) => {
    setClausesDraft((prev) =>
      prev.map((c) =>
        c.id === activeClauseId
          ? { ...c, body: `${c.body}${c.body.endsWith(" ") || c.body === "" ? "" : " "}${tag}` }
          : c
      )
    );
  };

  const moveClause = (index: number, direction: -1 | 1) => {
    const nextIdx = index + direction;
    if (nextIdx < 0 || nextIdx >= clausesDraft.length) return;
    setClausesDraft((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIdx, 0, item);
      return copy.map((c, i) => ({ ...c, order: i + 1 }));
    });
  };

  const handlePrintContract = () => {
    if (!previewContract) return;
    const html = buildPrintableContractHtml(
      previewContract,
      clausesDraft,
      tiersDraft,
      {
        ...billingConfig,
        beneficiaryName: contractorDraft.beneficiaryName,
        contractorDocument: contractorDraft.contractorDocument,
        contractorCity: contractorDraft.contractorCity,
      }
    );
    const win = window.open("", "_blank", "width=900,height=700");
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
      return;
    }
    // Fallback with hidden iframe if browser blocks popups
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      toast({ variant: "destructive", title: "Não foi possível abrir a impressão" });
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1500);
    }, 300);
  };

  const handleCopyFullDraft = async () => {
    if (!previewContract) return;
    const mergedCfg = {
      ...billingConfig,
      beneficiaryName: contractorDraft.beneficiaryName,
      contractorDocument: contractorDraft.contractorDocument,
      contractorCity: contractorDraft.contractorCity,
    };
    const header = `CONTRATO DE LICENCIAMENTO DE SOFTWARE (SaaS) — ${previewContract.code}\nContratante: ${previewContract.legalName || previewContract.clientName}\n`;
    const body = [...clausesDraft]
      .sort((a, b) => a.order - b.order)
      .map(
        (c) =>
          `${renderClauseTemplate(c.title, previewContract, tiersDraft, mergedCfg)}\n${renderClauseTemplate(
            c.body,
            previewContract,
            tiersDraft,
            mergedCfg
          )}`
      )
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(`${header}\n${body}`);
      setCopiedDraft(true);
      toast({ title: "Texto completo da minuta copiado!" });
      setTimeout(() => setCopiedDraft(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Não foi possível copiar a minuta" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navegação interna */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={section === "plans" ? "default" : "outline"}
            onClick={() => setSection("plans")}
          >
            <Calculator className="h-4 w-4 mr-1.5" />
            Tabela de Planos & Preços por Igreja
          </Button>
          <Button
            type="button"
            variant={section === "clauses" ? "default" : "outline"}
            onClick={() => setSection("clauses")}
          >
            <FileSignature className="h-4 w-4 mr-1.5" />
            Contratos, Minuta & Cláusulas ({contracts.length})
          </Button>
        </div>
        <Badge variant="outline" className="text-xs">
          Precificação unitária por unidade/igreja • Persistida em nuvem
        </Badge>
      </div>

      {/* =======================================================
          SUB-SEÇÃO A: TABELA DE PLANOS & PREÇOS POR FAIXA
          ======================================================= */}
      {section === "plans" && (
        <div className="space-y-6">
          {/* Simulador ao vivo */}
          <Card className="border-primary/35 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Simulador Instantâneo por Unidade Individual
                  </CardTitle>
                  <CardDescription>
                    Regra ativa: o valor unitário cai conforme o volume de igrejas/unidades do cliente, e o total mensal multiplica o valor da faixa pela quantidade de unidades.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={handleCopyProposal}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar proposta
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Segmento</Label>
                  <Select
                    value={simSegment}
                    onValueChange={(v) => setSimSegment(v as ProjectSegment)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="igreja">Igreja & Ministério</SelectItem>
                      <SelectItem value="comercio">Comércio & Empresas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    {simSegment === "igreja" ? "Nº de Igrejas" : "Nº de Unidades/Lojas"}
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    className="bg-background"
                    value={simUnits}
                    onChange={(e) => setSimUnits(e.target.value)}
                  />
                </div>
              </div>

              <div className="md:col-span-7 rounded-xl border bg-card p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <Badge variant="secondary" className="text-[11px]">
                    {simCalc.tier.name}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    Valor unitário: <strong className="text-foreground">{formatBRL(simCalc.unitPrice)}</strong>{" "}
                    ({simCalc.ruleLabel})
                  </div>
                  {simCalc.totalSavingsVsBase > 0 && (
                    <div className="text-xs text-emerald-400">
                      Desconto progressivo de {formatBRL(simCalc.savingsPerUnit)}/unid. (economia de{" "}
                      {formatBRL(simCalc.totalSavingsVsBase)}/mês)
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Mensalidade Total</div>
                  <div className="text-2xl font-bold text-primary">
                    {formatBRL(simCalc.totalMonthly)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Faixas Editáveis por Segmento */}
          {(["igreja", "comercio"] as const).map((seg) => {
            const list = tiersDraft
              .filter((t) => t.segment === seg)
              .sort((a, b) => a.minUnits - b.minUnits);
            return (
              <Card key={seg}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {seg === "igreja" ? (
                          <Church className="h-4 w-4 text-primary" />
                        ) : (
                          <Store className="h-4 w-4 text-accent" />
                        )}
                        Tabela de Faixas —{" "}
                        {seg === "igreja" ? "Igrejas & Ministérios (Por Igreja)" : "Comércio & Empresas (Por Unidade)"}
                      </CardTitle>
                      <CardDescription>
                        {seg === "igreja"
                          ? "Ex.: Até 10 igrejas = R$ 99,90/unid • 11 a 30 = R$ 89,90/unid • 31 a 50 = R$ 79,90/unid • 51+ = R$ 69,90/unid."
                          : "Referência editável por unidade/loja comercial contratada."}
                      </CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => addTier(seg)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Nova faixa
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {list.map((tier) => {
                    const exampleUnits = tier.maxUnits ? Math.min(tier.maxUnits, tier.minUnits + 4) : tier.minUnits + 9;
                    const exampleTotal = exampleUnits * tier.unitPrice;
                    return (
                      <div
                        key={tier.id}
                        className="rounded-lg border bg-muted/25 p-3.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                      >
                        <div className="md:col-span-3 space-y-1">
                          <Label className="text-xs">Nome da Faixa</Label>
                          <Input
                            value={tier.name}
                            onChange={(e) => updateTierField(tier.id, { name: e.target.value })}
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-xs">Mín. unidades</Label>
                          <Input
                            type="number"
                            min="1"
                            value={tier.minUnits}
                            onChange={(e) =>
                              updateTierField(tier.id, {
                                minUnits: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                              })
                            }
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-xs">Máx. (vazio = ∞)</Label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Sem limite"
                            value={tier.maxUnits ?? ""}
                            onChange={(e) =>
                              updateTierField(tier.id, {
                                maxUnits: e.target.value
                                  ? Math.max(1, Math.floor(Number(e.target.value) || 1))
                                  : null,
                              })
                            }
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-xs">Preço/unidade (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={tier.unitPrice}
                            onChange={(e) =>
                              updateTierField(tier.id, {
                                unitPrice: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div className="md:col-span-2 text-xs text-muted-foreground pb-2">
                          Ex.: {exampleUnits} un. ={" "}
                          <strong className="text-foreground">{formatBRL(exampleTotal)}</strong>
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={list.length <= 1}
                            onClick={() =>
                              setTiersDraft((prev) => prev.filter((x) => x.id !== tier.id))
                            }
                            title="Remover faixa"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTiersDraft(DEFAULT_PRICING_TIERS);
                toast({
                  title: "Tabela padrão restaurada no rascunho",
                  description: "Clique em Salvar Tabela para gravar no Supabase.",
                });
              }}
            >
              <RotateCcw className="h-4 w-4 mr-1.5" /> Restaurar Padrão (99,90 → 69,90)
            </Button>
            <Button onClick={handleSaveTiers} disabled={tiersSaving}>
              <Save className="h-4 w-4 mr-1.5" />
              {tiersSaving ? "Salvando..." : "Salvar Tabela no Supabase"}
            </Button>
          </div>

          {/* Conferência dos Contratos Atuais na Tabela */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Enquadramento dos Contratos Atuais na Tabela
              </CardTitle>
              <CardDescription>
                Compare o valor cobrado em cada contrato com o valor sugerido pela tabela por unidade.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {contracts.map((c) => {
                const units = c.unitsCount ?? 1;
                const calc = calculateTieredPrice(c.segment, units, tiersDraft);
                const diff = Math.abs((c.monthlyValue ?? 0) - calc.totalMonthly) > 0.01;
                return (
                  <div
                    key={c.id}
                    className="rounded-lg border p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {c.code}
                        </Badge>
                        <span className="font-semibold text-sm">{c.clientName}</span>
                        <Badge variant="secondary">{units} unid.</Badge>
                      </div>
                      <p className="text-muted-foreground">
                        Atual: <strong>{formatBRL(c.monthlyValue ?? 0)}</strong> • Tabela ({calc.tier.name}):{" "}
                        <strong className="text-primary">{formatBRL(calc.totalMonthly)}</strong> ({calc.ruleLabel})
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {diff && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await onUpdateContract(c.id, {
                              monthlyValue: calc.totalMonthly,
                              planName: `${calc.tier.name} (${calc.ruleLabel})`,
                            });
                            toast({
                              title: `Mensalidade de ${c.code} atualizada para ${formatBRL(
                                calc.totalMonthly
                              )}`,
                            });
                          }}
                        >
                          Aplicar {formatBRL(calc.totalMonthly)}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          onSelectContractId(c.id);
                          setSection("clauses");
                        }}
                      >
                        Abrir Minuta
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* =======================================================
          SUB-SEÇÃO B: CONTRATOS, MINUTA & CLÁUSULAS DINÂMICAS
          ======================================================= */}
      {section === "clauses" && (
        <div className="space-y-6">
          {/* Dados da Contratada (SynapSys) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Dados da Contratada (SynapSys) & Foro Padrão
              </CardTitle>
              <CardDescription>
                Preenchem automaticamente as tags <code>{"{{contratada_nome}}"}</code>,{" "}
                <code>{"{{contratada_documento}}"}</code> e <code>{"{{foro_cidade}}"}</code> em todas as minutas.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Razão Social / Nome Contratada</Label>
                <Input
                  value={contractorDraft.beneficiaryName}
                  onChange={(e) =>
                    setContractorDraft((d) => ({ ...d, beneficiaryName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CNPJ / CPF da Contratada</Label>
                <Input
                  placeholder="00.000.000/0001-00"
                  value={contractorDraft.contractorDocument}
                  onChange={(e) =>
                    setContractorDraft((d) => ({ ...d, contractorDocument: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cidade / Foro Padrão</Label>
                <Input
                  value={contractorDraft.contractorCity}
                  onChange={(e) =>
                    setContractorDraft((d) => ({ ...d, contractorCity: e.target.value }))
                  }
                />
              </div>
              <Button onClick={handleSaveContractor} disabled={contractorSaving}>
                <Save className="h-4 w-4 mr-1.5" />
                {contractorSaving ? "Salvando..." : "Salvar Contratada"}
              </Button>
            </CardContent>
          </Card>

          {!effectiveContract ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Cadastre ao menos um contrato para gerar minutas e gerenciar cláusulas.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Seleção do Contrato + Dados Jurídicos */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Ficha Jurídica & Ciclo de Vida do Contrato
                      </CardTitle>
                      <CardDescription>
                        Selecione o contratante para editar CNPJ/CPF, unidades, vencimento, status contratual e gerar o PDF.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={effectiveContract.id} onValueChange={onSelectContractId}>
                        <SelectTrigger className="w-72">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {contracts.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.code} — {c.clientName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge
                        variant={
                          CONTRACT_LEGAL_STATUS_META[legalDraft.contractLegalStatus].badgeVariant
                        }
                      >
                        {CONTRACT_LEGAL_STATUS_META[legalDraft.contractLegalStatus].label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Razão Social / Nome Jurídico</Label>
                      <Input
                        value={legalDraft.legalName}
                        onChange={(e) =>
                          setLegalDraft((d) => ({ ...d, legalName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">CNPJ / CPF</Label>
                      <Input
                        placeholder="00.000.000/0001-00"
                        value={legalDraft.documentNumber}
                        onChange={(e) =>
                          setLegalDraft((d) => ({ ...d, documentNumber: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Status Contratual</Label>
                      <Select
                        value={legalDraft.contractLegalStatus}
                        onValueChange={(v) =>
                          setLegalDraft((d) => ({
                            ...d,
                            contractLegalStatus: v as ContractLegalStatus,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CONTRACT_LEGAL_STATUS_META).map(([k, meta]) => (
                            <SelectItem key={k} value={k}>
                              {meta.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs">Endereço Completo</Label>
                      <Input
                        placeholder="Rua, nº, bairro, cidade - UF, CEP"
                        value={legalDraft.address}
                        onChange={(e) =>
                          setLegalDraft((d) => ({ ...d, address: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Data de Início / Vigência</Label>
                      <Input
                        type="date"
                        value={legalDraft.contractStartDate}
                        onChange={(e) =>
                          setLegalDraft((d) => ({ ...d, contractStartDate: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unidades / Igrejas Contratadas</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={legalDraft.unitsCount}
                        onChange={(e) =>
                          setLegalDraft((d) => ({ ...d, unitsCount: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs">Valor Mensal (R$)</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1.5 text-[11px] text-primary"
                          onClick={() => {
                            const units = Math.max(
                              1,
                              Math.floor(Number(legalDraft.unitsCount) || 1)
                            );
                            const calc = calculateTieredPrice(
                              effectiveContract.segment,
                              units,
                              tiersDraft
                            );
                            setLegalDraft((d) => ({
                              ...d,
                              monthlyValue: calc.totalMonthly.toFixed(2),
                            }));
                          }}
                        >
                          Calcular tabela
                        </Button>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={legalDraft.monthlyValue}
                        onChange={(e) =>
                          setLegalDraft((d) => ({ ...d, monthlyValue: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Dia Venc.</Label>
                        <Input
                          type="number"
                          min="1"
                          max="28"
                          value={legalDraft.billingDueDay}
                          onChange={(e) =>
                            setLegalDraft((d) => ({ ...d, billingDueDay: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Reajuste</Label>
                        <Input
                          placeholder="IPCA"
                          value={legalDraft.adjustmentIndex}
                          onChange={(e) =>
                            setLegalDraft((d) => ({ ...d, adjustmentIndex: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleSaveContractLegal} disabled={contractSaving}>
                        <Save className="h-4 w-4 mr-1.5" />
                        {contractSaving ? "Salvando..." : "Salvar Dados do Contrato"}
                      </Button>
                      <Button variant="outline" onClick={handlePrintContract}>
                        <Printer className="h-4 w-4 mr-1.5" /> Imprimir / Gerar PDF
                      </Button>
                      <Button variant="outline" onClick={handleCopyFullDraft}>
                        {copiedDraft ? (
                          <>
                            <Check className="h-4 w-4 mr-1.5 text-emerald-400" /> Copiada
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1.5" /> Copiar Minuta
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Editor de Cláusulas + Prévia Renderizada lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Coluna esquerda: Editor */}
                <Card className="lg:col-span-6">
                  <CardHeader className="pb-3 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">Editor de Cláusulas</CardTitle>
                      <div className="flex items-center gap-2 text-xs">
                        <Label htmlFor="custom-clauses-switch">Personalizar só este contrato</Label>
                        <Switch
                          id="custom-clauses-switch"
                          checked={legalDraft.useCustomClauses}
                          onCheckedChange={handleToggleCustomClauses}
                        />
                      </div>
                    </div>
                    <CardDescription>
                      {legalDraft.useCustomClauses
                        ? `Editando minuta exclusiva de ${effectiveContract.code}.`
                        : "Editando o modelo padrão global da SynapSys (usado em todos os contratos sem exceção personalizada)."}
                    </CardDescription>

                    {/* Paleta de Variáveis */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-medium text-muted-foreground">
                        Clique em uma variável para inserir na cláusula selecionada:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {CONTRACT_TEMPLATE_TAGS.map((item) => (
                          <button
                            key={item.tag}
                            type="button"
                            onClick={() => insertTagIntoClause(item.tag)}
                            className="text-[10px] font-mono px-2 py-0.5 rounded border bg-muted hover:border-primary hover:text-primary transition-colors"
                            title={item.label}
                          >
                            {item.tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {clausesDraft.map((clause, idx) => {
                      const isSelected = activeClauseId === clause.id;
                      return (
                        <div
                          key={clause.id}
                          onClick={() => setActiveClauseId(clause.id)}
                          className={`rounded-lg border p-3 space-y-2 transition-colors ${
                            isSelected ? "border-primary bg-primary/5" : "bg-card"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              value={clause.title}
                              onChange={(e) =>
                                setClausesDraft((prev) =>
                                  prev.map((c) =>
                                    c.id === clause.id ? { ...c, title: e.target.value } : c
                                  )
                                )
                              }
                              className="font-semibold text-xs h-8"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0"
                              disabled={idx === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveClause(idx, -1);
                              }}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0"
                              disabled={idx === clausesDraft.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveClause(idx, 1);
                              }}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0"
                              disabled={clausesDraft.length <= 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                setClausesDraft((prev) =>
                                  prev.filter((c) => c.id !== clause.id)
                                );
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                          <Textarea
                            rows={4}
                            value={clause.body}
                            onChange={(e) =>
                              setClausesDraft((prev) =>
                                prev.map((c) =>
                                  c.id === clause.id ? { ...c, body: e.target.value } : c
                                )
                              )
                            }
                            className="text-xs leading-relaxed"
                          />
                        </div>
                      );
                    })}

                    <div className="flex flex-wrap justify-between gap-2 pt-2">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const id = `clausula-${Date.now()}`;
                            setClausesDraft((prev) => [
                              ...prev,
                              {
                                id,
                                order: prev.length + 1,
                                title: `CLÁUSULA ${prev.length + 1}ª — NOVA DISPOSIÇÃO`,
                                body: "Descreva aqui a regra específica acordada entre {{contratada_nome}} e {{razao_social}}.",
                              },
                            ]);
                            setActiveClauseId(id);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Cláusula
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setClausesDraft(DEFAULT_CONTRACT_CLAUSES)}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Padrão
                        </Button>
                      </div>
                      <Button size="sm" onClick={handleSaveClauses} disabled={clausesSaving}>
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        {clausesSaving ? "Salvando..." : "Salvar Cláusulas"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Coluna direita: Pré-visualização Final Renderizada */}
                <Card className="lg:col-span-6">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">Pré-visualização da Minuta Preenchida</CardTitle>
                        <CardDescription>
                          Pronta para impressão em PDF ou assinatura digital (ZapSign / DocuSign / Clicksign).
                        </CardDescription>
                      </div>
                      <Button size="sm" onClick={handlePrintContract}>
                        <Printer className="h-3.5 w-3.5 mr-1.5" /> PDF
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {previewContract && (
                      <div className="rounded-lg border bg-white text-slate-900 p-5 space-y-4 max-h-[680px] overflow-y-auto text-xs leading-relaxed shadow-inner">
                        <div className="border-b border-slate-300 pb-3 flex justify-between items-start gap-4">
                          <div>
                            <div className="font-bold text-sm text-cyan-700">
                              {contractorDraft.beneficiaryName || "SynapSys — Sistemas & Inteligência"}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Instrumento Particular de Licenciamento SaaS
                            </div>
                          </div>
                          <div className="text-right text-[11px] text-slate-600 font-mono">
                            {previewContract.code}
                          </div>
                        </div>

                        {[...clausesDraft]
                          .sort((a, b) => a.order - b.order)
                          .map((clause) => {
                            const mergedCfg: PlatformBillingConfig = {
                              ...billingConfig,
                              beneficiaryName: contractorDraft.beneficiaryName,
                              contractorDocument: contractorDraft.contractorDocument,
                              contractorCity: contractorDraft.contractorCity,
                            };
                            const renderedTitle = renderClauseTemplate(
                              clause.title,
                              previewContract,
                              tiersDraft,
                              mergedCfg
                            );
                            const renderedBody = renderClauseTemplate(
                              clause.body,
                              previewContract,
                              tiersDraft,
                              mergedCfg
                            );
                            return (
                              <div key={clause.id} className="space-y-1">
                                <h4 className="font-bold text-slate-900 text-xs">{renderedTitle}</h4>
                                {renderedBody
                                  .split("\n")
                                  .filter(Boolean)
                                  .map((line, i) => (
                                    <p key={i} className="text-slate-700 text-justify">
                                      {line}
                                    </p>
                                  ))}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Log de Atividades do Contrato */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Histórico de Atividades — {effectiveContract.code}
                  </CardTitle>
                  <CardDescription>
                    Registro automático de alterações de unidades, faturas emitidas, pagamentos e status contratual.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!effectiveContract.activityLog || effectiveContract.activityLog.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhum evento registrado ainda neste contrato. Alterações de valor, unidades, faturas e status passarão a aparecer aqui automaticamente.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {effectiveContract.activityLog.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded border px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {entry.type}
                            </Badge>
                            <span>{entry.summary}</span>
                          </div>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {new Date(entry.at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
};
