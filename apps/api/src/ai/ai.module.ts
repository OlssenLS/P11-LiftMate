import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProgramsModule } from '../programs/programs.module.js';
import { NutritionModule } from '../nutrition/nutrition.module.js';
import { AI_PROVIDER } from './provider/ai-provider.interface.js';
import { GeminiAiProvider } from './provider/gemini-ai.provider.js';
import { GroqAiProvider } from './provider/groq-ai.provider.js';
import { CoachContextService } from './coach/coach-context.service.js';
import { CoachService } from './coach/coach.service.js';
import { CoachController } from './coach/coach.controller.js';
import { PlannerService } from './planner/planner.service.js';
import { PlannerController } from './planner/planner.controller.js';
import { AnalyticsService } from './analytics/analytics.service.js';
import { AnalyticsController } from './analytics/analytics.controller.js';
import { AiRateLimiterService } from './ai-rate-limiter.service.js';
import { FoodRecognitionService } from './food/food-recognition.service.js';
import { FoodRecognitionController } from './food/food-recognition.controller.js';

@Module({
  imports: [PrismaModule, ProgramsModule, NutritionModule],
  controllers: [
    CoachController,
    PlannerController,
    AnalyticsController,
    FoodRecognitionController,
  ],
  providers: [
    GeminiAiProvider,
    GroqAiProvider,
    {
      provide: AI_PROVIDER,
      useClass: GroqAiProvider,
    },
    CoachContextService,
    CoachService,
    PlannerService,
    AnalyticsService,
    AiRateLimiterService,
    FoodRecognitionService,
  ],
  exports: [
    AI_PROVIDER,
    GroqAiProvider,
    GeminiAiProvider,
    CoachContextService,
    CoachService,
    PlannerService,
    AnalyticsService,
    AiRateLimiterService,
    FoodRecognitionService,
  ],
})
export class AiModule {}
