import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { USER_ROLE_HEADER, UserRole } from './user-role.enum';

function createContext(roleHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) =>
          name === USER_ROLE_HEADER ? roleHeader : undefined,
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

describe('RolesGuard', () => {
  it('permite quando a rota nao define perfis obrigatorios', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    const guard = new RolesGuard(reflector);
    const allowed = guard.canActivate(createContext());

    expect(allowed).toBe(true);
  });

  it('permite veterinario por padrao quando header nao e enviado', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockImplementation((key: string) =>
          key === ROLES_KEY ? [UserRole.VETERINARIAN] : undefined,
        ),
    } as unknown as Reflector;

    const guard = new RolesGuard(reflector);
    const allowed = guard.canActivate(createContext());

    expect(allowed).toBe(true);
  });

  it('bloqueia perfil sem permissao', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockImplementation((key: string) =>
          key === ROLES_KEY
            ? [UserRole.ADMIN, UserRole.VETERINARIAN]
            : undefined,
        ),
    } as unknown as Reflector;

    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext(UserRole.RECEPTION))).toThrow(
      ForbiddenException,
    );
  });
});
