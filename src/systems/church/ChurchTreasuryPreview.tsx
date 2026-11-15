import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownCircle, ArrowUpCircle, Landmark, Plus, Wallet } from "lucide-react";

export type TreasurySection = "dashboard" | "entradas" | "saidas";

interface TreasuryEntry {
  id: string;
  date: string;
  type: "entrada" | "saida";
  category: string;
  description: string;
  congregation: string;
  amount: number;
}

const DEFAULT_ENTRIES: TreasuryEntry[] = [
  {
    id: "tr-1",
    date: "2026-11-10",
    type: "entrada",
    category: "Dízimos",
    description: "Culto de Domingo — Sede",
    congregation: "Igreja Sede",
    amount: 4850,
  },
  {
    id: "tr-2",
    date: "2026-11-10",
    type: "entrada",
    category: "Ofertas EBD",
    description: "Repasse de ofertas das classes",
    congregation: "Igreja Sede",
    amount: 640,
  },
  {
    id: "tr-3",
    date: "2026-11-12",
    type: "saida",
    category: "Manutenção & Energia",
    description: "Conta de energia do templo central",
    congregation: "Igreja Sede",
    amount: 920,
  },
];

export const ChurchTreasuryPreview = ({
  contractId,
  clientName,
  activeSection = "dashboard",
}: {
  contractId: string;
  clientName: string;
  activeSection?: TreasurySection;
}) => {
  const storageKey = `church_treasury_${contractId}`;
  const [entries, setEntries] = useState<TreasuryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : DEFAULT_ENTRIES;
    } catch {
      return DEFAULT_ENTRIES;
    }
  });

  const [type, setType] = useState<"entrada" | "saida">(
    activeSection === "saidas" ? "saida" : "entrada"
  );
  const [category, setCategory] = useState("Dízimos");
  const [description, setDescription] = useState("");
  const [congregation] = useState("Igreja Sede");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (activeSection === "entradas") setType("entrada");
    if (activeSection === "saidas") setType("saida");
  }, [activeSection]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
    } catch {
      // ignore quota errors
    }
  }, [entries, storageKey]);

  const totals = useMemo(() => {
    const income = entries.filter((e) => e.type === "entrada").reduce((s, e) => s + e.amount, 0);
    const expense = entries.filter((e) => e.type === "saida").reduce((s, e) => s + e.amount, 0);
    return { income, expense, balance: income - expense };
  }, [entries]);

  const visibleEntries = useMemo(() => {
    if (activeSection === "entradas") return entries.filter((e) => e.type === "entrada");
    if (activeSection === "saidas") return entries.filter((e) => e.type === "saida");
    return entries;
  }, [entries, activeSection]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = parseFloat(amount.replace(",", "."));
    if (!description.trim() || isNaN(numeric) || numeric <= 0) return;

    const next: TreasuryEntry = {
      id: `tr-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      type,
      category,
      description: description.trim(),
      congregation: congregation.trim() || "Igreja Sede",
      amount: numeric,
    };
    setEntries((prev) => [next, ...prev]);
    setDescription("");
    setAmount("");
  };

  const brl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" /> Tesouraria Eclesiástica —{" "}
            {activeSection === "entradas"
              ? "Entradas (Dízimos & Ofertas)"
              : activeSection === "saidas"
              ? "Saídas & Despesas"
              : "Visão Geral"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Controle financeiro vinculado a <strong>{clientName}</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <ArrowUpCircle className="h-4 w-4 text-emerald-600" /> Entradas (Dízimos & Ofertas)
            </CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{brl(totals.income)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <ArrowDownCircle className="h-4 w-4 text-rose-600" /> Saídas / Despesas
            </CardDescription>
            <CardTitle className="text-2xl text-rose-600">{brl(totals.expense)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Wallet className="h-4 w-4 text-primary" /> Saldo em Caixa
            </CardDescription>
            <CardTitle className="text-2xl text-primary">{brl(totals.balance)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo Lançamento Financeiro da Igreja</CardTitle>
          <CardDescription>
            Dados salvos isoladamente no contrato ({contractId}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(v: "entrada" | "saida") => {
                  setType(v);
                  setCategory(v === "entrada" ? "Dízimos" : "Despesa Fixa");
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Dízimos culto domingo"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Lançar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Movimentações ({visibleEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Congregação</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs">{entry.date}</TableCell>
                  <TableCell>
                    <Badge variant={entry.type === "entrada" ? "default" : "destructive"}>
                      {entry.type === "entrada" ? "Entrada" : "Saída"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{entry.category}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{entry.congregation}</TableCell>
                  <TableCell className="text-sm">{entry.description}</TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      entry.type === "entrada" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {entry.type === "saida" ? "- " : "+ "}
                    {brl(entry.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
