import { useEffect, useState } from "react";
import { Globe, Link2, RotateCcw } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_PUBLIC_APP_ORIGIN,
  detectPlatformOrigin,
  type PlatformOriginConfig,
  type PlatformOriginMode,
  usePlatformOrigin,
  validatePublicAppOrigin,
} from "@/platform/contractLinks";

interface PlatformOriginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sampleEntryPath?: string;
  onSave: (config: PlatformOriginConfig) => Promise<void>;
}

export function PlatformOriginDialog({
  open,
  onOpenChange,
  sampleEntryPath = "/c/ctr-001-ebd-exemplo",
  onSave,
}: PlatformOriginDialogProps) {
  const { toast } = useToast();
  const originState = usePlatformOrigin();
  const [mode, setMode] = useState<PlatformOriginMode>(originState.mode);
  const [manualOrigin, setManualOrigin] = useState(
    originState.manualOrigin || originState.origin || DEFAULT_PUBLIC_APP_ORIGIN
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(originState.mode);
      setManualOrigin(
        originState.manualOrigin || originState.origin || DEFAULT_PUBLIC_APP_ORIGIN
      );
    }
  }, [open, originState.mode, originState.manualOrigin, originState.origin]);

  let previewError: string | null = null;
  let previewOrigin = detectPlatformOrigin(originState.browserOrigin);
  if (mode === "manual") {
    try {
      previewOrigin = validatePublicAppOrigin(manualOrigin);
    } catch (err) {
      previewError = err instanceof Error ? err.message : "Endereço inválido.";
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const next: PlatformOriginConfig =
        mode === "manual"
          ? { mode: "manual", manualOrigin: validatePublicAppOrigin(manualOrigin) }
          : { mode: "auto", manualOrigin: null };
      await onSave(next);
      toast({
        title: "Link base atualizado",
        description:
          next.mode === "manual"
            ? `Os links dos clientes agora usam ${next.manualOrigin}.`
            : `Modo automático ativo (${previewOrigin}).`,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Não foi possível salvar o link base",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Link base da plataforma
          </DialogTitle>
          <DialogDescription>
            Defina se o endereço usado nos links de clientes acompanha o domínio atual da plataforma ou se usa um link fixo informado manualmente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => setMode("auto")}
              className={`w-full rounded-lg border p-3 text-left transition-all ${
                mode === "auto"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">Automático (seguir link da plataforma)</span>
                <Badge variant={mode === "auto" ? "default" : "outline"} className="text-[11px]">
                  Recomendado
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Adapta automaticamente sempre que a plataforma mudar de domínio. Em ambiente local ou preview, utiliza {DEFAULT_PUBLIC_APP_ORIGIN}.
              </p>
              {originState.browserOrigin && (
                <p className="text-[11px] font-mono text-primary mt-1.5 break-all">
                  {originState.isEphemeralBrowser
                    ? `Aba atual (${originState.browserOrigin}) é preview/local → ${DEFAULT_PUBLIC_APP_ORIGIN}`
                    : `Detectado agora: ${originState.browserOrigin}`}
                </p>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`w-full rounded-lg border p-3 text-left transition-all ${
                mode === "manual"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">Manual (definir endereço fixo)</span>
                <Badge variant={mode === "manual" ? "secondary" : "outline"} className="text-[11px]">
                  Personalizado
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Força um domínio específico para todos os links gerados e copiados na plataforma.
              </p>
            </button>
          </div>

          {mode === "manual" && (
            <div className="space-y-2">
              <Label htmlFor="platform-origin-input">Endereço base (URL)</Label>
              <Input
                id="platform-origin-input"
                type="text"
                inputMode="url"
                placeholder={DEFAULT_PUBLIC_APP_ORIGIN}
                value={manualOrigin}
                onChange={(e) => setManualOrigin(e.target.value)}
                disabled={saving}
                required
              />
              <div className="flex flex-wrap gap-2">
                {originState.browserOrigin && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={saving}
                    onClick={() => setManualOrigin(originState.browserOrigin!)}
                  >
                    Usar URL desta aba
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={saving}
                  onClick={() => setManualOrigin(DEFAULT_PUBLIC_APP_ORIGIN)}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Usar padrão SynapSys
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-md border bg-muted/40 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Link2 className="h-3.5 w-3.5 text-primary" />
              Prévia do link gerado
            </div>
            {previewError ? (
              <p className="text-xs text-destructive">{previewError}</p>
            ) : (
              <code className="block text-xs font-mono text-foreground break-all">
                {previewOrigin}
                {sampleEntryPath}
              </code>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || Boolean(previewError)}>
              {saving ? "Salvando…" : "Salvar configuração"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
