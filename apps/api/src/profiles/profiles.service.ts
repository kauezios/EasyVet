import {
  AccessRole,
  InactivityPolicySettings,
  Prisma,
  User,
} from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getInactivityPolicyConfig } from '../common/auth/inactivity-policy.config';
import { createPasswordHash } from '../common/auth/password.util';
import { UserRole } from '../common/auth/user-role.enum';
import { AuditEventsService } from '../audit-events/audit-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateInactivityPolicyDto } from './dto/update-inactivity-policy.dto';
import { UpdateProfileActiveDto } from './dto/update-profile-active.dto';
import { UpdateProfileRoleDto } from './dto/update-profile-role.dto';

const DEFAULT_INACTIVITY_POLICY_SETTINGS_ID = 'default';

export type AccessProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InactivityPolicySnapshot = {
  enabled: boolean;
  maxInactiveDays: number;
  excludedRoles: UserRole[];
  cutoffDate: Date;
};

export type InactiveUserCandidate = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  lastLoginAt: Date | null;
  inactiveSince: Date;
};

export type InactivityScanResult = {
  dryRun: boolean;
  policy: InactivityPolicySnapshot;
  evaluatedUsers: number;
  matchedUsers: number;
  updatedUsers: number;
  affectedUsers: InactiveUserCandidate[];
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

  async getInactivityPolicySnapshot(
    referenceDate = new Date(),
  ): Promise<InactivityPolicySnapshot> {
    const settings = await this.getOrCreateInactivityPolicySettings();
    return this.toInactivityPolicySnapshot(settings, referenceDate);
  }

  async updateInactivityPolicy(
    dto: UpdateInactivityPolicyDto,
    actorId?: string,
  ): Promise<InactivityPolicySnapshot> {
    const current = await this.getOrCreateInactivityPolicySettings();
    const nextExcludedRoles = dto.excludedRoles
      ? Array.from(new Set(dto.excludedRoles))
      : (current.excludedRoles as UserRole[]);

    const next = {
      enabled: dto.enabled ?? current.enabled,
      maxInactiveDays: dto.maxInactiveDays ?? current.maxInactiveDays,
      excludedRoles: nextExcludedRoles as AccessRole[],
    };

    const updated = await this.prisma.inactivityPolicySettings.update({
      where: {
        id: DEFAULT_INACTIVITY_POLICY_SETTINGS_ID,
      },
      data: next,
    });

    const excludedRolesChanged = this.roleListChanged(
      current.excludedRoles as UserRole[],
      updated.excludedRoles as UserRole[],
    );

    if (
      current.enabled !== updated.enabled ||
      current.maxInactiveDays !== updated.maxInactiveDays ||
      excludedRolesChanged
    ) {
      await this.auditEvents.register({
        actorId: actorId ?? null,
        entity: 'SYSTEM_POLICY',
        entityId: DEFAULT_INACTIVITY_POLICY_SETTINGS_ID,
        action: 'INACTIVITY_POLICY_UPDATED',
        summary: this.buildInactivityPolicySummary(
          current,
          updated,
          excludedRolesChanged,
        ),
      });
    }

    return this.toInactivityPolicySnapshot(updated, new Date());
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

  async updateActive(
    id: string,
    dto: UpdateProfileActiveDto,
    actorId?: string,
  ): Promise<AccessProfile> {
    if (actorId && actorId === id && dto.active === false) {
      throw new BadRequestException({
        code: 'PROFILE_SELF_DEACTIVATE_NOT_ALLOWED',
        message: 'Nao e permitido inativar o proprio usuario em sessao',
      });
    }

    const existing = await this.ensureUserExists(id);
    if (existing.active === dto.active) {
      return this.toAccessProfile(existing);
    }

    const updated = await this.prisma.user.update({
      where: {
        id,
      },
      data: {
        active: dto.active,
      },
    });

    await this.auditEvents.register({
      actorId: actorId ?? null,
      entity: 'USER',
      entityId: updated.id,
      action: dto.active ? 'PROFILE_ACTIVATED' : 'PROFILE_DEACTIVATED',
      summary: dto.active ? 'Perfil reativado' : 'Perfil inativado',
    });

    return this.toAccessProfile(updated);
  }

  async runInactivityScan(
    input: { dryRun?: boolean },
    actorId?: string,
  ): Promise<InactivityScanResult> {
    const policy = await this.getInactivityPolicySnapshot();
    const dryRun = input.dryRun ?? false;

    const users = await this.prisma.user.findMany({
      where: {
        active: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const candidates = users
      .filter((user) => {
        if (policy.excludedRoles.includes(user.role as UserRole)) {
          return false;
        }

        if (actorId && user.id === actorId) {
          return false;
        }

        const reference = user.lastLoginAt ?? user.createdAt;
        return reference.getTime() <= policy.cutoffDate.getTime();
      })
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        active: user.active,
        lastLoginAt: user.lastLoginAt,
        inactiveSince: user.lastLoginAt ?? user.createdAt,
      }));

    if (dryRun || !policy.enabled || candidates.length === 0) {
      return {
        dryRun,
        policy,
        evaluatedUsers: users.length,
        matchedUsers: candidates.length,
        updatedUsers: 0,
        affectedUsers: candidates,
      };
    }

    for (const candidate of candidates) {
      await this.prisma.user.update({
        where: {
          id: candidate.id,
        },
        data: {
          active: false,
        },
      });

      await this.auditEvents.register({
        actorId: actorId ?? null,
        entity: 'USER',
        entityId: candidate.id,
        action: 'PROFILE_DEACTIVATED_INACTIVITY',
        summary: `Perfil inativado por inatividade superior a ${policy.maxInactiveDays} dia(s)`,
      });
    }

    return {
      dryRun,
      policy,
      evaluatedUsers: users.length,
      matchedUsers: candidates.length,
      updatedUsers: candidates.length,
      affectedUsers: candidates,
    };
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
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async getOrCreateInactivityPolicySettings(): Promise<InactivityPolicySettings> {
    const configDefaults = getInactivityPolicyConfig();

    return this.prisma.inactivityPolicySettings.upsert({
      where: {
        id: DEFAULT_INACTIVITY_POLICY_SETTINGS_ID,
      },
      update: {},
      create: {
        id: DEFAULT_INACTIVITY_POLICY_SETTINGS_ID,
        enabled: configDefaults.enabled,
        maxInactiveDays: configDefaults.maxInactiveDays,
        excludedRoles: configDefaults.excludedRoles,
      },
    });
  }

  private toInactivityPolicySnapshot(
    settings: InactivityPolicySettings,
    referenceDate: Date,
  ): InactivityPolicySnapshot {
    const cutoffDate = new Date(
      referenceDate.getTime() - settings.maxInactiveDays * 24 * 60 * 60 * 1000,
    );

    return {
      enabled: settings.enabled,
      maxInactiveDays: settings.maxInactiveDays,
      excludedRoles: settings.excludedRoles as UserRole[],
      cutoffDate,
    };
  }

  private roleListChanged(current: UserRole[], next: UserRole[]): boolean {
    if (current.length !== next.length) {
      return true;
    }

    const currentSorted = [...current].sort();
    const nextSorted = [...next].sort();
    return currentSorted.some((role, index) => role !== nextSorted[index]);
  }

  private buildInactivityPolicySummary(
    previous: InactivityPolicySettings,
    updated: InactivityPolicySettings,
    excludedRolesChanged: boolean,
  ): string {
    const changes: string[] = [];

    if (previous.enabled !== updated.enabled) {
      changes.push(`politica ${updated.enabled ? 'ativada' : 'desativada'}`);
    }

    if (previous.maxInactiveDays !== updated.maxInactiveDays) {
      changes.push(
        `limite alterado de ${previous.maxInactiveDays} para ${updated.maxInactiveDays} dia(s)`,
      );
    }

    if (excludedRolesChanged) {
      changes.push(
        `roles excluidas: ${(updated.excludedRoles as UserRole[]).join(', ') || 'nenhuma'}`,
      );
    }

    if (changes.length === 0) {
      return 'Politica de inatividade atualizada sem alteracoes efetivas';
    }

    return `Politica de inatividade atualizada: ${changes.join('; ')}`;
  }
}
