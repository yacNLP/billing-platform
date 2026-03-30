const AUTH_TOKEN_STORAGE_KEY = "admin-dashboard.access-token";

const isBrowser = () => typeof window !== "undefined";

export function getStoredAccessToken(): string | null {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function persistAccessToken(token: string): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearStoredAccessToken(): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}
