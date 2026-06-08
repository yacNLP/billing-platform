const DEV_JWT_SECRET = 'dev-secret';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret === DEV_JWT_SECRET) {
      throw new Error(
        'JWT_SECRET must be configured with a strong non-dev value in production.',
      );
    }
  }

  return secret || DEV_JWT_SECRET;
}
