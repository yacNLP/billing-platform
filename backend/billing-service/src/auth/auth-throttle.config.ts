type AuthThrottleEnvKey =
  | 'AUTH_LOGIN_LIMIT'
  | 'AUTH_LOGIN_TTL_SECONDS'
  | 'AUTH_SIGNUP_LIMIT'
  | 'AUTH_SIGNUP_TTL_SECONDS'
  | 'AUTH_PASSWORD_RESET_LIMIT'
  | 'AUTH_PASSWORD_RESET_TTL_SECONDS';

export function isAuthThrottleDisabled(): boolean {
  return parseBooleanEnv(process.env.AUTH_THROTTLE_DISABLED, false);
}

export function authThrottleSkipIf(): boolean {
  return isAuthThrottleDisabled();
}

export function resolveAuthThrottleLimit(
  key: AuthThrottleEnvKey,
  fallback: number,
): number {
  return parsePositiveIntegerEnv(process.env[key], fallback);
}

export function resolveAuthThrottleTtlMilliseconds(
  key: AuthThrottleEnvKey,
  fallbackSeconds: number,
): number {
  return parsePositiveIntegerEnv(process.env[key], fallbackSeconds) * 1000;
}

function parseBooleanEnv(
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parsePositiveIntegerEnv(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}
