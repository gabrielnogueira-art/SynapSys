import symbol from "@/assets/synapsys-symbol-v2.png.asset.json";
import { cn } from "@/lib/utils";

export const PlatformBrand = ({ className, prominent = false }: { className?: string; prominent?: boolean }) => (
  <div className={cn("flex items-center gap-3", className)}>
    <img src={symbol.url} alt="" onError={(event) => { if (!event.currentTarget.src.endsWith("/favicon.png")) event.currentTarget.src = "/favicon.png"; }} className={cn("object-contain shrink-0", prominent ? "h-16 w-16" : "h-11 w-11")} />
    <div className="min-w-0">
      <div className={cn("font-bold leading-none", prominent ? "text-4xl" : "text-2xl")}>SynapSys</div>
      <p className="mt-2 text-[10px] font-medium text-muted-foreground">SISTEMAS &amp; INTELIGÊNCIA</p>
    </div>
  </div>
);