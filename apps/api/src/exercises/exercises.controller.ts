import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { exerciseSearchSchema, type Exercise, type ExerciseSearch } from '@liftmate/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { ExercisesService } from './exercises.service.js';

@Controller('exercises')
@UseGuards(JwtAccessGuard)
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  /** GET /exercises?q=&muscle=&equipment=&difficulty=&limit=&offset= */
  @Get()
  search(
    @Query(new ZodValidationPipe(exerciseSearchSchema)) query: ExerciseSearch,
  ): Promise<Exercise[]> {
    return this.exercises.search(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Exercise> {
    const found = await this.exercises.findById(id);
    if (!found) {
      throw new NotFoundException('Exercise not found');
    }
    return found;
  }
}
