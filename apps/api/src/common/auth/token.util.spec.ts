import { createPasswordHash, verifyPassword } from './password.util';
import { signAuthToken, verifyAuthToken } from './token.util';
import { UserRole } from './user-role.enum';

describe('Auth utilities', () => {
  it('gera e valida hash de senha', () => {
    const hash = createPasswordHash('easyvet123');

    expect(verifyPassword('easyvet123', hash)).toBe(true);
    expect(verifyPassword('senha-incorreta', hash)).toBe(false);
  });

  it('assina e valida token de acesso', () => {
    const signed = signAuthToken({
      userId: 'user-1',
      email: 'admin@easyvet.local',
      role: UserRole.ADMIN,
    });

    const payload = verifyAuthToken(signed.accessToken);

    expect(payload.userId).toBe('user-1');
    expect(payload.role).toBe(UserRole.ADMIN);
    expect(payload.email).toBe('admin@easyvet.local');
  });

  it('rejeita senha fora da politica minima', () => {
    expect(() => createPasswordHash('1234567')).toThrow(
      'A senha deve ter ao menos',
    );
  });
});
