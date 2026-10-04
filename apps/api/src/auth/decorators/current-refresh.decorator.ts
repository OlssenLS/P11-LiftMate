import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { RefreshContext } from '../strategies/jwt-refresh.strategy.js';

export const CurrentRefresh = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RefreshContext => {
    const request = ctx.switchToHttp().getRequest<Request & { user: RefreshContext }>();
    return request.user;
  },
);
