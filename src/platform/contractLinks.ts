import type { PlatformContract } from "./types";

export const PUBLIC_APP_ORIGIN = "https://ebd-system-pro.lovable.app";

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

export function contractEntryPath(contract: Pick<PlatformContract, "id" | "slug">): string {
  return `/c/${contract.slug || contract.id}`;
}

export function contractPublicUrl(contract: Pick<PlatformContract, "id" | "slug">, login = false): string {
  return `${PUBLIC_APP_ORIGIN}${contractEntryPath(contract)}${login ? "/login" : ""}`;
}

export function shouldRequireEntryLogin(required: boolean | undefined, authenticated: boolean): boolean {
  return required === true && !authenticated;
}