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
  createFoodSchema,
  type CreateFoodInput,
  type Food,
} from '@liftmate/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { FoodsService } from './foods.service.js';

@Controller('foods')
@UseGuards(JwtAccessGuard)
export class FoodsController {
  constructor(private readonly foods: FoodsService) {}

  @Get('search')
  search(
    @Query('q') query?: string,
    @Query('limit') limit?: string,
  ): Promise<Food[]> {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 20;
    return this.foods.search(query, Number.isNaN(parsedLimit) ? 20 : parsedLimit);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createFoodSchema)) body: CreateFoodInput,
  ): Promise<Food> {
    return this.foods.create(body);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string): Promise<Food> {
    return this.foods.getById(id);
  }
}
