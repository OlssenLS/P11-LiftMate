import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '../../common/throttler/index.js';
import {
  recognizeFoodInputSchema,
  confirmFoodRecognitionInputSchema,
  type RecognizeFoodInput,
  type ConfirmFoodRecognitionInput,
  type RecognizeFoodResponse,
  type FoodLog,
} from '@liftmate/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard.js';
import type { AuthUser } from '../../auth/strategies/jwt-access.strategy.js';
import { FoodRecognitionService } from './food-recognition.service.js';

@Controller('ai/food')
@UseGuards(JwtAccessGuard)
export class FoodRecognitionController {
  constructor(private readonly foodRecognitionService: FoodRecognitionService) {}

  @Post('recognize')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  recognize(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(recognizeFoodInputSchema))
    body: RecognizeFoodInput,
  ): Promise<RecognizeFoodResponse> {
    return this.foodRecognitionService.recognizeFood(user.id, body);
  }

  @Post('confirm')
  confirm(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(confirmFoodRecognitionInputSchema))
    body: ConfirmFoodRecognitionInput,
  ): Promise<FoodLog[]> {
    return this.foodRecognitionService.confirmFood(user.id, body);
  }
}
