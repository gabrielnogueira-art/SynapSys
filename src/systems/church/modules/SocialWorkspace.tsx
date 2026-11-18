import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  HandHeart,
  PackagePlus,
  Plus,
  Users,
} from "lucide-react";
import type { LabRoleMode, SocialData } from "@/platform/labs/labsTypes";
import {
  assembleSocialBaskets,
  validateSocialDelivery,
} from "@/platform/labs/labsDefaults";
import { todayIsoDate } from "@/platform/saasDefaults";
import { useToast } from "@/hooks/use-toast";

interface SocialWorkspaceProps {
  data: SocialData;
  onChange: (next: SocialData) => void;
  roleMode?: LabRoleMode;
  isSandbox?: boolean;
}

export const SocialWorkspace = ({
  data,
  onChange,
  roleMode = "admin",
  isSandbox = false,
}: SocialWorkspaceProps) => {
  const { toast } = useToast();
  const isAdmin = roleMode === "admin";
  const canOperate = roleMode === "admin" || roleMode === "operador";

  // Donation entry form
  const [donCampaign, setDonCampaign] = useState("Culto das Primícias");
  const [donDonor, setDonDonor] = useState("");
  const [donSupplyId, setDonSupplyId] = useState(data.supplies[0]?.id ?? "");
  const [donSupplyQty, setDonSupplyQty] = useState("5");
  const [donDirectBaskets, setDonDirectBaskets] = useState("0");

  // Basket assembly
  const [assembleQty, setAssembleQty] = useState("2");
  const [assembleOperator, setAssembleOperator] = useState("Diácono Plantão");

  // Family registration
  const [newFamName, setNewFamName] = useState("");
  const [newFamNeighborhood, setNewFamNeighborhood] = useState("");
  const [newFamDeps, setNewFamDeps] = useState("3");

  // Delivery registration
  const [delFamilyId, setDelFamilyId] = useState(data.families[0]?.id ?? "");
  const [delDate, setDelDate] = useState(todayIsoDate());
  const [delQty, setDelQty] = useState("1");
  const [delCampaign, setDelCampaign] = useState("Entrega Regular");
  const [delOverrideDup, setDelOverrideDup] = useState(false);

  const possibleBasketsFromSupplies = useMemo(() => {
    if (data.basketRecipe.length === 0) return 0;
    const supplyMap = new Map(data.supplies.map((s) => [s.id, s]));
    let maxPossible = Infinity;
    for (const line of data.basketRecipe) {
      const avail = supplyMap.get(line.supplyId)?.stockQty ?? 0;
      const count = Math.floor(avail / line.qtyPerBasket);
      if (count < maxPossible) maxPossible = count;
    }
    return Number.isFinite(maxPossible) ? maxPossible : 0;
  }, [data.supplies, data.basketRecipe]);

  const currentMonth = delDate.slice(0, 7);
  const deliveriesThisMonth = useMemo(
    () => data.deliveries.filter((d) => d.competenceMonth === currentMonth),
    [data.deliveries, currentMonth]
  );

  const handleRegisterDonation = (e: React.FormEvent) => {
    e.preventDefault();
    const qtySupply = Math.max(0, Number(donSupplyQty) || 0);
    const directBaskets = Math.max(0, Math.floor(Number(donDirectBaskets) || 0));
    const supply = data.supplies.find((s) => s.id === donSupplyId);

    if (qtySupply <= 0 && directBaskets <= 0) {
      toast({ variant: "destructive", title: "Informe ao menos um alimento ou cesta pronta." });
      return;
    }

    const items =
      supply && qtySupply > 0
        ? [{ supplyId: supply.id, supplyName: supply.name, qty: qtySupply, unit: supply.unit }]
        : [];

    const donation = {
      id: `don-${Date.now()}`,
      date: todayIsoDate(),
      campaign: donCampaign.trim() || "Doação Avulsa",
      donorName: donDonor.trim() || undefined,
      items,
      directBasketsQty: directBaskets > 0 ? directBaskets : undefined,
    };

    onChange({
      ...data,
      basketStock: data.basketStock + directBaskets,
      supplies:
        supply && qtySupply > 0
          ? data.supplies.map((s) =>
              s.id === supply.id ? { ...s, stockQty: s.stockQty + qtySupply } : s
            )
          : data.supplies,
      donations: [donation, ...data.donations],
    });
    setDonDonor("");
    toast({ title: "Doação / arrecadação registrada no estoque!" });
  };

  const handleAssemble = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Math.max(1, Math.floor(Number(assembleQty) || 1));
    const res = assembleSocialBaskets(data, qty, assembleOperator, todayIsoDate());
    if (!res.ok) {
      const msg = res.shortages
        .map((s) => `${s.supplyName}: falta ${s.required - s.available} ${s.unit}`)
        .join(" • ");
      toast({
        variant: "destructive",
        title: "Insumos insuficientes para montagem",
        description: msg,
      });
      return;
    }
    onChange(res.nextData);
    toast({
      title: `${qty} cesta(s) montada(s)!`,
      description: "Insumos avulsos baixados automaticamente da despensa.",
    });
  };

  const handleAddFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamName.trim()) return;
    const fam = {
      id: `fam-${Date.now()}`,
      headName: newFamName.trim(),
      neighborhood: newFamNeighborhood.trim() || undefined,
      dependentsCount: Math.max(1, Math.floor(Number(newFamDeps) || 1)),
      active: true,
    };
    onChange({
      ...data,
      families: [fam, ...data.families],
    });
    setDelFamilyId(fam.id);
    setNewFamName("");
    setNewFamNeighborhood("");
    toast({ title: `Família de ${fam.headName} cadastrada!` });
  };

  const handleRegisterDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    const family = data.families.find((f) => f.id === delFamilyId);
    if (!family) return;
    const qty = Math.max(1, Math.floor(Number(delQty) || 1));
    const check = validateSocialDelivery(
      data,
      family.id,
      delDate,
      qty,
      isAdmin && delOverrideDup
    );
    if (!check.ok) {
      toast({
        variant: "destructive",
        title: "Entrega bloqueada",
        description: check.reason,
      });
      return;
    }
    const delivery = {
      id: `del-${Date.now()}`,
      date: delDate,
      competenceMonth: check.competenceMonth,
      familyId: family.id,
      familyName: family.headName,
      basketsQty: qty,
      campaignTag: delCampaign.trim() || undefined,
      deliveredBy: assembleOperator,
    };
    onChange({
      ...data,
      basketStock: Math.max(0, data.basketStock - qty),
      deliveries: [delivery, ...data.deliveries],
    });
    setDelOverrideDup(false);
    toast({
      title: `Cesta entregue para ${family.headName}!`,
      description: `Estoque atualizado: ${Math.max(0, data.basketStock - qty)} cesta(s) pronta(s).`,
    });
  };

  const deliveryValidationPreview = useMemo(() => {
    if (!delFamilyId) return null;
    return validateSocialDelivery(data, delFamilyId, delDate, Math.max(1, Number(delQty) || 1), false);
  }, [data, delFamilyId, delDate, delQty]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <HandHeart className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">Ação Social & Cestas Básicas</h3>
              {isSandbox && <Badge variant="secondary">Sandbox Labs</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              Arrecadações por campanha, montagem automática de cestas e entregas com trava contra duplicidade mensal.
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cestas Prontas em Estoque</CardDescription>
            <CardTitle className="text-2xl text-emerald-500">{data.basketStock} cestas</CardTitle>
            <p className="text-xs text-muted-foreground">
              +{possibleBasketsFromSupplies} montáveis com alimentos avulsos
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Insumos em Despensa</CardDescription>
            <CardTitle className="text-2xl">{data.supplies.length} itens</CardTitle>
            <p className="text-xs text-muted-foreground">
              {data.supplies.filter((s) => s.stockQty <= s.minStockAlert).length} abaixo do mínimo
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Entregas no Mês ({currentMonth})</CardDescription>
            <CardTitle className="text-2xl text-primary">
              {deliveriesThisMonth.length} cesta(s)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Trava mensal automática ativa
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Famílias Cadastradas</CardDescription>
            <CardTitle className="text-2xl">{data.families.length}</CardTitle>
            <p className="text-xs text-muted-foreground">
              Assistência acompanhada pela diaconia
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Despensa + Doações + Montagem de Cestas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />
              Despensa de Alimentos & Campanhas
            </CardTitle>
            <CardDescription>
              Registre entradas do Culto das Primícias ou doações avulsas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {data.supplies.map((s) => {
                const low = s.stockQty <= s.minStockAlert;
                return (
                  <div
                    key={s.id}
                    className={`rounded border px-3 py-2 flex items-center justify-between text-xs ${
                      low ? "border-amber-500/40 bg-amber-500/5" : ""
                    }`}
                  >
                    <span className="font-medium">{s.name}</span>
                    <Badge variant={low ? "destructive" : "secondary"}>
                      {s.stockQty} {s.unit}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {canOperate && (
              <form
                onSubmit={handleRegisterDonation}
                className="rounded-lg border bg-muted/30 p-3 space-y-2.5 text-xs"
              >
                <div className="font-semibold">Registrar Arrecadação / Doação</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Campanha (ex.: Culto Primícias)"
                    value={donCampaign}
                    onChange={(e) => setDonCampaign(e.target.value)}
                  />
                  <Input
                    placeholder="Doador / Congregação"
                    value={donDonor}
                    onChange={(e) => setDonDonor(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={donSupplyId} onValueChange={setDonSupplyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Alimento" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.supplies.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Qtd insumo"
                    value={donSupplyQty}
                    onChange={(e) => setDonSupplyQty(e.target.value)}
                  />
                  <Input
                    type="number"
                    min="0"
                    placeholder="+ Cestas prontas"
                    value={donDirectBaskets}
                    onChange={(e) => setDonDirectBaskets(e.target.value)}
                  />
                </div>
                <Button type="submit" size="sm" className="w-full">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Somar ao Estoque
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Montagem Automática de Cestas */}
        <Card className="lg:col-span-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PackagePlus className="h-4 w-4 text-primary" />
              Montagem de Cestas (Baixa Automática)
            </CardTitle>
            <CardDescription>
              Transforma alimentos avulsos da despensa em cestas prontas seguindo a receita padrão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="rounded-lg border p-3 bg-muted/20 space-y-1.5">
              <div className="font-semibold text-muted-foreground uppercase text-[11px]">
                Composição padrão de 1 Cesta Básica
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.basketRecipe.map((line) => (
                  <Badge key={line.supplyId} variant="outline">
                    {line.qtyPerBasket} {line.unit} • {line.supplyName}
                  </Badge>
                ))}
              </div>
            </div>

            {canOperate && (
              <form onSubmit={handleAssemble} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Qtde a montar (máx. {possibleBasketsFromSupplies})</Label>
                  <Input
                    type="number"
                    min="1"
                    value={assembleQty}
                    onChange={(e) => setAssembleQty(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Responsável</Label>
                  <Input
                    value={assembleOperator}
                    onChange={(e) => setAssembleOperator(e.target.value)}
                  />
                </div>
                <Button type="submit">Montar Cestas</Button>
              </form>
            )}

            <div className="space-y-1.5 max-h-44 overflow-y-auto pt-1">
              <div className="font-semibold text-[11px] uppercase text-muted-foreground">
                Últimas montagens
              </div>
              {data.assemblies.map((a) => (
                <div key={a.id} className="rounded border px-3 py-1.5 flex justify-between">
                  <span>
                    <strong>{a.basketsAssembled} cesta(s)</strong> montada(s)
                    {a.operatorName ? ` • ${a.operatorName}` : ""}
                  </span>
                  <span className="text-muted-foreground">
                    {a.date.split("-").reverse().join("/")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entregas & Famílias */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Famílias Assistidas ({data.families.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {data.families.map((f) => {
                const gotThisMonth = deliveriesThisMonth.some((d) => d.familyId === f.id);
                return (
                  <div
                    key={f.id}
                    className="rounded border px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-sm">{f.headName}</div>
                      <div className="text-muted-foreground">
                        {f.neighborhood || "Sem bairro"} • {f.dependentsCount} pessoa(s)
                        {f.contact ? ` • ${f.contact}` : ""}
                      </div>
                    </div>
                    <Badge variant={gotThisMonth ? "secondary" : "outline"}>
                      {gotThisMonth ? `Atendida em ${currentMonth}` : "Disponível no mês"}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {canOperate && (
              <form onSubmit={handleAddFamily} className="rounded border bg-muted/30 p-3 space-y-2">
                <div className="font-semibold">Cadastrar Nova Família</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Nome do responsável *"
                    value={newFamName}
                    onChange={(e) => setNewFamName(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Bairro"
                    value={newFamNeighborhood}
                    onChange={(e) => setNewFamNeighborhood(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Moradores"
                      value={newFamDeps}
                      onChange={(e) => setNewFamDeps(e.target.value)}
                    />
                    <Button type="submit" size="sm">
                      Salvar
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Registrar Entrega com trava de duplicidade */}
        <Card className="lg:col-span-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Saída & Entrega de Cesta (Trava Anti-Duplicidade)
            </CardTitle>
            <CardDescription>
              Impede entrega duplicada para a mesma família no mesmo mês.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <form onSubmit={handleRegisterDelivery} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Família Assistida *</Label>
                <Select value={delFamilyId} onValueChange={setDelFamilyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a família" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.families.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.headName} {f.neighborhood ? `(${f.neighborhood})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Data</Label>
                  <Input
                    type="date"
                    value={delDate}
                    onChange={(e) => setDelDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cestas</Label>
                  <Input
                    type="number"
                    min="1"
                    value={delQty}
                    onChange={(e) => setDelQty(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Campanha</Label>
                  <Input
                    value={delCampaign}
                    onChange={(e) => setDelCampaign(e.target.value)}
                  />
                </div>
              </div>

              {deliveryValidationPreview && !deliveryValidationPreview.ok && (
                <div className="rounded border border-destructive/40 bg-destructive/10 p-2.5 text-destructive space-y-2">
                  <div className="flex items-start gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{deliveryValidationPreview.reason}</span>
                  </div>
                  {isAdmin && deliveryValidationPreview.duplicateDelivery && (
                    <label className="flex items-center gap-2 text-foreground cursor-pointer">
                      <Checkbox
                        checked={delOverrideDup}
                        onCheckedChange={(v) => setDelOverrideDup(Boolean(v))}
                      />
                      <span>Autorizar entrega excepcional no mesmo mês (Admin)</span>
                    </label>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirmar Entrega & Baixar Cesta
              </Button>
            </form>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
              <div className="font-semibold uppercase text-[11px] text-muted-foreground">
                Entregas recentes ({data.deliveries.length})
              </div>
              {data.deliveries.map((d) => (
                <div key={d.id} className="rounded border px-3 py-1.5 flex justify-between">
                  <span>
                    <strong>{d.familyName}</strong> • {d.basketsQty} cesta(s)
                  </span>
                  <span className="text-muted-foreground">
                    {d.date.split("-").reverse().join("/")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
