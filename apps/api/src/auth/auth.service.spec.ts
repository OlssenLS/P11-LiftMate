import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

const baseUser = {
  id: 'u1',
  email: 'a@b.com',
  passwordHash: 'hash',
  displayName: 'Alice',
  dateOfBirth: null,
  weightUnit: 'kg',
  timezone: 'UTC',
  onboardedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('AuthService', () => {
  let service: AuthService;

  const users = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    verifyPassword: vi.fn(),
  };
  const prisma = {
    refreshToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  const config = {
    getOrThrow: vi.fn((key: string) => `secret-${key}`),
    get: vi.fn((_key: string, fallback: string) => fallback),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        JwtService,
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('rejects registration for an existing email', async () => {
    users.findByEmail.mockResolvedValue(baseUser);
    await expect(
      service.register({ email: 'a@b.com', password: 'password123', displayName: 'Alice' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('registers a new user and returns tokens', async () => {
    users.findByEmail.mockResolvedValue(null);
    users.create.mockResolvedValue(baseUser);
    const res = await service.register({
      email: 'a@b.com',
      password: 'password123',
      displayName: 'Alice',
    });
    expect(res.user.email).toBe('a@b.com');
    expect(res.tokens.accessToken).toBeTruthy();
    expect(res.tokens.refreshToken).toBeTruthy();
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('rejects login with invalid credentials', async () => {
    users.findByEmail.mockResolvedValue(baseUser);
    users.verifyPassword.mockResolvedValue(false);
    await expect(
      service.login({ email: 'a@b.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rotates the refresh token: revokes the old record and issues a new one', async () => {
    users.findById.mockResolvedValue(baseUser);
    const presented = 'presented-refresh-token';
    const tokenHash = await bcrypt.hash(presented, 10);
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'jti-1',
      userId: 'u1',
      tokenHash,
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: null,
    });

    const tokens = await service.refresh('u1', 'jti-1', presented);

    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'jti-1' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    expect(tokens.refreshToken).toBeTruthy();
  });

  it('revokes all sessions when a non-matching refresh token is presented (reuse detection)', async () => {
    const tokenHash = await bcrypt.hash('the-real-token', 10);
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'jti-1',
      userId: 'u1',
      tokenHash,
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: null,
    });
    await expect(service.refresh('u1', 'jti-1', 'tampered-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('logout revokes the matching refresh token', async () => {
    await service.logout('u1', 'jti-1');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'jti-1', userId: 'u1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
