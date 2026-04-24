import { Prisma, User } from '@prisma/client';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createPasswordHash } from '../common/auth/password.util';
import { UserRole } from '../common/auth/user-role.enum';
import { AuditEventsService } from '../audit-events/audit-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileRoleDto } from './dto/update-profile-role.dto';

export type AccessProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async list(): Promise<AccessProfile[]> {
    const users = await this.prisma.user.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return users.map((user) => this.toAccessProfile(user));
  }

  async create(
    dto: CreateProfileDto,
    actorId?: string,
  ): Promise<AccessProfile> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    try {
      const created = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email: normalizedEmail,
          role: dto.role,
          active: true,
          passwordHash: createPasswordHash(dto.password),
        },
      });

      await this.auditEvents.register({
        actorId: actorId ?? null,
        entity: 'USER',
        entityId: created.id,
        action: 'PROFILE_CREATED',
        summary: `Perfil criado com papel ${created.role}`,
      });

      return this.toAccessProfile(created);
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async updateRole(
    id: string,
    dto: UpdateProfileRoleDto,
    actorId?: string,
  ): Promise<AccessProfile> {
    const existing = await this.ensureUserExists(id);

    const updated = await this.prisma.user.update({
      where: {
        id,
      },
      data: {
        role: dto.role,
      },
    });

    if (existing.role !== updated.role) {
      await this.auditEvents.register({
        actorId: actorId ?? null,
        entity: 'USER',
        entityId: updated.id,
        action: 'ROLE_CHANGED',
        summary: `Papel alterado de ${existing.role} para ${updated.role}`,
      });
    }

    return this.toAccessProfile(updated);
  }

  private async ensureUserExists(id: string): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'PROFILE_NOT_FOUND',
        message: 'Perfil nao encontrado',
      });
    }

    return existing;
  }

  private handleUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: 'PROFILE_EMAIL_ALREADY_EXISTS',
        message: 'Ja existe um perfil com este e-mail',
      });
    }
  }

  private toAccessProfile(user: User): AccessProfile {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
