import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyAuthToken } from './token.util';
import { RequestWithAuthUser } from './request-auth-user.type';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithAuthUser>();
    const authorization = request.header('authorization');

    if (!authorization) {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_REQUIRED',
        message: 'Token de acesso obrigatorio',
      });
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_TOKEN',
        message: 'Formato de token invalido. Use Bearer <token>',
      });
    }

    request.authUser = verifyAuthToken(token);
    return true;
  }
}
