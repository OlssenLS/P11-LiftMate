import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { EMAIL_PROVIDER } from './email/email-provider.interface.js';

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
    updatePassword: vi.fn(),
  };
  const prisma = {
    refreshToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
  const config = {
    getOrThrow: vi.fn((key: string) => `secret-${key}`),
    get: vi.fn((_key: string, fallback: string) => fallback),
  };
  const emailProvider = {
    sendPasswordResetEmail: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        { provide: EMAIL_PROVIDER, useValue: emailProvider },
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

  describe('forgotPassword', () => {
    it('returns generic message without revealing non-existent email', async () => {
      users.findByEmail.mockResolvedValue(null);
      const res = await service.forgotPassword({ email: 'ghost@example.com' });
      expect(res.message).toBe('If that email exists, a password reset link has been sent.');
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(emailProvider.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('creates hashed token in DB and sends reset link for existing user', async () => {
      users.findByEmail.mockResolvedValue(baseUser);
      prisma.passwordResetToken.create.mockResolvedValue({ id: 'pr-1' });

      const res = await service.forgotPassword({ email: 'a@b.com' });
      expect(res.message).toBe('If that email exists, a password reset link has been sent.');
      expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);

      const createArg = prisma.passwordResetToken.create.mock.calls[0][0];
      expect(createArg.data.userId).toBe('u1');
      // Token stored must be 64-character SHA-256 hex string (hashed storage requirement)
      expect(createArg.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(createArg.data.expiresAt.getTime()).toBeGreaterThan(Date.now());

      expect(emailProvider.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      const [email, link, rawToken] = emailProvider.sendPasswordResetEmail.mock.calls[0];
      expect(email).toBe('a@b.com');
      expect(link).toContain('liftmate://reset-password?token=');
      // The hash of rawToken must match the stored tokenHash
      const recomputedHash = createHash('sha256').update(rawToken).digest('hex');
      expect(createArg.data.tokenHash).toBe(recomputedHash);
    });
  });

  describe('resetPassword', () => {
    it('rejects an unknown token', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValue(null);
      await expect(
        service.resetPassword({ token: 'unknown-token', newPassword: 'new-password-123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an expired token', async () => {
      const rawToken = 'expired-token';
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      prisma.passwordResetToken.findFirst.mockResolvedValue({
        id: 'pr-1',
        userId: 'u1',
        tokenHash,
        expiresAt: new Date(Date.now() - 1000), // in the past
        usedAt: null,
      });

      await expect(
        service.resetPassword({ token: rawToken, newPassword: 'new-password-123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a token that was already used (single-use enforcement)', async () => {
      const rawToken = 'used-token';
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      prisma.passwordResetToken.findFirst.mockResolvedValue({
        id: 'pr-1',
        userId: 'u1',
        tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        usedAt: new Date(Date.now() - 5000), // already used
      });

      await expect(
        service.resetPassword({ token: rawToken, newPassword: 'new-password-123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('successfully resets password, marks token used, and revokes sessions', async () => {
      const rawToken = 'valid-token';
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      prisma.passwordResetToken.findFirst.mockResolvedValue({
        id: 'pr-1',
        userId: 'u1',
        tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        usedAt: null,
      });
      users.updatePassword.mockResolvedValue(baseUser);
      prisma.passwordResetToken.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const res = await service.resetPassword({
        token: rawToken,
        newPassword: 'new-password-123',
      });

      expect(res.message).toContain('Password has been successfully reset');
      expect(users.updatePassword).toHaveBeenCalledWith('u1', 'new-password-123');
      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'pr-1' },
        data: { usedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
