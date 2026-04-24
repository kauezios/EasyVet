import { BadRequestException } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { getAuthSecurityConfig } from './auth-security.config';

const SCRYPT_KEY_LENGTH = 64;

export function createPasswordHash(password: string): string {
  assertPasswordPolicy(password);
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex');
  return `${salt}.${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split('.');
  if (!salt || !hash) {
    return false;
  }

  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  const expected = Buffer.from(hash, 'hex');

  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}

export function assertPasswordPolicy(password: string): void {
  const { passwordMinLength } = getAuthSecurityConfig();

  if (password.trim().length < passwordMinLength) {
    throw new BadRequestException({
      code: 'AUTH_PASSWORD_POLICY_INVALID',
      message: `A senha deve ter ao menos ${passwordMinLength} caracteres`,
    });
  }
}
