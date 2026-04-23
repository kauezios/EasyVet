import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UserRole } from '../common/auth/user-role.enum';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileRoleDto } from './dto/update-profile-role.dto';

export type AccessProfile = {
  id: string;
  name: string;
  email: string | null;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ProfilesService {
  private profiles: AccessProfile[] = [
    {
      id: 'profile-admin',
      name: 'Administrador EasyVet',
      email: 'admin@easyvet.local',
      role: UserRole.ADMIN,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'profile-vet',
      name: 'Veterinario EasyVet',
      email: 'vet@easyvet.local',
      role: UserRole.VETERINARIAN,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'profile-reception',
      name: 'Recepcao EasyVet',
      email: 'recepcao@easyvet.local',
      role: UserRole.RECEPTION,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  list(): AccessProfile[] {
    return [...this.profiles].sort((a, b) => a.name.localeCompare(b.name));
  }

  create(dto: CreateProfileDto): AccessProfile {
    const email = dto.email?.trim().toLowerCase();
    if (email && this.profiles.some((profile) => profile.email === email)) {
      throw new UnprocessableEntityException({
        code: 'PROFILE_EMAIL_ALREADY_EXISTS',
        message: 'Ja existe um perfil com este e-mail',
      });
    }

    const now = new Date().toISOString();
    const created: AccessProfile = {
      id: `profile-${randomUUID()}`,
      name: dto.name.trim(),
      email: email ?? null,
      role: dto.role,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.push(created);
    return created;
  }

  updateRole(id: string, dto: UpdateProfileRoleDto): AccessProfile {
    const profile = this.profiles.find((item) => item.id === id);
    if (!profile) {
      throw new NotFoundException({
        code: 'PROFILE_NOT_FOUND',
        message: 'Perfil nao encontrado',
      });
    }

    profile.role = dto.role;
    profile.updatedAt = new Date().toISOString();
    return profile;
  }
}
