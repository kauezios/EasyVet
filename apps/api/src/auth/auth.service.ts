import { AccessRole, User } from '@prisma/client';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  createPasswordHash,
  verifyPassword,
} from '../common/auth/password.util';
import { getAuthSecurityConfig } from '../common/auth/auth-security.config';
import { RequestAuthUser } from '../common/auth/request-auth-user.type';
import { signAuthToken } from '../common/auth/token.util';
import { UserRole } from '../common/auth/user-role.enum';
import { AuditEventsService } from '../audit-events/audit-events.service';
import { PrismaService } from '../prisma/prisma.service';

type AuthUserPayload = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const securityConfig = getAuthSecurityConfig();
    const now = new Date();

    const user = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      await this.auditEvents.register({
        actorId: null,
        entity: 'AUTH',
        entityId: normalizedEmail,
        action: 'LOGIN_FAILED',
        summary: 'Usuario nao encontrado',
      });

      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'E-mail ou senha invalidos',
      });
    }

    if (!user.active) {
      await this.auditEvents.register({
        actorId: user.id,
        entity: 'AUTH',
        entityId: user.id,
        action: 'LOGIN_FAILED',
        summary: 'Usuario inativo',
      });

      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'E-mail ou senha invalidos',
      });
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
      await this.auditEvents.register({
        actorId: user.id,
        entity: 'AUTH',
        entityId: user.id,
        action: 'LOGIN_BLOCKED',
        summary: `Conta bloqueada ate ${user.lockedUntil.toISOString()}`,
      });

      throw new UnauthorizedException({
        code: 'AUTH_ACCOUNT_LOCKED',
        message:
          'Conta temporariamente bloqueada por tentativas de acesso invalidas',
        details: [
          {
            field: 'lockedUntil',
            issue: user.lockedUntil.toISOString(),
          },
        ],
      });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      const nextFailedAttempt = user.failedLoginAttempts + 1;
      const shouldLock =
        nextFailedAttempt >= securityConfig.maxFailedLoginAttempts;
      const lockedUntil = shouldLock
        ? new Date(now.getTime() + securityConfig.loginLockMinutes * 60 * 1000)
        : null;

      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          failedLoginAttempts: shouldLock ? 0 : nextFailedAttempt,
          lockedUntil,
        },
      });

      await this.auditEvents.register({
        actorId: user.id,
        entity: 'AUTH',
        entityId: user.id,
        action: shouldLock ? 'LOGIN_LOCKED' : 'LOGIN_FAILED',
        summary: shouldLock
          ? `Conta bloqueada por ${securityConfig.loginLockMinutes} minutos`
          : `Tentativa invalida ${nextFailedAttempt}/${securityConfig.maxFailedLoginAttempts}`,
      });

      if (shouldLock) {
        throw new UnauthorizedException({
          code: 'AUTH_ACCOUNT_LOCKED',
          message:
            'Conta temporariamente bloqueada por tentativas de acesso invalidas',
          details: [
            {
              field: 'retryAfterMinutes',
              issue: String(securityConfig.loginLockMinutes),
            },
          ],
        });
      }

      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'E-mail ou senha invalidos',
      });
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    await this.auditEvents.register({
      actorId: user.id,
      entity: 'AUTH',
      entityId: user.id,
      action: 'LOGIN_SUCCESS',
      summary: 'Acesso autenticado com sucesso',
    });

    return {
      accessToken: token.accessToken,
      expiresInSeconds: token.expiresInSeconds,
      user: this.toAuthUser(user),
    };
  }

  async me(authUser: RequestAuthUser): Promise<AuthUserPayload> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: authUser.userId,
      },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException({
        code: 'AUTH_USER_INACTIVE',
        message: 'Usuario inativo ou inexistente',
      });
    }

    return this.toAuthUser(user);
  }

  async ensureBootstrapUsers(): Promise<void> {
    const existing = await this.prisma.user.count();
    if (existing > 0) {
      return;
    }

    const passwordHash = createPasswordHash('easyvet123');

    await this.prisma.user.createMany({
      data: [
        {
          name: 'Administrador EasyVet',
          email: 'admin@easyvet.local',
          passwordHash,
          role: AccessRole.ADMIN,
          active: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
        {
          name: 'Veterinario EasyVet',
          email: 'vet@easyvet.local',
          passwordHash,
          role: AccessRole.VETERINARIAN,
          active: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
        {
          name: 'Recepcao EasyVet',
          email: 'recepcao@easyvet.local',
          passwordHash,
          role: AccessRole.RECEPTION,
          active: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      ],
    });
  }

  private toAuthUser(user: User): AuthUserPayload {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      active: user.active,
    };
  }
}
