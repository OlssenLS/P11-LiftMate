import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AI_PROVIDER } from './provider/ai-provider.interface.js';
import { GeminiAiProvider } from './provider/gemini-ai.provider.js';
import { CoachContextService } from './coach/coach-context.service.js';
import { CoachService } from './coach/coach.service.js';
import { CoachController } from './coach/coach.controller.js';
import { AiRateLimiterService } from './ai-rate-limiter.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [CoachController],
  providers: [
    {
      provide: AI_PROVIDER,
      useClass: GeminiAiProvider,
    },
    GeminiAiProvider,
    CoachContextService,
    CoachService,
    AiRateLimiterService,
  ],
  exports: [
    AI_PROVIDER,
    CoachContextService,
    CoachService,
    AiRateLimiterService,
  ],
})
export class AiModule {}
