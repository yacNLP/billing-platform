import { clearStoredAccessToken, getStoredAccessToken } from "@/features/auth/auth-storage";
import { decodeJwtPayload } from "@/features/auth/jwt";
import type { AuthSession } from "@/features/auth/types";

export function buildSessionFromToken(accessToken: string): AuthSession | null {
  const payload = decodeJwtPayload(accessToken);

  if (!payload) {
    return null;
  }

  return {
    accessToken,
    userId: payload.sub,
    tenantId: payload.tenantId,
    role: payload.role,
    expiresAt: payload.exp,
  };
}

export function isSessionValid(session: AuthSession | null): boolean {
  if (!session) {
    return false;
  }

  return session.expiresAt > Math.floor(Date.now() / 1000);
}

export function readStoredSession(): AuthSession | null {
  const accessToken = getStoredAccessToken();

  if (!accessToken) {
    return null;
  }

  const session = buildSessionFromToken(accessToken);

  if (!isSessionValid(session)) {
    clearStoredAccessToken();
    return null;
  }

  return session;
}
