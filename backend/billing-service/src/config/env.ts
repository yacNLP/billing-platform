type EmailMode = 'noop' | 'resend';

const DEV_JWT_SECRET = 'dev-secret';

export function validateRuntimeEnv(): void {
  const emailMode = getEmailMode();

  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  requireEnv('DATABASE_URL');
  requireEnv('CORS_ORIGIN');
  validateProductionJwtSecret();

  if (emailMode === 'resend') {
    requireEnv('RESEND_API_KEY');
    requireEnv('EMAIL_FROM');
  }
}

export function getEmailMode(): EmailMode {
  const mode = process.env.EMAIL_MODE?.trim().toLowerCase() || 'noop';

  if (mode !== 'noop' && mode !== 'resend') {
    throw new Error('EMAIL_MODE must be either "noop" or "resend".');
  }

  return mode;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} must be configured.`);
  }

  return value;
}

function validateProductionJwtSecret(): void {
  const secret = requireEnv('JWT_SECRET');

  if (secret === DEV_JWT_SECRET) {
    throw new Error(
      'JWT_SECRET must be configured with a strong non-dev value in production.',
    );
  }
}
