import { AccessRole } from '@prisma/client';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { createPasswordHash } from '../common/auth/password.util';

type AuthUserEntity = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AccessRole;
  active: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

describe('AuthService hardening', () => {
  const originalEnv = {
    AUTH_LOGIN_MAX_ATTEMPTS: process.env.AUTH_LOGIN_MAX_ATTEMPTS,
    AUTH_LOGIN_LOCK_MINUTES: process.env.AUTH_LOGIN_LOCK_MINUTES,
  };

  beforeEach(() => {
    process.env.AUTH_LOGIN_MAX_ATTEMPTS = '3';
    process.env.AUTH_LOGIN_LOCK_MINUTES = '10';
  });

  afterEach(() => {
    process.env.AUTH_LOGIN_MAX_ATTEMPTS = originalEnv.AUTH_LOGIN_MAX_ATTEMPTS;
    process.env.AUTH_LOGIN_LOCK_MINUTES = originalEnv.AUTH_LOGIN_LOCK_MINUTES;
  });

  it('bloqueia conta ao atingir limite de tentativas invalidas', async () => {
    const user: AuthUserEntity = {
      id: 'user-1',
      name: 'Admin EasyVet',
      email: 'admin@easyvet.local',
      passwordHash: createPasswordHash('senha-correta-123'),
      role: AccessRole.ADMIN,
      active: true,
      failedLoginAttempts: 2,
      lockedUntil: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(null),
      },
    };

    const auditEvents = {
      register: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AuthService(prisma as never, auditEvents as never);

    let capturedError: unknown;
    try {
      await service.login('admin@easyvet.local', 'senha-incorreta');
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(UnauthorizedException);
    if (!(capturedError instanceof UnauthorizedException)) {
      return;
    }

    const response = capturedError.getResponse() as {
      code?: string;
    };
    expect(response.code).toBe('AUTH_ACCOUNT_LOCKED');

    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const [updatePayload] = prisma.user.update.mock.calls[0] as [
      {
        where: {
          id: string;
        };
        data: {
          failedLoginAttempts: number;
          lockedUntil: Date | null;
        };
      },
    ];

    expect(updatePayload.where.id).toBe('user-1');
    expect(updatePayload.data.failedLoginAttempts).toBe(0);
    expect(updatePayload.data.lockedUntil).toBeInstanceOf(Date);
    expect(auditEvents.register).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN_LOCKED',
      }),
    );
  });

  it('reseta contador de tentativas apos login bem-sucedido', async () => {
    const user: AuthUserEntity = {
      id: 'user-1',
      name: 'Admin EasyVet',
      email: 'admin@easyvet.local',
      passwordHash: createPasswordHash('senha-correta-123'),
      role: AccessRole.ADMIN,
      active: true,
      failedLoginAttempts: 2,
      lockedUntil: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(null),
      },
    };

    const auditEvents = {
      register: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AuthService(prisma as never, auditEvents as never);

    const result = await service.login(
      'admin@easyvet.local',
      'senha-correta-123',
    );

    expect(result.user.email).toBe('admin@easyvet.local');
    expect(result.accessToken).toBeTruthy();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
      },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    expect(auditEvents.register).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN_SUCCESS',
      }),
    );
  });
});
