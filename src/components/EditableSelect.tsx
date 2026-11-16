import { useState } from "react";
import { Check, Pencil, Plus, Settings2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";

export interface EditableSelectProps {
  id?: string;
  label?: string;
  dialogTitle?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onChangeOptions?: (nextOptions: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  canManageOptions?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

const EMPTY_SENTINEL = "__empty__";

export function EditableSelect({
  id,
  label,
  dialogTitle,
  value,
  onChange,
  options,
  onChangeOptions,
  placeholder = "Selecione...",
  disabled = false,
  canManageOptions = true,
  allowEmpty = false,
  emptyLabel = "Nenhum",
}: EditableSelectProps) {
  const { toast } = useToast();
  const [manageOpen, setManageOpen] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  const displayOptions =
    value && !options.includes(value) ? [value, ...options] : options;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onChangeOptions) return;
    const clean = newItem.trim();
    if (!clean) return;
    if (options.some((o) => o.toLowerCase() === clean.toLowerCase())) {
      toast({ variant: "destructive", title: "Esta opção já existe na lista." });
      return;
    }
    const next = [...options, clean];
    onChangeOptions(next);
    onChange(clean);
    setNewItem("");
  };

  const handleSaveEdit = (index: number) => {
    if (!onChangeOptions) return;
    const oldVal = options[index];
    const clean = editingText.trim();
    if (!clean) return;
    if (
      options.some(
        (o, idx) => idx !== index && o.toLowerCase() === clean.toLowerCase()
      )
    ) {
      toast({ variant: "destructive", title: "Já existe uma opção com este nome." });
      return;
    }
    const next = options.map((o, idx) => (idx === index ? clean : o));
    onChangeOptions(next);
    if (value === oldVal) onChange(clean);
    setEditingIndex(null);
    setEditingText("");
  };

  const handleDelete = (index: number) => {
    if (!onChangeOptions) return;
    if (!allowEmpty && options.length <= 1) {
      toast({
        variant: "destructive",
        title: "Mantenha ao menos uma opção cadastrada.",
      });
      return;
    }
    const removed = options[index];
    const next = options.filter((_, idx) => idx !== index);
    onChangeOptions(next);
    if (value === removed) {
      onChange(next[0] ?? "");
    }
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingText("");
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Select
          value={allowEmpty && !value ? EMPTY_SENTINEL : value}
          onValueChange={(v) => onChange(v === EMPTY_SENTINEL ? "" : v)}
          disabled={disabled}
        >
          <SelectTrigger id={id} className="flex-1 min-w-0">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {allowEmpty && <SelectItem value={EMPTY_SENTINEL}>{emptyLabel}</SelectItem>}
            {displayOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canManageOptions && onChangeOptions && !disabled && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="shrink-0 h-10 w-10"
            title={`Adicionar, editar ou remover opções${label ? ` de ${label}` : ""}`}
            onClick={() => {
              setEditingIndex(null);
              setEditingText("");
              setManageOpen(true);
            }}
          >
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogTitle || `Opções: ${label || "Lista selecionável"}`}
            </DialogTitle>
            <DialogDescription>
              Adicione, renomeie ou remova opções. Todas as alterações ficam salvas na base de dados do contrato.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              placeholder="Nova opção..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
            />
            <Button type="submit" size="sm" className="shrink-0">
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </form>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {options.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhuma opção cadastrada.
              </p>
            ) : (
              options.map((opt, idx) => (
                <div
                  key={`${opt}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
                >
                  {editingIndex === idx ? (
                    <>
                      <Input
                        className="h-8 text-sm flex-1"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveEdit(idx);
                          } else if (e.key === "Escape") {
                            setEditingIndex(null);
                          }
                        }}
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Salvar"
                          onClick={() => handleSaveEdit(idx)}
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Cancelar"
                          onClick={() => setEditingIndex(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="truncate flex-1">{opt}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Editar opção"
                          onClick={() => {
                            setEditingIndex(idx);
                            setEditingText(opt);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Excluir opção"
                          onClick={() => handleDelete(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setManageOpen(false)}>
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
