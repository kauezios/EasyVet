import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { correlationId?: string }>();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const defaultCodeByStatus: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'BUSINESS_RULE_ERROR',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
    };

    let message = 'Erro interno do servidor';
    let code = defaultCodeByStatus[status] ?? 'UNKNOWN_ERROR';
    let details: unknown[] | undefined;

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const candidate = payload as {
          message?: string | string[];
          code?: string;
          details?: unknown[];
          error?: string;
        };

        if (Array.isArray(candidate.message)) {
          message = candidate.message.join(', ');
        } else if (candidate.message) {
          message = candidate.message;
        } else if (candidate.error) {
          message = candidate.error;
        }

        if (candidate.code) {
          code = candidate.code;
        }

        if (candidate.details) {
          details = candidate.details;
        }
      }
    }

    res.status(status).json({
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
      meta: {
        correlationId:
          req.correlationId ?? req.header('x-correlation-id') ?? 'n/a',
      },
    });
  }
}
