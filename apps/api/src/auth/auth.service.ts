import { AccessRole, User } from '@prisma/client';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  createPasswordHash,
  verifyPassword,
} from '../common/auth/password.util';
import { RequestAuthUser } from '../common/auth/request-auth-user.type';
import { signAuthToken } from '../common/auth/token.util';
import { UserRole } from '../common/auth/user-role.enum';
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
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'E-mail ou senha invalidos',
      });
    }

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
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
        },
        {
          name: 'Veterinario EasyVet',
          email: 'vet@easyvet.local',
          passwordHash,
          role: AccessRole.VETERINARIAN,
          active: true,
        },
        {
          name: 'Recepcao EasyVet',
          email: 'recepcao@easyvet.local',
          passwordHash,
          role: AccessRole.RECEPTION,
          active: true,
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
