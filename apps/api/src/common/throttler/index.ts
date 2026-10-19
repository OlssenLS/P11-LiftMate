import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
  type DynamicModule,
  Module,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export interface ThrottlerOptions {
  limit?: number;
  ttl?: number;
  default?: {
    limit: number;
    ttl: number;
  };
}

export const THROTTLER_OPTIONS = 'THROTTLER:OPTIONS';

/**
 * Throttle decorator compatible with @nestjs/throttler syntax.
 */
export function Throttle(options: ThrottlerOptions | Record<string, { limit: number; ttl: number }>) {
  return SetMetadata(THROTTLER_OPTIONS, options);
}

@Injectable()
export class ThrottlerGuard implements CanActivate {
  private static readonly storage = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly reflector?: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const classRef = context.getClass();

    const options =
      this.reflector?.getAllAndOverride<ThrottlerOptions>(THROTTLER_OPTIONS, [
        handler,
        classRef,
      ]) ?? null;

    let limit = 100;
    let ttl = 60000;

    if (options) {
      if ('default' in options && options.default) {
        limit = options.default.limit;
        ttl = options.default.ttl;
      } else if (typeof options.limit === 'number') {
        limit = options.limit;
        ttl = options.ttl ?? 60000;
      }
    }

    const req = context.switchToHttp().getRequest<any>();
    if (!req) return true;

    // Use user ID, forwarded IP, or connection remoteAddress as tracking key
    const tracker =
      req.user?.id ||
      req.headers?.['x-forwarded-for'] ||
      req.ip ||
      req.socket?.remoteAddress ||
      'anonymous';
    const key = `${context.getClass().name}:${context.getHandler().name}:${tracker}`;
    const now = Date.now();

    const record = ThrottlerGuard.storage.get(key);
    if (!record || record.resetAt <= now) {
      ThrottlerGuard.storage.set(key, { count: 1, resetAt: now + ttl });
      return true;
    }

    if (record.count >= limit) {
      throw new HttpException(
        'ThrottlerException: Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count += 1;
    return true;
  }
}

@Module({
  providers: [ThrottlerGuard],
  exports: [ThrottlerGuard],
})
export class ThrottlerModule {
  static forRoot(_options?: any): DynamicModule {
    return {
      module: ThrottlerModule,
      providers: [ThrottlerGuard],
      exports: [ThrottlerGuard],
    };
  }
}
