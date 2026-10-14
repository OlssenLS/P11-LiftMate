import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  createAiConversationSchema,
  sendAiMessageSchema,
  type CreateAiConversationInput,
  type SendAiMessageInput,
  type AiConversation,
  type AiConversationDetail,
  type SuggestedQuestionsResponse,
  type AiCoachStatus,
} from '@liftmate/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard.js';
import type { AuthUser } from '../../auth/strategies/jwt-access.strategy.js';
import { CoachService } from './coach.service.js';

@Controller('ai/coach')
@UseGuards(JwtAccessGuard)
export class CoachController {
  constructor(private readonly coachService: CoachService) {}

  @Get('status')
  getStatus(@CurrentUser() user: AuthUser): Promise<AiCoachStatus> {
    return this.coachService.getCoachStatus(user.id);
  }

  @Get('conversations')
  getConversations(@CurrentUser() user: AuthUser): Promise<AiConversation[]> {
    return this.coachService.getConversations(user.id);
  }

  @Get('active')
  getActiveConversation(
    @CurrentUser() user: AuthUser,
  ): Promise<AiConversationDetail> {
    return this.coachService.getOrCreateActiveConversation(user.id);
  }

  @Post('conversations')
  createConversation(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createAiConversationSchema))
    body: CreateAiConversationInput,
  ): Promise<AiConversationDetail> {
    return this.coachService.createConversation(user.id, body);
  }

  @Get('conversations/:id')
  getConversation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AiConversationDetail> {
    return this.coachService.getConversation(user.id, id);
  }

  @Post('conversations/:id/messages')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(sendAiMessageSchema))
    body: SendAiMessageInput,
  ) {
    return this.coachService.sendMessage(user.id, id, body);
  }

  @Get('suggested-questions')
  getSuggestedQuestions(
    @CurrentUser() user: AuthUser,
  ): Promise<SuggestedQuestionsResponse> {
    return this.coachService.getSuggestedQuestions(user.id);
  }
}
