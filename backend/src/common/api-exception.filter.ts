import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const exceptionBody =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const code = this.errorCode(status, exceptionBody);
    const message =
      status >= 500
        ? 'An unexpected error occurred'
        : this.messageFrom(exceptionBody);
    const details = this.detailsFrom(exceptionBody);

    if (status === 429) {
      response.setHeader('Retry-After', '60');
    }
    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        ...(details.length > 0 ? { details } : {}),
        statusCode: status,
      },
      path: request.path,
      timestamp: new Date().toISOString(),
    });
  }

  private errorCode(status: number, body: unknown): ErrorCode {
    switch (status) {
      case 400:
        return this.detailsFrom(body).length > 0
          ? 'VALIDATION_ERROR'
          : 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 429:
        return 'TOO_MANY_REQUESTS';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      default:
        return status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST';
    }
  }

  private messageFrom(body: unknown): string {
    if (typeof body === 'string') {
      return body;
    }
    if (body && typeof body === 'object' && 'message' in body) {
      const message = body.message;
      if (typeof message === 'string') {
        return message;
      }
      if (Array.isArray(message)) {
        return 'Request validation failed';
      }
    }
    return 'Request failed';
  }

  private detailsFrom(body: unknown): string[] {
    if (!body || typeof body !== 'object' || !('message' in body)) {
      return [];
    }
    return Array.isArray(body.message)
      ? body.message.filter(
          (value): value is string => typeof value === 'string',
        )
      : [];
  }
}
