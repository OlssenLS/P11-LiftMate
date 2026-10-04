import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';
import { onboardingSchema, type OnboardingInput } from '@liftmate/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import type { AuthUser } from '../auth/strategies/jwt-access.strategy.js';
import { OnboardingService } from './onboarding.service.js';

@Controller('onboarding')
@UseGuards(JwtAccessGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(onboardingSchema))
  complete(@CurrentUser() user: AuthUser, @Body() body: OnboardingInput) {
    return this.onboarding.complete(user.id, body);
  }
}
