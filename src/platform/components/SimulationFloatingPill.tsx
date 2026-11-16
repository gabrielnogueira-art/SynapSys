import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, LogOut } from "lucide-react";
import { switchToOwnerMode, useViewerSession } from "@/platform/session";

/**
 * Pill flutuante exibida SOMENTE no modo simulador local quando você está
 * testando a visão restrita de um cliente final, para poder retornar ao Modo Empreendedor.
 */
import { useUserRole } from "@/hooks/useUserRole";

export const SimulationFloatingPill = () => {
  const session = useViewerSession();
  const role = useUserRole();
  const navigate = useNavigate();

  const isClientAccountSignedIn = Boolean(role.role && role.role !== "master");
  if (session.mode !== "client" || isClientAccountSignedIn) return null;

  return (
    <div className="fixed bottom-3 left-3 z-50 flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50/95 px-3 py-1.5 text-xs text-amber-950 shadow-lg backdrop-blur print:hidden">
      <Eye className="h-3.5 w-3.5 text-amber-700 shrink-0" />
      <span className="font-medium max-w-[200px] truncate">
        Visão do Cliente: {session.userName}
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-6 px-2 text-[11px] bg-amber-200/80 hover:bg-amber-300 text-amber-950"
        onClick={() => {
          switchToOwnerMode();
          navigate("/plataforma");
        }}
      >
        <LogOut className="h-3 w-3 mr-1" /> Voltar ao Modo Empreendedor
      </Button>
    </div>
  );
};
