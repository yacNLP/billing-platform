import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailModule } from '../email/email.module';
import { JwtStrategy } from './jwt.strategy';
import { authThrottleSkipIf } from './auth-throttle.config';
import { getJwtSecret } from './jwt-secret';

@Module({
  imports: [
    // Register Passport with JWT as default strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
        skipIf: authThrottleSkipIf,
      },
    ]),

    // Configure JWT module (signing + expiration)
    EmailModule,

    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: {
        expiresIn: '1h',
      },
    }),
  ],

  // Handles /auth routes (login)
  controllers: [AuthController],

  // Auth logic and JWT validation
  providers: [AuthService, JwtStrategy],

  // Expose auth modules to other parts of the app
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
