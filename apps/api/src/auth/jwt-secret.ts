import { ConfigService } from '@nestjs/config';

/**
 * Resolves JWT_SECRET, failing fast if it is unset.
 * Never falls back to a default — an unset secret in production would let
 * anyone forge tokens signed with a publicly known string.
 */
export function requireJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret) {
    throw new Error('JWT_SECRET is not set. Refusing to start with an insecure default.');
  }
  return secret;
}
