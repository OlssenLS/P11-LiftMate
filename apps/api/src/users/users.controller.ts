import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  changePasswordSchema,
  updateUserEquipmentSchema,
  updateUserPreferencesSchema,
  updateUserSchema,
  type ChangePasswordInput,
  type Equipment,
  type PublicUser,
  type UpdateUserEquipmentInput,
  type UpdateUserInput,
  type UpdateUserPreferencesInput,
  type UserPreferences,
} from '@liftmate/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import type { AuthUser } from '../auth/strategies/jwt-access.strategy.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { toPublicUser, UsersService } from './users.service.js';

@Controller('users')
@UseGuards(JwtAccessGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthUser): Promise<PublicUser> {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput
  ): Promise<PublicUser> {
    const updated = await this.usersService.update(user.id, body);
    return toPublicUser(updated);
  }

  @Get('me/preferences')
  getPreferences(@CurrentUser() user: AuthUser): Promise<UserPreferences | null> {
    return this.usersService.getPreferences(user.id);
  }

  @Patch('me/preferences')
  updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateUserPreferencesSchema)) body: UpdateUserPreferencesInput
  ): Promise<UserPreferences> {
    return this.usersService.updatePreferences(user.id, body);
  }

  @Get('me/equipment')
  async getEquipment(@CurrentUser() user: AuthUser): Promise<{ equipment: Equipment[] }> {
    const equipment = await this.usersService.getEquipment(user.id);
    return { equipment };
  }

  @Put('me/equipment')
  async updateEquipment(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateUserEquipmentSchema)) body: UpdateUserEquipmentInput
  ): Promise<{ equipment: Equipment[] }> {
    const equipment = await this.usersService.updateEquipment(user.id, body.equipment);
    return { equipment };
  }

  @Post('me/change-password')
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput
  ): Promise<{ success: boolean }> {
    return this.usersService.changePassword(user.id, body.currentPassword, body.newPassword);
  }
}
