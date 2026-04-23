import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import type { Request } from 'express';

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<
  T,
  unknown
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { correlationId?: string }>();

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          correlationId:
            req.correlationId ?? req.header('x-correlation-id') ?? 'n/a',
        },
      })),
    );
  }
}
