import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { USER_ROLE_HEADER, UserRole } from './user-role.enum';

type RequestWithHeaders = {
  header: (name: string) => string | undefined;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const actorRole = this.parseRole(request.header(USER_ROLE_HEADER));

    if (roles.includes(actorRole)) {
      return true;
    }

    throw new ForbiddenException({
      code: 'ROLE_NOT_ALLOWED',
      message: 'Perfil sem permissao para executar esta acao',
      details: [
        {
          field: USER_ROLE_HEADER,
          issue: `required: ${roles.join(', ')}`,
        },
      ],
    });
  }

  private parseRole(value: string | undefined): UserRole {
    if (!value) {
      return UserRole.VETERINARIAN;
    }

    const normalized = value.trim().toUpperCase();

    if ((Object.values(UserRole) as string[]).includes(normalized)) {
      return normalized as UserRole;
    }

    return UserRole.RECEPTION;
  }
}
