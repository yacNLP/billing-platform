import type { JwtPayload } from "@/features/auth/types";

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  if (typeof window === "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }

  return window.atob(padded);
}

function isJwtPayload(value: unknown): value is JwtPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.sub === "number" &&
    typeof payload.tenantId === "number" &&
    (payload.role === "ADMIN" || payload.role === "USER") &&
    typeof payload.iat === "number" &&
    typeof payload.exp === "number"
  );
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    const decoded = decodeBase64Url(parts[1]);
    const parsed: unknown = JSON.parse(decoded);

    return isJwtPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
