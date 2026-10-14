import { HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GlobalExceptionFilter } from './global-exception.filter.js';

describe('GlobalExceptionFilter', () => {
  const createMockHost = (url = '/test', method = 'GET') => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const response = { status, json };
    const request = { url, method };

    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
        getNext: vi.fn(),
      }),
      getArgs: vi.fn(),
      getArgByIndex: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
      getType: vi.fn(),
    } as unknown as ArgumentsHost;

    return { host, response, status, json, request };
  };

  it('formats HttpException with timestamp and path', () => {
    const filter = new GlobalExceptionFilter();
    const { host, status, json } = createMockHost('/auth/login', 'POST');

    const exception = new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid credentials',
        path: '/auth/login',
      }),
    );
  });

  it('translates Prisma P2002 to 409 Conflict', () => {
    const filter = new GlobalExceptionFilter();
    const { host, status, json } = createMockHost('/auth/register', 'POST');

    const prismaError = { code: 'P2002', message: 'Unique constraint failed on field email' };
    filter.catch(prismaError, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'A resource with these details already exists.',
      }),
    );
  });

  it('translates Prisma P2003 to 400 Bad Request', () => {
    const filter = new GlobalExceptionFilter();
    const { host, status, json } = createMockHost('/workouts', 'POST');

    const prismaError = {
      code: 'P2003',
      message: 'Foreign key constraint violated on the constraint: workout_exercises_exercise_id_fkey',
    };
    filter.catch(prismaError, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'A referenced resource does not exist.',
      }),
    );
  });

  it('translates Prisma P2025 to 404 Not Found', () => {
    const filter = new GlobalExceptionFilter();
    const { host, status, json } = createMockHost('/workouts/123', 'GET');

    const prismaError = { code: 'P2025', message: 'Record not found' };
    filter.catch(prismaError, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
      }),
    );
  });

  it('sanitizes unexpected errors as 500 Internal Server Error', () => {
    const filter = new GlobalExceptionFilter();
    const { host, status, json } = createMockHost('/some/crash', 'GET');

    const error = new Error('Database connection failed or secrets leaked');
    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
      }),
    );
  });
});
