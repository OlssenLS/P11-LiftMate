import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createProgramSchema,
  type CreateProgramInput,
  type Program,
  type ProgramStatus,
  type Workout,
} from '@liftmate/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import type { AuthUser } from '../auth/strategies/jwt-access.strategy.js';
import { ProgramsService } from './programs.service.js';
import type { StarterTemplate } from './templates/starter-templates.js';

@Controller('programs')
@UseGuards(JwtAccessGuard)
export class ProgramsController {
  constructor(private readonly programs: ProgramsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: ProgramStatus,
  ): Promise<Program[]> {
    return this.programs.list(user.id, status);
  }

  @Get('current')
  current(@CurrentUser() user: AuthUser): Promise<Program | null> {
    return this.programs.getCurrent(user.id);
  }

  @Get('templates')
  templates(): StarterTemplate[] {
    return this.programs.getTemplates();
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createProgramSchema)) body: CreateProgramInput,
  ): Promise<Program> {
    return this.programs.create(user.id, body);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Program> {
    return this.programs.getById(user.id, id);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  activate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Program> {
    return this.programs.activate(user.id, id);
  }

  @Post(':id/start-day/:day')
  startDay(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('day', ParseIntPipe) day: number,
  ): Promise<Workout> {
    return this.programs.startProgramDay(user.id, id, day);
  }
}
