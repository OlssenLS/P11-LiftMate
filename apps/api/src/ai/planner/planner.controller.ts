import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  generateProgramInputSchema,
  confirmProgramPlanInputSchema,
  type GenerateProgramInput,
  type ConfirmProgramPlanInput,
  type GeneratedProgramPlan,
  type Program,
} from '@liftmate/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard.js';
import type { AuthUser } from '../../auth/strategies/jwt-access.strategy.js';
import { PlannerService } from './planner.service.js';

@Controller('ai/planner')
@UseGuards(JwtAccessGuard)
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  @Post('generate')
  generate(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(generateProgramInputSchema))
    body: GenerateProgramInput,
  ): Promise<GeneratedProgramPlan> {
    return this.plannerService.generatePlan(user.id, body);
  }

  @Post('confirm')
  confirm(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(confirmProgramPlanInputSchema))
    body: ConfirmProgramPlanInput,
  ): Promise<Program> {
    return this.plannerService.confirmPlan(user.id, body);
  }
}
