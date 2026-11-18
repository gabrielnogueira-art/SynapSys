import { useEffect, useState } from "react";
import type { ModuleId, PlatformContract, ProjectSegment } from "./types";

export const DEFAULT_PUBLIC_APP_ORIGIN = "https://synapsys-group.lovable.app";
export const PUBLIC_APP_ORIGIN = DEFAULT_PUBLIC_APP_ORIGIN;

const ORIGIN_STORAGE_KEY = "synapsys_platform_origin_v1";
const ORIGIN_EVENT = "platform-origin-updated";

export type PlatformOriginMode = "auto" | "manual";

export interface PlatformOriginConfig {
  mode: PlatformOriginMode;
  manualOrigin: string | null;
}

export interface PlatformOriginState extends PlatformOriginConfig {
  origin: string;
  browserOrigin: string | null;
  isEphemeralBrowser: boolean;
}

let cachedConfig: PlatformOriginConfig | null = null;

function readCurrentBrowserOrigin(): string | null {
  if (typeof window === "undefined" || !window.location?.origin) return null;
  const raw = window.location.origin;
  if (!/^https?:\/\//i.test(raw)) return null;
  return raw.replace(/\/+$/, "");
}

export function isEphemeralOrLocalOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    const host = hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "[::1]" ||
      host === "0.0.0.0" ||
      host.endsWith(".local")
    ) {
      return true;
    }
    if (
      host.endsWith(".lovableproject.com") ||
      host.endsWith(".lovableproject-dev.com") ||
      host.endsWith(".gpt-eng.com") ||
      host.endsWith(".gptengineer.run")
    ) {
      return true;
    }
    if (host.endsWith(".lovable.app")) {
      const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
      if (
        new RegExp(`^(?:id-preview(?:-[a-z0-9]+)?|project|live)--${uuid}`, "i").test(host) ||
        new RegExp(`^${uuid}(?=[.-])`, "i").test(host)
      ) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

export function validatePublicAppOrigin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Informe um endereço válido (ex.: https://synapsys-group.lovable.app).");
  }
  if (/^(?:javascript|data|vbscript|file):/i.test(trimmed)) {
    throw new Error("Informe um endereço HTTP ou HTTPS válido.");
  }
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)) {
      throw new Error("Use um endereço iniciado por https:// ou http://.");
    }
    const isLocalHost = /^(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?(?:\/|$)/i.test(candidate);
    candidate = `${isLocalHost ? "http" : "https"}://${candidate}`;
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Informe um endereço válido (ex.: https://synapsys-group.lovable.app).");
  }
  if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || !parsed.hostname) {
    throw new Error("Informe um endereço HTTP ou HTTPS válido.");
  }
  return parsed.origin;
}

export function normalizeOriginConfig(raw: unknown): PlatformOriginConfig {
  if (raw && typeof raw === "object") {
    const obj = raw as { mode?: unknown; manualOrigin?: unknown };
    if (obj.mode === "manual" && typeof obj.manualOrigin === "string") {
      try {
        return { mode: "manual", manualOrigin: validatePublicAppOrigin(obj.manualOrigin) };
      } catch {
        // Fallback to auto if stored manual origin is invalid
      }
    }
  }
  return { mode: "auto", manualOrigin: null };
}

export function getPlatformOriginConfig(): PlatformOriginConfig {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(ORIGIN_STORAGE_KEY);
      if (raw) {
        cachedConfig = normalizeOriginConfig(JSON.parse(raw));
        return cachedConfig;
      }
    } catch {
      // Ignore storage errors and fall back to memory/default
    }
  }
  return cachedConfig ?? { mode: "auto", manualOrigin: null };
}

export function setPlatformOriginConfig(next: PlatformOriginConfig): PlatformOriginConfig {
  const normalized = normalizeOriginConfig(next);
  const previous = getPlatformOriginConfig();
  cachedConfig = normalized;

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(ORIGIN_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Ignore storage errors
    }
  }

  const changed =
    previous.mode !== normalized.mode || previous.manualOrigin !== normalized.manualOrigin;
  if (changed && typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(ORIGIN_EVENT));
  }
  return normalized;
}

