import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

import { PrismaService } from '../prisma.service';

// JWT secret used to sign and verify tokens
// Uses env variable in prod, fallback for dev
const jwtSecret: string =
  process.env.JWT_SECRET && process.env.JWT_SECRET.length > 0
    ? process.env.JWT_SECRET
    : 'dev-secret';

@Module({
  imports: [
    // Register Passport with JWT as default strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Configure JWT module (signing + expiration)
    JwtModule.register({
      secret: jwtSecret,
      signOptions: {
        expiresIn: '1h',
      },
    }),
  ],

  // Handles /auth routes (login)
  controllers: [AuthController],

  // Auth logic and JWT validation
  providers: [AuthService, JwtStrategy, PrismaService],

  // Expose auth modules to other parts of the app
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
