import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  register(@Body() body: Record<string, any>) {
    return this.usersService.create(body.username, body.password);
  }

  @Post('login')
  login(@Body() body: Record<string, any>) {
    return this.authService.login(body.username, body.password);
  }
}
