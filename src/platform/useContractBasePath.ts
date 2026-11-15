import { useLocation } from "react-router-dom";

/**
 * Detecta se a navegação atual está dentro de um contrato (/c/:contractId).
 * Se estiver, retorna `/c/:contractId` para manter o usuário no contexto do contrato;
 * caso contrário, retorna string vazia (rotas diretas de produção) ou fallback.
 */
export function useContractBasePath() {
  const { pathname } = useLocation();
  const match = pathname.match(/^\/c\/([^/]+)/);
  const contractId = match ? match[1] : null;
  const basePath = contractId ? `/c/${contractId}` : "";

  const resolve = (subpath: string) => {
    const normalized = subpath.startsWith("/") ? subpath : `/${subpath}`;
    if (basePath) {
      return normalized === "/" ? basePath : `${basePath}${normalized}`;
    }
    return normalized === "/" ? "/ebd" : normalized;
  };

  return { contractId, basePath, resolve };
}
