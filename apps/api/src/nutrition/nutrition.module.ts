import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { FoodsService } from './foods.service.js';
import { FoodsController } from './foods.controller.js';
import { FoodLogsService } from './food-logs.service.js';
import { FoodLogsController } from './food-logs.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [FoodsController, FoodLogsController],
  providers: [FoodsService, FoodLogsService],
  exports: [FoodsService, FoodLogsService],
})
export class NutritionModule {}
