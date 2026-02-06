import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './types/jwt-payload.type';
import { AuthenticatedUser } from './types/authenticated-user.type';

// JWT secret (env in prod, fallback in dev)
const jwtSecret: string =
  process.env.JWT_SECRET && process.env.JWT_SECRET.length > 0
    ? process.env.JWT_SECRET
    : 'dev-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
    });
  }

  // Validate is called automatically by Passport
  // The returned object becomes req.user
  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
    };
  }
}
