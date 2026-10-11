import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { OnboardingModule } from './onboarding/onboarding.module.js';
import { ExercisesModule } from './exercises/exercises.module.js';
import { WorkoutsModule } from './workouts/workouts.module.js';
import { ProgramsModule } from './programs/programs.module.js';
import { NutritionModule } from './nutrition/nutrition.module.js';
import { ProgressModule } from './progress/progress.module.js';
import { AiModule } from './ai/ai.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),
    PrismaModule,
    UsersModule,
    AuthModule,
    OnboardingModule,
    ExercisesModule,
    WorkoutsModule,
    ProgramsModule,
    NutritionModule,
    ProgressModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