export function detectPlatformOrigin(browserOrigin?: string | null): string {
  const current =
    browserOrigin === undefined ? readCurrentBrowserOrigin() : browserOrigin;
  if (!current || !/^https?:\/\//i.test(current)) {
    return DEFAULT_PUBLIC_APP_ORIGIN;
  }
  const normalized = current.replace(/\/+$/, "");
  return isEphemeralOrLocalOrigin(normalized) ? DEFAULT_PUBLIC_APP_ORIGIN : normalized;
}

export function resolvePublicAppOrigin(options?: {
  config?: PlatformOriginConfig;
  browserOrigin?: string | null;
}): string {
  const config = options?.config ?? getPlatformOriginConfig();
  if (config.mode === "manual" && config.manualOrigin) {
    try {
      return validatePublicAppOrigin(config.manualOrigin);
    } catch {
      // Fallback to automatic detection
    }
  }
  return detectPlatformOrigin(options?.browserOrigin);
}

export function getPlatformOriginState(): PlatformOriginState {
  const config = getPlatformOriginConfig();
  const browserOrigin = readCurrentBrowserOrigin();
  const isEphemeralBrowser = browserOrigin ? isEphemeralOrLocalOrigin(browserOrigin) : false;
  return {
    ...config,
    origin: resolvePublicAppOrigin({ config, browserOrigin }),
    browserOrigin,
    isEphemeralBrowser,
  };
}

export function usePlatformOrigin(): PlatformOriginState {
  const [state, setState] = useState<PlatformOriginState>(() => getPlatformOriginState());

  useEffect(() => {
    const sync = () => setState(getPlatformOriginState());
    sync();
    window.addEventListener(ORIGIN_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ORIGIN_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return state;
}

export function normalizeContractSlug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function validateContractSlug(value: string): string {
  const slug = value.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    throw new Error("Use até 80 letras minúsculas, números e hífens no link do cliente.");
  }
  return slug;
}

export const MODULE_ROUTE_SLUGS: Record<ModuleId, string> = {
  igreja_ebd: "ebd",
  igreja_tesouraria: "tesouraria",
  igreja_secretaria: "secretaria",
  igreja_cantina: "cantina",
  igreja_livraria: "livraria",
  igreja_social: "acao-social",
  comercio_tesouraria: "tesouraria",
  comercio_secretaria: "secretaria",
  comercio_estoque: "estoque",
  comercio_rh: "rh",
  comercio_pdv: "pdv",
};

export function moduleRouteSlug(moduleId: ModuleId): string {
  return MODULE_ROUTE_SLUGS[moduleId];
}

export function resolveModuleFromSlug(segment: ProjectSegment, slug: string): ModuleId | null {
  const clean = slug.trim().toLowerCase();
  const prefix = segment === "comercio" ? "comercio_" : "igreja_";
  for (const [modId, routeSlug] of Object.entries(MODULE_ROUTE_SLUGS)) {
    if (modId.startsWith(prefix) && routeSlug === clean) {
      return modId as ModuleId;
    }
  }
  return null;
}

export function contractEntryPath(contract: Pick<PlatformContract, "id" | "slug">): string {
  return `/c/${contract.slug || contract.id}`;
}

export function contractModulePath(
  contract: Pick<PlatformContract, "id" | "slug">,
  moduleId: ModuleId
): string {
  return `${contractEntryPath(contract)}/${moduleRouteSlug(moduleId)}`;
}

export function contractPublicUrl(
  contract: Pick<PlatformContract, "id" | "slug">,
  login = false,
  baseOrigin?: string
): string {
  const origin = baseOrigin ? validatePublicAppOrigin(baseOrigin) : resolvePublicAppOrigin();
  return `${origin}${contractEntryPath(contract)}${login ? "/login" : ""}`;
}

export function contractModulePublicUrl(
  contract: Pick<PlatformContract, "id" | "slug">,
  moduleId: ModuleId,
  baseOrigin?: string
): string {
  const origin = baseOrigin ? validatePublicAppOrigin(baseOrigin) : resolvePublicAppOrigin();
  return `${origin}${contractModulePath(contract, moduleId)}`;
}

export function isModuleAllowed(
  allowedModules: ModuleId[] | null | undefined,
  moduleId: ModuleId
): boolean {
  if (!allowedModules || allowedModules.length === 0) return true;
  return allowedModules.includes(moduleId);
}

export function shouldRequireEntryLogin(required: boolean | undefined, authenticated: boolean): boolean {
  return required === true && !authenticated;
}
