import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { HttpErrorFilter } from './common/filters/http-error.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
