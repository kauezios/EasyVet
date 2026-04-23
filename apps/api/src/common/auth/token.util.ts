import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { RequestAuthUser } from './request-auth-user.type';
import { UserRole } from './user-role.enum';

type AuthTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
};

type TokenConfig = {
  secret: string;
  expiresInSeconds: number;
};

const DEFAULT_EXPIRES_IN_SECONDS = 60 * 60 * 8;

function getTokenConfig(): TokenConfig {
  return {
    secret: process.env.AUTH_TOKEN_SECRET ?? 'easyvet-dev-token-secret',
    expiresInSeconds: DEFAULT_EXPIRES_IN_SECONDS,
  };
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf-8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf-8');
}

export function signAuthToken(input: {
  userId: string;
  email: string;
  role: UserRole;
}): { accessToken: string; expiresInSeconds: number } {
  const { secret, expiresInSeconds } = getTokenConfig();
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload: AuthTokenPayload = {
    sub: input.userId,
    email: input.email,
    role: input.role,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signature = createHmac('sha256', secret)
    .update(unsignedToken)
    .digest('base64url');

  return {
    accessToken: `${unsignedToken}.${signature}`,
    expiresInSeconds,
  };
}

export function verifyAuthToken(accessToken: string): RequestAuthUser {
  const { secret } = getTokenConfig();
  const parts = accessToken.split('.');

  if (parts.length !== 3) {
    throw new UnauthorizedException({
      code: 'AUTH_INVALID_TOKEN',
      message: 'Token de acesso invalido',
    });
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac('sha256', secret)
    .update(unsignedToken)
    .digest('base64url');

  if (signature !== expectedSignature) {
    throw new UnauthorizedException({
      code: 'AUTH_INVALID_TOKEN',
      message: 'Assinatura de token invalida',
    });
  }

  const payload = JSON.parse(
    base64UrlDecode(encodedPayload),
  ) as AuthTokenPayload;
  const now = Math.floor(Date.now() / 1000);

  if (!payload.sub || !payload.email || !payload.role) {
    throw new UnauthorizedException({
      code: 'AUTH_INVALID_TOKEN',
      message: 'Token com estrutura invalida',
    });
  }

  if (payload.exp <= now) {
    throw new UnauthorizedException({
      code: 'AUTH_TOKEN_EXPIRED',
      message: 'Token de acesso expirado',
    });
  }

  return {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
    exp: payload.exp,
  };
}
