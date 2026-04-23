import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { HttpErrorFilter } from '../filters/http-error.filter';
import { ResponseEnvelopeInterceptor } from '../interceptors/response-envelope.interceptor';

export function configureHttpApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');

  app.use(
    (
      req: Request & { correlationId?: string },
      _res: Response,
      next: NextFunction,
    ) => {
      req.correlationId = req.header('x-correlation-id') ?? randomUUID();
      next();
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Campos invalidos na requisicao',
          details: errors.flatMap((error) => {
            const constraints = Object.values(error.constraints ?? {});
            return constraints.map((issue) => ({
              field: error.property,
              issue,
            }));
          }),
        }),
    }),
  );

  app.useGlobalFilters(new HttpErrorFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.enableCors();
}
