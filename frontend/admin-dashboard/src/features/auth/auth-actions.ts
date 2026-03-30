"use client";

import type { AppDispatch } from "@/store";
import { baseApi } from "@/store/api/base-api";
import { clearStoredAccessToken, persistAccessToken } from "@/features/auth/auth-storage";
import { clearSession, finishAuthBootstrap, setSession } from "@/features/auth/auth-slice";
import { readStoredSession } from "@/features/auth/session";
import type { AuthSession } from "@/features/auth/types";

export function applyAuthenticatedSession(
  dispatch: AppDispatch,
  session: AuthSession,
): void {
  persistAccessToken(session.accessToken);
  dispatch(setSession(session));
}

export function bootstrapAuthSession(dispatch: AppDispatch): void {
  const session = readStoredSession();

  if (session) {
    dispatch(setSession(session));
    return;
  }

  dispatch(finishAuthBootstrap());
}

export function logout(dispatch: AppDispatch): void {
  clearStoredAccessToken();
  dispatch(clearSession());
  dispatch(baseApi.util.resetApiState());
}
