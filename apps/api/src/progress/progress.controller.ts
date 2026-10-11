import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createBodyWeightLogSchema,
  type BodyWeightLog,
  type CreateBodyWeightLogInput,
  type WeightProgressSummary,
  type ExerciseStrengthProgress,
  type VolumeProgressSummary,
  type ConsistencyProgressSummary,
  type ProgressOverview,
} from '@liftmate/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import type { AuthUser } from '../auth/strategies/jwt-access.strategy.js';
import { ProgressService } from './progress.service.js';

@Controller('progress')
@UseGuards(JwtAccessGuard)
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: AuthUser): Promise<ProgressOverview> {
    return this.progress.getSummary(user.id);
  }

  @Get('weight')
  getWeightProgress(@CurrentUser() user: AuthUser): Promise<WeightProgressSummary> {
    return this.progress.getWeightProgress(user.id);
  }

  @Post('weight')
  logWeight(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createBodyWeightLogSchema)) body: CreateBodyWeightLogInput,
  ): Promise<BodyWeightLog> {
    return this.progress.logWeight(user.id, body);
  }

  @Get('strength/:exerciseId')
  getStrengthProgress(
    @CurrentUser() user: AuthUser,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ): Promise<ExerciseStrengthProgress> {
    return this.progress.getStrengthProgress(user.id, exerciseId);
  }

  @Get('volume')
  getVolumeProgress(
    @CurrentUser() user: AuthUser,
    @Query('range') range?: 'week' | 'month',
  ): Promise<VolumeProgressSummary> {
    return this.progress.getVolumeProgress(user.id, range === 'month' ? 'month' : 'week');
  }

  @Get('consistency')
  getConsistencyProgress(@CurrentUser() user: AuthUser): Promise<ConsistencyProgressSummary> {
    return this.progress.getConsistencyProgress(user.id);
  }
}
