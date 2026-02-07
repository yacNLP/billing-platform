import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayloadSchema } from './types/jwt-payload.schema';
import { AuthenticatedUser } from './types/authenticated-user.type';
import { Role } from './role.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret',
    });
  }

  validate(payload: unknown): AuthenticatedUser {
    const parsed = JwtPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: parsed.data.sub,
      tenantId: parsed.data.tenantId,
      role: parsed.data.role === 'ADMIN' ? Role.ADMIN : Role.USER,
    };
  }
}
