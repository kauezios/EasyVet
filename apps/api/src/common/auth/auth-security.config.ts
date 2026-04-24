const DEFAULT_AUTH_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 8;
const DEFAULT_PASSWORD_MIN_LENGTH = 8;
const DEFAULT_MAX_FAILED_LOGIN_ATTEMPTS = 5;
const DEFAULT_LOGIN_LOCK_MINUTES = 15;

type AuthSecurityConfig = {
  tokenExpiresInSeconds: number;
  passwordMinLength: number;
  maxFailedLoginAttempts: number;
  loginLockMinutes: number;
};

function parseIntegerEnv(
  value: string | undefined,
  fallback: number,
  minValue: number,
  maxValue: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (parsed < minValue || parsed > maxValue) {
    return fallback;
  }

  return parsed;
}

export function getAuthSecurityConfig(): AuthSecurityConfig {
  return {
    tokenExpiresInSeconds: parseIntegerEnv(
      process.env.AUTH_TOKEN_EXPIRES_IN_SECONDS,
      DEFAULT_AUTH_TOKEN_EXPIRES_IN_SECONDS,
      300,
      60 * 60 * 24 * 14,
    ),
    passwordMinLength: parseIntegerEnv(
      process.env.AUTH_PASSWORD_MIN_LENGTH,
      DEFAULT_PASSWORD_MIN_LENGTH,
      8,
      128,
    ),
    maxFailedLoginAttempts: parseIntegerEnv(
      process.env.AUTH_LOGIN_MAX_ATTEMPTS,
      DEFAULT_MAX_FAILED_LOGIN_ATTEMPTS,
      1,
      20,
    ),
    loginLockMinutes: parseIntegerEnv(
      process.env.AUTH_LOGIN_LOCK_MINUTES,
      DEFAULT_LOGIN_LOCK_MINUTES,
      1,
      24 * 60,
    ),
  };
}
