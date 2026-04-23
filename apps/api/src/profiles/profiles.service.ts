import { Prisma, User } from '@prisma/client';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createPasswordHash } from '../common/auth/password.util';
import { UserRole } from '../common/auth/user-role.enum';
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
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AccessProfile[]> {
    const users = await this.prisma.user.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return users.map((user) => this.toAccessProfile(user));
  }

  async create(dto: CreateProfileDto): Promise<AccessProfile> {
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

      return this.toAccessProfile(created);
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async updateRole(
    id: string,
    dto: UpdateProfileRoleDto,
  ): Promise<AccessProfile> {
    await this.ensureUserExists(id);

    const updated = await this.prisma.user.update({
      where: {
        id,
      },
      data: {
        role: dto.role,
      },
    });

    return this.toAccessProfile(updated);
  }

  private async ensureUserExists(id: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'PROFILE_NOT_FOUND',
        message: 'Perfil nao encontrado',
      });
    }
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
