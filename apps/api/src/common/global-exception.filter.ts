import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 1. Handled HttpExceptions (e.g. Zod validation, BadRequest, Unauthorized, NotFound, ThrottlerException)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const body =
        typeof res === 'object' && res !== null
          ? { ...res, timestamp: new Date().toISOString(), path: request.url }
          : {
              statusCode: status,
              message: res,
              timestamp: new Date().toISOString(),
              path: request.url,
            };
      response.status(status).json(body);
      return;
    }

    // 2. Prisma specific known request errors
    const err = exception as { code?: string; message?: string; name?: string; stack?: string };
    if (err?.code === 'P2002') {
      this.logger.warn(`Unique constraint violation on ${request.url}`);
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: 'A resource with these details already exists.',
        error: 'Conflict',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    if (err?.code === 'P2003') {
      this.logger.warn(`Foreign key constraint violation on ${request.url}`);
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'A referenced resource does not exist.',
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    if (err?.code === 'P2025') {
      response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'The requested resource was not found.',
        error: 'Not Found',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    // 3. Unhandled Server Exceptions (Sanitize in production to prevent schema/stack leaks)
    this.logger.error(
      `Unhandled exception at ${request.method} ${request.url}: ${err?.message ?? 'Unknown error'}`,
      err?.stack,
    );

    const isProduction = process.env.NODE_ENV === 'production';
    const message = isProduction
      ? 'An unexpected error occurred. Please try again later.'
      : err?.message || 'Internal server error';

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
