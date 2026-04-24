import { AccessRole } from '@prisma/client';
import { ProfilesService } from './profiles.service';

type UserEntity = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AccessRole;
  active: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type InactivityPolicyEntity = {
  id: string;
  enabled: boolean;
  maxInactiveDays: number;
  excludedRoles: AccessRole[];
  createdAt: Date;
  updatedAt: Date;
};

describe('ProfilesService inactivity scan', () => {
  const originalEnv = {
    AUTH_INACTIVITY_ENFORCEMENT_ENABLED:
      process.env.AUTH_INACTIVITY_ENFORCEMENT_ENABLED,
    AUTH_INACTIVITY_DAYS_LIMIT: process.env.AUTH_INACTIVITY_DAYS_LIMIT,
    AUTH_INACTIVITY_EXCLUDED_ROLES: process.env.AUTH_INACTIVITY_EXCLUDED_ROLES,
  };

  beforeEach(() => {
    process.env.AUTH_INACTIVITY_ENFORCEMENT_ENABLED = 'true';
    process.env.AUTH_INACTIVITY_DAYS_LIMIT = '60';
    process.env.AUTH_INACTIVITY_EXCLUDED_ROLES = 'ADMIN';
  });

  afterEach(() => {
    process.env.AUTH_INACTIVITY_ENFORCEMENT_ENABLED =
      originalEnv.AUTH_INACTIVITY_ENFORCEMENT_ENABLED;
    process.env.AUTH_INACTIVITY_DAYS_LIMIT =
      originalEnv.AUTH_INACTIVITY_DAYS_LIMIT;
    process.env.AUTH_INACTIVITY_EXCLUDED_ROLES =
      originalEnv.AUTH_INACTIVITY_EXCLUDED_ROLES;
  });

  function buildUsers(now: Date): UserEntity[] {
    const oldDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const recentDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    return [
      {
        id: 'admin-1',
        name: 'Admin',
        email: 'admin@easyvet.local',
        passwordHash: 'hash',
        role: AccessRole.ADMIN,
        active: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: oldDate,
        createdAt: oldDate,
        updatedAt: oldDate,
      },
      {
        id: 'vet-1',
        name: 'Vet',
        email: 'vet@easyvet.local',
        passwordHash: 'hash',
        role: AccessRole.VETERINARIAN,
        active: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: oldDate,
        createdAt: oldDate,
        updatedAt: oldDate,
      },
      {
        id: 'reception-1',
        name: 'Recepcao',
        email: 'recepcao@easyvet.local',
        passwordHash: 'hash',
        role: AccessRole.RECEPTION,
        active: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: recentDate,
        createdAt: recentDate,
        updatedAt: recentDate,
      },
    ];
  }

  function buildPolicy(now: Date): InactivityPolicyEntity {
    return {
      id: 'default',
      enabled: true,
      maxInactiveDays: 60,
      excludedRoles: [AccessRole.ADMIN],
      createdAt: now,
      updatedAt: now,
    };
  }

  it('retorna candidatos em dry-run sem atualizar usuarios', async () => {
    const now = new Date('2026-04-24T12:00:00.000Z');
    const users = buildUsers(now);
    const policy = buildPolicy(now);

    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue(users),
        update: jest.fn(),
      },
      inactivityPolicySettings: {
        upsert: jest.fn().mockResolvedValue(policy),
        update: jest.fn(),
      },
    };

    const auditEvents = {
      register: jest.fn(),
    };

    const service = new ProfilesService(prisma as never, auditEvents as never);

    const result = await service.runInactivityScan({ dryRun: true }, 'admin-1');

    expect(result.dryRun).toBe(true);
    expect(result.matchedUsers).toBe(1);
    expect(result.updatedUsers).toBe(0);
    expect(result.affectedUsers[0]?.id).toBe('vet-1');
    expect(prisma.inactivityPolicySettings.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(auditEvents.register).not.toHaveBeenCalled();
  });

  it('inativa candidatos quando execucao nao e dry-run', async () => {
    const now = new Date('2026-04-24T12:00:00.000Z');
    const users = buildUsers(now);
    const policy = buildPolicy(now);

    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue(users),
        update: jest.fn().mockResolvedValue(null),
      },
      inactivityPolicySettings: {
        upsert: jest.fn().mockResolvedValue(policy),
        update: jest.fn(),
      },
    };

    const auditEvents = {
      register: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ProfilesService(prisma as never, auditEvents as never);

    const result = await service.runInactivityScan(
      { dryRun: false },
      'admin-1',
    );

    expect(result.dryRun).toBe(false);
    expect(result.matchedUsers).toBe(1);
    expect(result.updatedUsers).toBe(1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: {
        id: 'vet-1',
      },
      data: {
        active: false,
      },
    });

    const [auditPayload] = auditEvents.register.mock.calls[0] as [
      {
        action: string;
        entityId: string;
      },
    ];
    expect(auditPayload.action).toBe('PROFILE_DEACTIVATED_INACTIVITY');
    expect(auditPayload.entityId).toBe('vet-1');
  });

  it('atualiza politica persistida e registra auditoria', async () => {
    const now = new Date('2026-04-24T12:00:00.000Z');
    const currentPolicy = buildPolicy(now);
    const updatedPolicy: InactivityPolicyEntity = {
      ...currentPolicy,
      enabled: false,
      maxInactiveDays: 120,
      excludedRoles: [AccessRole.ADMIN, AccessRole.RECEPTION],
      updatedAt: new Date('2026-04-24T12:30:00.000Z'),
    };

    const prisma = {
      user: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      inactivityPolicySettings: {
        upsert: jest.fn().mockResolvedValue(currentPolicy),
        update: jest.fn().mockResolvedValue(updatedPolicy),
      },
    };

    const auditEvents = {
      register: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ProfilesService(prisma as never, auditEvents as never);

    const result = await service.updateInactivityPolicy(
      {
        enabled: false,
        maxInactiveDays: 120,
        excludedRoles: ['ADMIN', 'RECEPTION'],
      },
      'admin-1',
    );

    expect(result.enabled).toBe(false);
    expect(result.maxInactiveDays).toBe(120);
    expect(result.excludedRoles).toEqual(['ADMIN', 'RECEPTION']);
    expect(prisma.inactivityPolicySettings.update).toHaveBeenCalledWith({
      where: {
        id: 'default',
      },
      data: {
        enabled: false,
        maxInactiveDays: 120,
        excludedRoles: ['ADMIN', 'RECEPTION'],
      },
    });

    const [auditPayload] = auditEvents.register.mock.calls[0] as [
      {
        action: string;
        entity: string;
      },
    ];
    expect(auditPayload.action).toBe('INACTIVITY_POLICY_UPDATED');
    expect(auditPayload.entity).toBe('SYSTEM_POLICY');
  });
});
