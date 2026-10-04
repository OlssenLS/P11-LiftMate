import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Headers,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '@liftmate/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CurrentRefresh } from './decorators/current-refresh.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { JwtAccessGuard } from './guards/jwt-access.guard.js';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard.js';
import type { AuthUser } from './strategies/jwt-access.strategy.js';
import type { RefreshContext } from './strategies/jwt-refresh.strategy.js';
import { AuthService } from './auth.service.js';
import { UsersService, toPublicUser } from '../users/users.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  register(@Body() body: RegisterInput, @Headers('user-agent') userAgent?: string) {
    return this.auth.register(body, userAgent);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() body: LoginInput, @Headers('user-agent') userAgent?: string) {
    return this.auth.login(body, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  refresh(@CurrentRefresh() ctx: RefreshContext, @Headers('user-agent') userAgent?: string) {
    return this.auth.refresh(ctx.userId, ctx.jti, ctx.refreshToken, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtRefreshGuard)
  async logout(@CurrentRefresh() ctx: RefreshContext): Promise<void> {
    await this.auth.logout(ctx.userId, ctx.jti);
  }

  @Get('me')
  @UseGuards(JwtAccessGuard)
  async me(@CurrentUser() user: AuthUser) {
    const found = await this.users.findById(user.id);
    return found ? toPublicUser(found) : null;
  }
}
