import { Test, type TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsersService } from '../users/users.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  const auth = { register: vi.fn(), login: vi.fn(), refresh: vi.fn(), logout: vi.fn() };
  const users = { findById: vi.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: UsersService, useValue: users },
      ],
    }).compile();
    controller = module.get(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates register to AuthService', () => {
    const body = { email: 'a@b.com', password: 'password123', displayName: 'Alice' };
    controller.register(body, 'jest-agent');
    expect(auth.register).toHaveBeenCalledWith(body, 'jest-agent');
  });
});
