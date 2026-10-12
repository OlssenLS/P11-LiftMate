import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../../auth/strategies/jwt-access.strategy.js';
import { AnalyticsService } from './analytics.service.js';
import type {
  AnalyticsOverviewResponse,
  GenerateAnalyticsInput,
} from '@liftmate/shared';

@Controller('ai/analytics')
@UseGuards(JwtAccessGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview(@CurrentUser() user: AuthUser): Promise<AnalyticsOverviewResponse> {
    return this.analyticsService.getOverview(user.id);
  }

  @Get('insights')
  async getInsights(@CurrentUser() user: AuthUser): Promise<AnalyticsOverviewResponse> {
    return this.analyticsService.getOverview(user.id);
  }

  @Post('generate')
  async generateInsights(
    @CurrentUser() user: AuthUser,
    @Body() body?: GenerateAnalyticsInput,
  ): Promise<AnalyticsOverviewResponse> {
    return this.analyticsService.generateInsights(user.id, body?.forceRefresh ?? false);
  }
}
