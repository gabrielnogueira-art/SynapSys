import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle2,
  CreditCard,
  Lock,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import type {
  CantinaData,
  CantinaItemCategory,
  CantinaPaymentMethod,
  LabRoleMode,
} from "@/platform/labs/labsTypes";
import { computeCantinaEventSummary } from "@/platform/labs/labsDefaults";
import { formatBRL, todayIsoDate } from "@/platform/saasDefaults";
import { useToast } from "@/hooks/use-toast";

interface CantinaWorkspaceProps {
  data: CantinaData;
  onChange: (next: CantinaData) => void;
  roleMode?: LabRoleMode;
  isSandbox?: boolean;
}

export const CantinaWorkspace = ({
  data,
  onChange,
  roleMode = "admin",
  isSandbox = false,
}: CantinaWorkspaceProps) => {
  const { toast } = useToast();
  const isAdmin = roleMode === "admin";
  const canSell = roleMode === "admin" || roleMode === "operador";

  const [selectedEventId, setSelectedEventId] = useState<string>(
    data.events[0]?.id ?? ""
  );
  const activeEvent =
    data.events.find((e) => e.id === selectedEventId) ?? data.events[0];

  // New Event inline form
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState(todayIsoDate());
  const [newEventCash, setNewEventCash] = useState("100");

  // New Item form
  const [newItemName, setNewItemName] = useState("");
  const [newItemCat, setNewItemCat] = useState<CantinaItemCategory>("salgado");
  const [newItemPrice, setNewItemPrice] = useState("7.00");
  const [newItemCost, setNewItemCost] = useState("3.00");
  const [newItemProduced, setNewItemProduced] = useState("30");

  // POS Cart
  const [cart, setCart] = useState<Record<string, number>>({});
  const [payMethod, setPayMethod] = useState<CantinaPaymentMethod>("pix");
  const [buyerName, setBuyerName] = useState("");
  const [countedCashInput, setCountedCashInput] = useState<string>(
    activeEvent?.countedCash !== undefined ? String(activeEvent.countedCash) : ""
  );

  const summary = useMemo(
    () => computeCantinaEventSummary(activeEvent, data.items, data.sales),
    [activeEvent, data.items, data.sales]
  );

  const eventItems = useMemo(
    () => data.items.filter((i) => i.eventId === activeEvent?.id),
    [data.items, activeEvent?.id]
  );
  const eventSales = useMemo(
    () => data.sales.filter((s) => s.eventId === activeEvent?.id),
    [data.sales, activeEvent?.id]
  );

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, qty]) => {
        const item = eventItems.find((i) => i.id === itemId);
        return item ? { item, qty, subtotal: qty * item.unitPrice } : null;
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [cart, eventItems]);

  const cartTotal = useMemo(
    () => cartLines.reduce((sum, l) => sum + l.subtotal, 0),
    [cartLines]
  );

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;
    const id = `evt-${Date.now()}`;
    const nextEvent = {
      id,
      name: newEventName.trim(),
      date: newEventDate || todayIsoDate(),
      status: "aberto" as const,
      initialCash: parseFloat(newEventCash) || 0,
    };
    onChange({
      ...data,
      events: [nextEvent, ...data.events],
    });
    setSelectedEventId(id);
    setNewEventName("");
    setNewEventOpen(false);
    toast({ title: "Novo culto/evento criado na Cantina!" });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent || !newItemName.trim()) return;
    const newItem = {
      id: `cnt-${Date.now()}`,
      eventId: activeEvent.id,
      name: newItemName.trim(),
      category: newItemCat,
      unitPrice: Math.max(0, parseFloat(newItemPrice) || 0),
      unitCost: Math.max(0, parseFloat(newItemCost) || 0),
      producedQty: Math.max(0, Math.floor(Number(newItemProduced) || 0)),
      leftoverQty: 0,
      wasteQty: 0,
    };
    onChange({
      ...data,
      items: [...data.items, newItem],
    });
    setNewItemName("");
    toast({ title: `${newItem.name} adicionado à produção do evento!` });
  };

  const updateItemNumber = (
    itemId: string,
    field: "producedQty" | "leftoverQty" | "wasteQty",
    val: number
  ) => {
    onChange({
      ...data,
      items: data.items.map((it) =>
        it.id === itemId ? { ...it, [field]: Math.max(0, Math.floor(val || 0)) } : it
      ),
    });
  };

  const handleFinishSale = () => {
    if (!activeEvent || cartLines.length === 0) return;
    if (activeEvent.status === "fechado") {
      toast({ variant: "destructive", title: "O caixa deste evento já está fechado." });
      return;
    }
    const sale = {
      id: `csale-${Date.now()}`,
      eventId: activeEvent.id,
      createdAt: new Date().toISOString(),
      items: cartLines.map((l) => ({
        itemId: l.item.id,
        name: l.item.name,
        qty: l.qty,
        unitPrice: l.item.unitPrice,
      })),
      total: cartTotal,
      paymentMethod: payMethod,
      buyerName: buyerName.trim() || undefined,
    };
    onChange({
      ...data,
      sales: [sale, ...data.sales],
    });
    setCart({});
    setBuyerName("");
    toast({
      title: `Venda registrada: ${formatBRL(sale.total)}`,
      description: `Pagamento em ${payMethod.toUpperCase()}.`,
    });
  };

  const handleToggleEventClose = () => {
    if (!activeEvent) return;
    const nextStatus = activeEvent.status === "aberto" ? "fechado" : "aberto";
    const parsedCash = parseFloat(countedCashInput);
    onChange({
      ...data,
      events: data.events.map((ev) =>
        ev.id === activeEvent.id
          ? {
              ...ev,
              status: nextStatus,
              countedCash:
                nextStatus === "fechado" && Number.isFinite(parsedCash)
                  ? parsedCash
                  : ev.countedCash,
            }
          : ev
      ),
    });
    toast({
      title:
        nextStatus === "fechado"
          ? "Caixa da Cantina fechado e conferido!"
          : "Evento reaberto para lançamentos.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Evento Ativo */}
      <div className="rounded-xl border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">Cantina & Eventos</h3>
              {isSandbox && <Badge variant="secondary">Sandbox Labs</Badge>}
              {activeEvent && (
                <Badge variant={activeEvent.status === "aberto" ? "default" : "outline"}>
                  Caixa {activeEvent.status === "aberto" ? "Aberto" : "Fechado"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Controle de produção inicial, vendas no balcão e fechamento automático por culto/evento.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data.events.length > 0 && (
            <Select
              value={activeEvent?.id ?? ""}
              onValueChange={(id) => {
                setSelectedEventId(id);
                const ev = data.events.find((x) => x.id === id);
                setCountedCashInput(
                  ev?.countedCash !== undefined ? String(ev.countedCash) : ""
                );
              }}
            >
              <SelectTrigger className="w-64 h-9 text-xs">
                <SelectValue placeholder="Selecione o evento" />
              </SelectTrigger>
              <SelectContent>
                {data.events.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id}>
                    {ev.name} ({ev.date.split("-").reverse().join("/")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canSell && (
            <Button size="sm" variant="outline" onClick={() => setNewEventOpen((v) => !v)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Novo Evento
            </Button>
          )}
        </div>
      </div>

      {newEventOpen && (
        <Card className="border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Abrir Novo Culto / Evento de Cantina</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs">Nome do Culto / Evento *</Label>
                <Input
                  placeholder="Ex.: Congresso de Jovens — Sábado Noite"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data</Label>
                <Input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2 items-end">
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">Troco Inicial (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newEventCash}
                    onChange={(e) => setNewEventCash(e.target.value)}
                  />
                </div>
                <Button type="submit">Criar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* KPIs do Evento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Produção vs Vendido (PDV)</CardDescription>
            <CardTitle className="text-2xl">
              {summary.totalSoldPosUnits} / {summary.totalProducedUnits} un.
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Sobras: {summary.totalLeftoverUnits} • Quebras: {summary.totalWasteUnits}
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vendido Registrado no Caixa</CardDescription>
            <CardTitle className="text-2xl text-emerald-500">
              {formatBRL(summary.recordedSalesTotal)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              PIX {formatBRL(summary.byPayment.pix)} • Din. {formatBRL(summary.byPayment.dinheiro)} • Cartão{" "}
              {formatBRL(summary.byPayment.cartao)}
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Receita Esperada (Prod. − Sobras)</CardDescription>
            <CardTitle className="text-2xl text-primary">
              {formatBRL(summary.expectedRevenueFromConsumption)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Diferença p/ caixa: {formatBRL(summary.divergenceVsExpected)}
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isAdmin ? "Resultado Estimado (Lucro)" : "Status do Papel Ativo"}</CardDescription>
            <CardTitle className="text-2xl">
              {isAdmin ? formatBRL(summary.estimatedProfit) : roleMode.toUpperCase()}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {isAdmin
                ? `Custo produção: ${formatBRL(summary.estimatedCost)}`
                : "Lucro/custos restritos ao Administrador"}
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* PDV Balcão Rápido + Carrinho */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-7">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              PDV Balcão Rápido {activeEvent?.status === "fechado" ? "(Caixa Fechado)" : ""}
            </CardTitle>
            <CardDescription>
              {canSell
                ? "Toque nos itens para adicionar ao pedido do intervalo/saída do culto."
                : "Modo Voluntário: visualização de disponibilidade sem fechamento de vendas."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eventItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Cadastre os itens produzidos abaixo para iniciar as vendas no balcão.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {summary.itemSummaries.map(({ item, availableStock }) => {
                  const inCart = cart[item.id] ?? 0;
                  const disabled = !canSell || activeEvent?.status === "fechado" || availableStock <= 0;
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border p-3 flex items-center justify-between gap-3 bg-muted/20"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          <strong className="text-primary">{formatBRL(item.unitPrice)}</strong> • Restam{" "}
                          <strong className={availableStock <= 5 ? "text-amber-500" : ""}>
                            {availableStock}
                          </strong>{" "}
                          un.
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          disabled={!canSell || inCart <= 0}
                          onClick={() =>
                            setCart((c) => ({ ...c, [item.id]: Math.max(0, (c[item.id] ?? 0) - 1) }))
                          }
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-6 text-center text-xs font-bold">{inCart}</span>
                        <Button
                          type="button"
                          size="icon"
                          className="h-8 w-8"
                          disabled={disabled || inCart >= availableStock}
                          onClick={() =>
                            setCart((c) => ({ ...c, [item.id]: (c[item.id] ?? 0) + 1 }))
                          }
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fechamento do Pedido */}
        <Card className="lg:col-span-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Carrinho do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cartLines.length === 0 ? (
              <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">
                Nenhum item selecionado no balcão.
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {cartLines.map((l) => (
                  <div key={l.item.id} className="flex justify-between items-center border-b pb-1.5">
                    <span>
                      <strong>{l.qty}x</strong> {l.item.name}
                    </span>
                    <span className="font-semibold">{formatBRL(l.subtotal)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-base font-bold pt-1">
                  <span>Total</span>
                  <span className="text-primary">{formatBRL(cartTotal)}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Forma de Pagamento</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["pix", "dinheiro", "cartao"] as const).map((m) => (
                  <Button
                    key={m}
                    type="button"
                    size="sm"
                    variant={payMethod === m ? "default" : "outline"}
                    onClick={() => setPayMethod(m)}
                    disabled={!canSell}
                  >
                    {m.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Cliente / Observação (opcional)</Label>
              <Input
                placeholder="Ex.: Jovens / Mesa 2"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                disabled={!canSell}
              />
            </div>

            <Button
              className="w-full"
              disabled={!canSell || cartLines.length === 0 || activeEvent?.status === "fechado"}
              onClick={handleFinishSale}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Finalizar Venda ({formatBRL(cartTotal)})
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Produção Inicial, Sobras, Quebras e Fechamento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Produção do Dia, Sobras & Fechamento Automático
          </CardTitle>
          <CardDescription>
            Fórmula de conferência: <code>(Produção Inicial − Sobras) × Preço Unitário = Receita Esperada</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2.5">
            {summary.itemSummaries.map((row) => (
              <div
                key={row.item.id}
                className="rounded-lg border p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs"
              >
                <div className="md:col-span-3">
                  <div className="font-semibold text-sm">{row.item.name}</div>
                  <div className="text-muted-foreground">
                    Preço: <strong>{formatBRL(row.item.unitPrice)}</strong> • Vendidos PDV:{" "}
                    <strong>{row.soldPosQty}</strong>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-[11px]">Produção Inicial</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8"
                    value={row.item.producedQty}
                    onChange={(e) =>
                      updateItemNumber(row.item.id, "producedQty", Number(e.target.value))
                    }
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-[11px]">Sobras (Fim do Culto)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8"
                    value={row.item.leftoverQty}
                    onChange={(e) =>
                      updateItemNumber(row.item.id, "leftoverQty", Number(e.target.value))
                    }
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-[11px]">Quebras / Desperdício</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8"
                    value={row.item.wasteQty}
                    onChange={(e) =>
                      updateItemNumber(row.item.id, "wasteQty", Number(e.target.value))
                    }
                  />
                </div>
                <div className="md:col-span-3 text-right">
                  <div className="text-muted-foreground">
                    Consumido: {row.consumedQty} un.
                  </div>
                  <div className="font-semibold text-primary">
                    Esperado: {formatBRL(row.expectedRevenueFromConsumption)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Apurado PDV: {formatBRL(row.recordedRevenue)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isAdmin && activeEvent && (
            <form onSubmit={handleAddItem} className="rounded-lg border bg-muted/30 p-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs">Novo item na produção</Label>
                <Input
                  placeholder="Ex.: Pastel de Carne"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoria</Label>
                <Select
                  value={newItemCat}
                  onValueChange={(v) => setNewItemCat(v as CantinaItemCategory)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salgado">Salgado</SelectItem>
                    <SelectItem value="bebida">Bebida</SelectItem>
                    <SelectItem value="doce">Doce</SelectItem>
                    <SelectItem value="combo">Combo</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Qtde Prod.</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItemProduced}
                  onChange={(e) => setNewItemProduced(e.target.value)}
                />
              </div>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </form>
          )}

          {/* Fechamento de gaveta */}
          {activeEvent && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-wrap items-end justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="font-semibold text-sm flex items-center gap-1.5">
                  <Banknote className="h-4 w-4 text-primary" /> Fechamento de Gaveta (Dinheiro)
                </div>
                <p className="text-muted-foreground">
                  Troco Inicial ({formatBRL(activeEvent.initialCash)}) + Vendas em Dinheiro (
                  {formatBRL(summary.byPayment.dinheiro)}) ={" "}
                  <strong className="text-foreground">{formatBRL(summary.cashDrawerExpected)}</strong>
                </p>
                {summary.cashDrawerVariance !== null && (
                  <p
                    className={
                      Math.abs(summary.cashDrawerVariance) < 0.01
                        ? "text-emerald-500 font-medium"
                        : "text-amber-500 font-medium flex items-center gap-1"
                    }
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Diferença na contagem da gaveta: {formatBRL(summary.cashDrawerVariance)}
                  </p>
                )}
              </div>

              {isAdmin && (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Dinheiro Contado (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="w-40 h-9 bg-background"
                      value={countedCashInput}
                      onChange={(e) => setCountedCashInput(e.target.value)}
                      placeholder={summary.cashDrawerExpected.toFixed(2)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant={activeEvent.status === "aberto" ? "default" : "outline"}
                    onClick={handleToggleEventClose}
                  >
                    <Lock className="h-3.5 w-3.5 mr-1.5" />
                    {activeEvent.status === "aberto" ? "Fechar Caixa" : "Reabrir Caixa"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Vendas Recentes */}
          {eventSales.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Últimas vendas registradas ({eventSales.length})
              </div>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {eventSales.map((s) => (
                  <div
                    key={s.id}
                    className="rounded border px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold">
                        {s.items.map((l) => `${l.qty}x ${l.name}`).join(", ")}
                      </span>
                      {s.buyerName && (
                        <span className="text-muted-foreground ml-2">• {s.buyerName}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{s.paymentMethod.toUpperCase()}</Badge>
                      <strong className="text-emerald-500">{formatBRL(s.total)}</strong>
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() =>
                            onChange({
                              ...data,
                              sales: data.sales.filter((x) => x.id !== s.id),
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
