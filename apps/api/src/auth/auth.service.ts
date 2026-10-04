import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type {
  AuthResponse,
  AuthTokens,
  LoginInput,
  RegisterInput,
} from '@liftmate/shared';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService, toPublicUser } from '../users/users.service.js';

const REFRESH_SALT_ROUNDS = 10;
const REFRESH_TTL_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(input: RegisterInput, deviceInfo?: string): Promise<AuthResponse> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const user = await this.users.create(input.email, input.password, input.displayName);
    const tokens = await this.issueTokens(user, deviceInfo);
    return { user: toPublicUser(user), tokens };
  }

  async login(input: LoginInput, deviceInfo?: string): Promise<AuthResponse> {
    const user = await this.users.findByEmail(input.email);
    if (!user || !(await this.users.verifyPassword(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = await this.issueTokens(user, deviceInfo);
    return { user: toPublicUser(user), tokens };
  }

  async refresh(
    userId: string,
    jti: string,
    presentedToken: string,
    deviceInfo?: string,
  ): Promise<AuthTokens> {
    const record = await this.prisma.refreshToken.findFirst({
      where: { id: jti, userId, revokedAt: null },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const matches = await bcrypt.compare(presentedToken, record.tokenHash);
    if (!matches) {
      // Token reuse or tampering: revoke all sessions for safety.
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.issueTokens(user, deviceInfo);
  }

  async logout(userId: string, jti: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id: jti, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(user: User, deviceInfo?: string): Promise<AuthTokens> {
    const jti = randomUUID();
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, type: 'access' },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m') as unknown as number,
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti, type: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_REFRESH_TTL',
          `${REFRESH_TTL_DAYS}d`,
        ) as unknown as number,
      },
    );
    const tokenHash = await bcrypt.hash(refreshToken, REFRESH_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { id: jti, userId: user.id, tokenHash, deviceInfo: deviceInfo ?? null, expiresAt },
    });
    return { accessToken, refreshToken };
  }
}
