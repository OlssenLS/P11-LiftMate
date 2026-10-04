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
  createWorkoutSchema,
  updateWorkoutSchema,
  upsertWorkoutExerciseSchema,
  upsertWorkoutSetSchema,
  type CreateWorkoutInput,
  type UpdateWorkoutInput,
  type UpsertWorkoutExerciseInput,
  type UpsertWorkoutSetInput,
  type Workout,
  type WorkoutSummary,
} from '@liftmate/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import type { AuthUser } from '../auth/strategies/jwt-access.strategy.js';
import { WorkoutsService } from './workouts.service.js';

@Controller('workouts')
@UseGuards(JwtAccessGuard)
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<Workout[]> {
    return this.workouts.list(user.id);
  }

  /** "Previous session" for an exercise: GET /workouts/previous?exerciseId=&exclude= */
  @Get('previous')
  previous(
    @CurrentUser() user: AuthUser,
    @Query('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Query('exclude') exclude?: string,
  ): Promise<Workout | null> {
    return this.workouts.previousSession(user.id, exerciseId, exclude || undefined);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createWorkoutSchema)) body: CreateWorkoutInput,
  ): Promise<Workout> {
    return this.workouts.create(user.id, body);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Workout> {
    return this.workouts.getById(user.id, id);
  }

  @Get(':id/summary')
  summary(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkoutSummary> {
    return this.workouts.summary(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateWorkoutSchema)) body: UpdateWorkoutInput,
  ): Promise<Workout> {
    return this.workouts.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.workouts.softDelete(user.id, id);
  }

  @Post(':id/exercises')
  upsertExercise(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(upsertWorkoutExerciseSchema)) body: UpsertWorkoutExerciseInput,
  ): Promise<Workout> {
    return this.workouts.upsertExercise(user.id, id, body);
  }

  @Delete(':id/exercises/:exerciseRowId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeExercise(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('exerciseRowId', ParseUUIDPipe) exerciseRowId: string,
  ): Promise<void> {
    await this.workouts.deleteExercise(user.id, id, exerciseRowId);
  }

  @Post(':id/exercises/:exerciseRowId/sets')
  upsertSet(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('exerciseRowId', ParseUUIDPipe) exerciseRowId: string,
    @Body(new ZodValidationPipe(upsertWorkoutSetSchema)) body: UpsertWorkoutSetInput,
  ): Promise<Workout> {
    return this.workouts.upsertSet(user.id, id, exerciseRowId, body);
  }

  @Delete(':id/sets/:setId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSet(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('setId', ParseUUIDPipe) setId: string,
  ): Promise<void> {
    await this.workouts.deleteSet(user.id, id, setId);
  }
}
