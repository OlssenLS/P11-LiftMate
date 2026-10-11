import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createFoodLogSchema,
  updateFoodLogSchema,
  type CreateFoodLogInput,
  type UpdateFoodLogInput,
  type FoodLog,
  type DailyNutritionSummary,
} from '@liftmate/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import type { AuthUser } from '../auth/strategies/jwt-access.strategy.js';
import { FoodLogsService } from './food-logs.service.js';

@Controller('food-logs')
@UseGuards(JwtAccessGuard)
export class FoodLogsController {
  constructor(private readonly foodLogs: FoodLogsService) {}

  @Get()
  getDailySummary(
    @CurrentUser() user: AuthUser,
    @Query('date') date?: string,
  ): Promise<DailyNutritionSummary> {
    return this.foodLogs.getDailySummary(user.id, date);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createFoodLogSchema)) body: CreateFoodLogInput,
  ): Promise<FoodLog> {
    return this.foodLogs.create(user.id, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateFoodLogSchema)) body: UpdateFoodLogInput,
  ): Promise<FoodLog> {
    return this.foodLogs.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean }> {
    return this.foodLogs.delete(user.id, id);
  }
}
