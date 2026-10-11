import { Module } from '@nestjs/common';
import { ProgramsController } from './programs.controller.js';
import { ProgramsService } from './programs.service.js';
import { WorkoutsModule } from '../workouts/workouts.module.js';

@Module({
  imports: [WorkoutsModule],
  controllers: [ProgramsController],
  providers: [ProgramsService],
  exports: [ProgramsService],
})
export class ProgramsModule {}
