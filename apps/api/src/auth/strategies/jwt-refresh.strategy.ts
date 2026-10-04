import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { RefreshTokenPayload } from '@liftmate/shared';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface RefreshContext {
  userId: string;
  jti: string;
  refreshToken: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: RefreshTokenPayload): RefreshContext {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }
    const body = req.body as { refreshToken?: string };
    const refreshToken = body?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    return { userId: payload.sub, jti: payload.jti, refreshToken };
  }
}
