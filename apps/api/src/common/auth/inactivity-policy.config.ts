import { UserRole } from './user-role.enum';

type InactivityPolicyConfig = {
  enabled: boolean;
  maxInactiveDays: number;
  excludedRoles: UserRole[];
};

const DEFAULT_MAX_INACTIVE_DAYS = 90;
const DEFAULT_EXCLUDED_ROLES: UserRole[] = [UserRole.ADMIN];

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return fallback;
}

function parseMaxInactiveDays(value: string | undefined): number {
  if (!value) {
    return DEFAULT_MAX_INACTIVE_DAYS;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_MAX_INACTIVE_DAYS;
  }

  return Math.min(3650, Math.max(1, parsed));
}

function parseExcludedRoles(value: string | undefined): UserRole[] {
  if (!value) {
    return DEFAULT_EXCLUDED_ROLES;
  }

  const parsed = value
    .split(',')
    .map((entry) => entry.trim().toUpperCase())
    .filter((entry) => (Object.values(UserRole) as string[]).includes(entry))
    .map((entry) => entry as UserRole);

  if (parsed.length === 0) {
    return DEFAULT_EXCLUDED_ROLES;
  }

  return Array.from(new Set(parsed));
}

export function getInactivityPolicyConfig(): InactivityPolicyConfig {
  return {
    enabled: parseBoolean(
      process.env.AUTH_INACTIVITY_ENFORCEMENT_ENABLED,
      true,
    ),
    maxInactiveDays: parseMaxInactiveDays(
      process.env.AUTH_INACTIVITY_DAYS_LIMIT,
    ),
    excludedRoles: parseExcludedRoles(
      process.env.AUTH_INACTIVITY_EXCLUDED_ROLES,
    ),
  };
}
