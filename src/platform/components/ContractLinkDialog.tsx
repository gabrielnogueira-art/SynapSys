import { useEffect, useState } from "react";
import { Copy, Link2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getModuleById } from "@/platform/catalog";
import {
  contractModulePublicUrl,
  contractPublicUrl,
  normalizeContractSlug,
  usePlatformOrigin,
  validateContractSlug,
} from "@/platform/contractLinks";
import type { PlatformContract } from "@/platform/types";

interface ContractLinkDialogProps {
  contract: PlatformContract | null;
  onClose: () => void;
  onSave: (
    contractId: string,
    patch: Pick<PlatformContract, "slug" | "requireLoginOnEntry">
  ) => Promise<void>;
}

export function ContractLinkDialog({
  contract,
  onClose,
  onSave,
}: ContractLinkDialogProps) {
  const { toast } = useToast();
  const { origin } = usePlatformOrigin();
  const [slug, setSlug] = useState("");
  const [requireLoginOnEntry, setRequireLoginOnEntry] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (contract) {
      setSlug(contract.slug ?? "");
      setRequireLoginOnEntry(contract.requireLoginOnEntry ?? false);
    }
  }, [contract]);

  if (!contract) return null;

  const trimmedSlug = slug.trim();
  let slugError: string | null = null;
  if (trimmedSlug) {
    try {
      validateContractSlug(trimmedSlug);
    } catch (err) {
      slugError = err instanceof Error ? err.message : "Link inválido.";
    }
  }

  const previewTarget = { id: contract.id, slug: trimmedSlug || undefined };
  const portalUrl = contractPublicUrl(previewTarget, false, origin);
  const loginUrl = contractPublicUrl(previewTarget, true, origin);

  const copyUrl = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: `${label} copiado`, description: url });
    } catch {
      toast({ variant: "destructive", title: "Não foi possível copiar", description: url });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const validSlug = trimmedSlug ? validateContractSlug(trimmedSlug) : "";
      await onSave(contract.id, {
        slug: validSlug,
        requireLoginOnEntry,
      });
      toast({ title: "Link do contrato atualizado" });
      onClose();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Não foi possível atualizar o link",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v && !saving) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Editar link de acesso — {contract.code}
          </DialogTitle>
          <DialogDescription>
            Personalize o identificador na URL de <strong>{contract.clientName}</strong> e defina se o acesso exige login imediato.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="edit-contract-slug">Identificador do link (slug)</Label>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSlug(normalizeContractSlug(contract.clientName))}
                >
                  <Sparkles className="h-3 w-3 mr-1" /> Sugerir pelo nome
                </Button>
                {slug && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => setSlug("")}
                  >
                    Usar padrão ({contract.id})
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-muted-foreground shrink-0">
                {origin}/c/
              </span>
              <Input
                id="edit-contract-slug"
                placeholder={contract.id}
                value={slug}
                maxLength={80}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                disabled={saving}
              />
            </div>
            {slugError ? (
              <p className="text-xs text-destructive">{slugError}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Use letras minúsculas, números e hífens (ex.: <code>ad-madureira</code>).
              </p>
            )}
          </div>

          <div className="rounded-lg border p-3 flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <Label htmlFor="edit-contract-require-login" className="text-sm font-medium">
                Solicitar login ao entrar no link
              </Label>
              <p className="text-xs text-muted-foreground">
                Identifica o usuário no login e libera apenas as áreas permitidas para o e-mail dele (ex.: só EBD, só Tesouraria ou só Secretaria).
              </p>
            </div>
            <Switch
              id="edit-contract-require-login"
              checked={requireLoginOnEntry}
              onCheckedChange={setRequireLoginOnEntry}
              disabled={saving}
            />
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Links gerados para este contrato
            </p>
            {[
              { label: "Portal principal", url: portalUrl },
              { label: "Tela de login", url: loginUrl },
              ...contract.activeModules.map((modId) => ({
                label: `Área: ${getModuleById(modId)?.shortName ?? modId}`,
                url: contractModulePublicUrl(previewTarget, modId, origin),
              })),
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-2 text-xs bg-background/70 rounded px-2.5 py-1.5 border"
              >
                <div className="min-w-0">
                  <div className="font-medium text-[11px] text-muted-foreground">{item.label}</div>
                  <code className="text-[11px] font-mono text-foreground break-all">{item.url}</code>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  title={`Copiar ${item.label}`}
                  onClick={() => copyUrl(item.url, item.label)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || Boolean(slugError)}>
              {saving ? "Salvando…" : "Salvar link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
