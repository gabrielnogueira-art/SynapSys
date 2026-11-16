import { useLocation } from "react-router-dom";
import { getContractById } from "./store";

/**
 * Detecta se a navegação atual está dentro de um contrato (/c/:contractId).
 * Se estiver, retorna `/c/:contractId` para manter o usuário no contexto do contrato;
 * caso contrário, retorna string vazia (rotas diretas de produção) ou fallback.
 */
export function useContractBasePath() {
  const { pathname } = useLocation();
  const match = pathname.match(/^\/c\/([^/]+)/);
  const linkId = match ? match[1] : null;
  const contractId = linkId ? getContractById(linkId)?.id ?? linkId : null;
  const basePath = linkId ? `/c/${linkId}` : "";

  const resolve = (subpath: string) => {
    const normalized = subpath.startsWith("/") ? subpath : `/${subpath}`;
    if (basePath) {
      return normalized === "/" ? basePath : `${basePath}${normalized}`;
    }
    return normalized === "/" ? "/ebd" : normalized;
  };

  return { contractId, basePath, resolve, isInsideContract: Boolean(linkId) };
}
